import * as events from "events";
import {ServerId} from "./types";
import * as http from "http";
import * as url from "url";
import * as net from "net";

export interface IServerMonitor {
    monitor(InstanceId: ServerId, InstanceUrl: string) : void;
    on(event: "pooling", listener: (InstanceId: ServerId, InstanceUrl: string) => void) : this;
    on(event: "instance-not-ready", listener: (InstanceId: ServerId) => void) : this;
    on(event: "instance-ready", listener: (InstanceId: ServerId) => void) : this;
}

class ServerMonitor extends events.EventEmitter implements IServerMonitor {
    private _InstanceId: ServerId;
    private _InstanceUrl: string;
    private _timer: NodeJS.Timer;
    constructor() {
        super();
        this._InstanceId = null;
        this._InstanceUrl = null;
        this._timer = null;
    }
    private pollingServerReadyness() : Promise<boolean> {
        return new Promise<boolean>((resolve: (value: boolean) => void, reject: (err: any) => void) => {
            this.emit('pooling', this._InstanceId, this._InstanceUrl);
            let parsed = url.parse(this._InstanceUrl);
            let req = http.request({method: "GET", hostname: parsed.hostname, port: parsed.port, pathname: '/'}, (res: http.IncomingMessage) => {
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                });
                res.on('end', () => {
                    resolve(true);
                });
            });
            req.on("socket", (socket: net.Socket) => {
                socket.setTimeout(1000);
                socket.on("timeout", () => {
                    req.abort();
                    resolve(false);
                })
            }).on('error', (err: Error) => {
                reject(err);
            });
            req.end();
        });
    }
    private get TimerFunction() : () => void {
        let func = () => {
            this._timer = null;
            this.pollingServerReadyness()
            .then((ready: boolean) => {
                if (!ready) {
                    this.emit('instance-not-ready', this._InstanceId);
                    this._timer = setTimeout(this.TimerFunction, 1000);
                } else
                    this.emit('instance-ready', this._InstanceId);
            }).catch((err: any) => {
                this._timer = setTimeout(this.TimerFunction, 1000);
            });
        };
        return func.bind(this);
    }
    monitor(InstanceId: ServerId, InstanceUrl: string) : void {
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        this._InstanceId = InstanceId;
        this._InstanceUrl = InstanceUrl;
        let func = this.TimerFunction;
        func();
    }
}

export function get() : IServerMonitor {return new ServerMonitor();}