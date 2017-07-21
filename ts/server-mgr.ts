import * as events from "events";
import * as sm from "./state-machine";
import {generate} from "shortid";
import * as cp from "child_process"; 
import * as path from 'path';
import {ServerId} from "./types";
import * as kill from "tree-kill";

export interface SpawnParams {
    command: string;
    args?: string[];
    env?: {[key: string]: string};
}

export interface ISpawnParamsSrc {
    get() : Promise<SpawnParams>;
}

export interface IServerMonitor {
    monitor(InstanceId: ServerId, InstanceUrl: string) : void;
    on(event: "instance-ready", listener: (InstanceId: ServerId) => void) : this;
}

export interface IServerManager {
    launchNewInstance() : Promise<sm.ServerInstance>;
    terminateInstance(InstanceId: ServerId, pid: number) : void;
    on(event: "instance-launching", listener: (InstanceId: ServerId, InstanceUrl: string) => void) : this;
    on(event: "instance-launched", listener: (InstanceId: ServerId) => void) : this;
    on(event: "instance-terminating", listener: (InstanceId: ServerId, pid: number) => void): this;
    on(event: "instance-terminated", listener: (InstanceId: ServerId) => void): this;
}

interface PortItem {
    Port: number;
    InstanceId: ServerId;
}

class ServerManager extends events.EventEmitter implements IServerManager {
    private _ports: [PortItem, PortItem];
    constructor(availablePorts: [number, number], private spawnParamsSrc: ISpawnParamsSrc, private serverMonitor: IServerMonitor) {
        super();
        this._ports = [{Port:availablePorts[0], InstanceId: null}, {Port:availablePorts[1], InstanceId: null}];
        this.serverMonitor.on("instance-ready", (InstanceId: ServerId) => {
            this.emit("instance-launched", InstanceId);
        });
    }
    private useAvailablePort(InstanceId: ServerId) : number {
        let index = (!this._ports[0].InstanceId ? 0 : 1);
        this._ports[index].InstanceId = InstanceId;
        return this._ports[index].Port;
    }
    private launchNewApiServerInstance(InstanceId: ServerId, Port: number) : Promise<number> {
        return this.spawnParamsSrc.get().then((spawnParams: SpawnParams) => {
            let args: string[] = (spawnParams.args ? spawnParams.args : []);
            let env:{[key: string]: string} = {};
            if (spawnParams.env) {
                for (let key in spawnParams.env)
                    env[key] = spawnParams.env[key];
            }
            env["PORT"] = Port.toString();  // add listen port to the environmental variables
            let childProcess = cp.spawn(spawnParams.command, args, {env});
            return childProcess.pid;
        });
    }
    launchNewInstance() : Promise<sm.ServerInstance> {
        let InstanceId = generate();
        let Port = this.useAvailablePort(InstanceId);
        let InstanceUrl = "http://127.0.0.1:" + Port.toString();
        this.emit("instance-launching", InstanceId, InstanceUrl);
        this.serverMonitor.monitor(InstanceId, InstanceUrl);
        return this.launchNewApiServerInstance(InstanceId, Port).then((pid: number) => {
            let ServerInstnace: sm.ServerInstance = {Id: InstanceId, InstanceUrl, pid};
            return ServerInstnace;
        });  
    }
    terminateInstance(InstanceId: string, pid: number) : void {
        this.emit("instance-terminating", InstanceId, pid)
        kill(pid, 'SIGKILL', (err: any) => {
            for (let i in this._ports) {
                if (this._ports[i].InstanceId === InstanceId) {
                    this._ports[i].InstanceId = null;
                    break;
                }
            }
            this.emit("instance-terminated", InstanceId);
        });
    }
}

export function get(availablePorts: [number, number], spawnParamsSrc: ISpawnParamsSrc, serverMonitor: IServerMonitor) : IServerManager {return new ServerManager(availablePorts, spawnParamsSrc, serverMonitor);}