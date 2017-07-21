import {IWebServerConfig} from 'express-web-server';
import {SpawnParams} from "./server-mgr";

// application configuration interface
export interface IAppConfig {
    adminServerConfig: IWebServerConfig;
    proxyServerConfig: IWebServerConfig;
    availableApiServerPorts: [number, number];
    spawnParamsFile: string;
}