import * as express from 'express';
import {IGlobal} from "./global";
import * as http from "http";
import {IStateMachine, Server} from "./state-machine";
import {ISettingsStore} from "./settings-store";
import {SpawnParams} from "./server-mgr";

interface RequestInfo {
    apiServer?: Server;
}

export type EndwareHandler<T> = (rqd: RequestData) => Promise<T>;

export class RequestData {
    constructor(public req: express.Request) {
        if (!req["request_info"]) req["request_info"] = {};
    }
    private get RequestInfo() : RequestInfo {return this.req["request_info"];}
    get Global(): IGlobal {return this.req.app.get("global");}
    get Headers() : http.IncomingMessageHeaders {return this.req.headers;}
    get Params() : any {return this.req.params;}
    get Body() : any {return this.req.body;}
    static Endware<T>(handler: EndwareHandler<T>) : express.RequestHandler {
        return (req: express.Request, res: express.Response) => {
            handler(new RequestData(req))
            .then((value: T) => {
                res.jsonp(value);
            }).catch((err: any) => {
                res.status(err.code ? err.code : 400).json(err);
            });
        };
    }
    
    get StateMachine() : IStateMachine {return this.Global.stateMachine;}
    get SpawnParamsStore(): ISettingsStore<SpawnParams> {return this.Global.spawnParamsStore;}

    get APIServer(): Server {return this.RequestInfo.apiServer;}
    set APIServer(value: Server) {this.RequestInfo.apiServer = value;}
} 