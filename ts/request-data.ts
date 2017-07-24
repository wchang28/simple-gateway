import * as express from 'express';
import {IGlobal} from "./global";
import * as http from "http";
import * as rqd from "request-data";
import {IStateMachine, Server} from "./state-machine";
import {ISettingsStore} from "./settings-store";
import {SpawnParams} from "./server-mgr";

export interface IRequestData extends rqd.IRequestData<IGlobal> {
    readonly StateMachine: IStateMachine;
    readonly SpawnParamsStore: ISettingsStore<SpawnParams>
}

class RequestData extends rqd.RequestData<IGlobal> implements IRequestData {
    constructor(req: express.Request) {super(req);}
    get StateMachine() : IStateMachine {return this.Global.stateMachine;}
    get SpawnParamsStore(): ISettingsStore<SpawnParams> {return this.Global.spawnParamsStore;}
}

export function get(req: express.Request) : IRequestData {return new RequestData(req);}

export type JSONEndwareHandler<T> = rqd.JSONEndwareHandler<IRequestData, T>;

let factory = (req: express.Request) => new RequestData(req);

export function JSONEndware<T>(handler: JSONEndwareHandler<T>) : express.RequestHandler {
    return rqd.JSONEndwareTemplete<IGlobal, IRequestData, T>(factory, handler);
}