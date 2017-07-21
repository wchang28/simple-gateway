import * as express from 'express';
import {IWebServerConfig, startServer} from 'express-web-server';
import * as bodyParser from "body-parser";
import noCache = require('no-cache-express');
import * as prettyPrinter from 'express-pretty-print';
import * as fs from 'fs';
import * as path from 'path';
import {IAppConfig} from './app-config';
import * as events from "events";
import * as srvMgr from "./server-mgr";
import * as sm from "./state-machine";
import {get as getServerMonitor} from "./server-monitor";
import {IGlobal} from "./global";
import {Router as servicesRouter} from "./services";
import * as proxy from "express-http-proxy";
import {ServerId} from "./types";

let configFile: string = null;

if (process.argv.length < 3)
    configFile = path.join(__dirname, "../configs/local-testing-config.json");
else
    configFile = process.argv[2];

let config: IAppConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));

class SpawnParamsSrc implements srvMgr.ISpawnParamsSrc {
    constructor(private filePath: string) {}
    get() : Promise<srvMgr.SpawnParams> {
        try {
            let spawnParams: srvMgr.SpawnParams = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            return Promise.resolve<srvMgr.SpawnParams>(spawnParams);
        } catch(e) {
            return Promise.reject({error: "internal-server-error", error_description: "error loading file " + this.filePath + ": " + e.toString()});
        }
    }
}

let monitor = getServerMonitor();
let serverManager = srvMgr.get(config.availableApiServerPorts, new SpawnParamsSrc(config.spawnParamsFile), monitor);
let stateMachine = sm.get(serverManager);

monitor.on("pooling", (InstanceId: ServerId, InstanceUrl: string) => {
    console.log(new Date().toISOString() + ": <<POOLING>> new server instance " + InstanceId + " for readyness on " + InstanceUrl + "...");
}).on("instance-not-ready", (InstanceId: ServerId) => {
    console.log(new Date().toISOString() + ": <<NOT-READY>> new server instance " + InstanceId + " is still not ready");
});

serverManager.on("instance-launching", (InstanceId: ServerId, InstanceUrl: string) => {
    console.log(new Date().toISOString() + ": <<LAUNCHING>> launching new server instance " + InstanceId + " on " + InstanceUrl + "...");
}).on("instance-launched", (InstanceId: ServerId) => {
    console.log(new Date().toISOString() + ": <<LAUNCHED>> new server instance " + InstanceId + " is now READY :-)");
}).on("instance-terminating", (InstanceId: ServerId, pid: number) => {
    console.log(new Date().toISOString() + ": <<TERMINATING>> killing old server instance " + InstanceId + " with pid=" + pid.toString() + "...");
}).on("instance-terminated", (InstanceId: ServerId) => {
    console.log(new Date().toISOString() + ": <<TERMINATED>> old server instance " + InstanceId + " is terminated :-)");
});

stateMachine.on("ready", () => {    // api server is ready => get the proxy ready
    console.log(new Date().toISOString() + ': state machine reports a <ready> state. starting the proxy server...');
    let appProxy = express();
    let requestCounterTrackingMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let InstanceId = stateMachine.CurrentServer.Id;
        stateMachine.incrementRequestCounterByInstanceId(InstanceId);
        res.on("finish", () => {
            stateMachine.decrementRequestCounterByInstanceId(InstanceId);
        }).on("close", () => {
            stateMachine.decrementRequestCounterByInstanceId(InstanceId);
        });
        next();
    };
    let targetAcquisition = (req: express.Request) => Promise.resolve<proxy.TargetSettings>({targetUrl: stateMachine.TargetInstanceUrl});
    appProxy.use("/", requestCounterTrackingMiddleware, proxy.get({targetAcquisition}));

    startServer(config.proxyServerConfig, appProxy, (secure:boolean, host:string, port:number) => {
        let protocol = (secure ? 'https' : 'http');
        console.log(new Date().toISOString() + ': gateway <PROXY> server listening at %s://%s:%s', protocol, host, port);
    }, (err:any) => {
        console.error(new Date().toISOString() + ': !!! gateway <PROXY> server error: ' + JSON.stringify(err));
        process.exit(1);
    });
}).on("state-change", (state: sm.State) => {
    console.log(new Date().toISOString() + ": <<state-change>> state=" + state);
}).on("error", (err: any) => {
    console.error(new Date().toISOString() + ': !!! Error: ' + JSON.stringify(err));
});

let appAdmin = express();
appAdmin.set('jsonp callback name', 'cb');
appAdmin.use(noCache);
appAdmin.use(bodyParser.json({"limit":"999mb"}));
appAdmin.use(prettyPrinter.get());

let g: IGlobal = {
    stateMachine
};

appAdmin.set("global", g);

appAdmin.use("/services", servicesRouter);

startServer(config.adminServerConfig, appAdmin, (secure:boolean, host:string, port:number) => {
    let protocol = (secure ? 'https' : 'http');
    console.log(new Date().toISOString() + ': gateway <ADMIN> server listening at %s://%s:%s', protocol, host, port);
    stateMachine.initialize();
}, (err:any) => {
    console.error(new Date().toISOString() + ': !!! gateway <ADMIN> server error: ' + JSON.stringify(err));
    process.exit(1);
});