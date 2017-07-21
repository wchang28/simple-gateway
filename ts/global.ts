import {IStateMachine} from "./state-machine";
import {ISettingsStore} from "./settings-store";
import {SpawnParams} from "./server-mgr";

export interface IGlobal {
    stateMachine: IStateMachine;
    spawnParamsStore: ISettingsStore<SpawnParams>;
}