// route /services
import * as express from 'express';
import * as core from 'express-serve-static-core';
import {IRequestData, JSONEndware} from "../request-data";
import {StateMachineJSON, State} from "../state-machine";
import {SpawnParams} from "../server-mgr";
import {Router as serverRouter} from "./server";

let router = express.Router();
export {router as Router};

router.get("/", JSONEndware<StateMachineJSON>((rqd: IRequestData) => Promise.resolve<StateMachineJSON>(rqd.StateMachine.toJSON())));
router.get("/state", JSONEndware<State>((rqd: IRequestData) => Promise.resolve<State>(rqd.StateMachine.State)));
router.get("/deploy", JSONEndware<any>((rqd: IRequestData) => rqd.StateMachine.deploy()));
router.get("/reload", JSONEndware<any>((rqd: IRequestData) => rqd.StateMachine.deploy()));
router.get("/spawn-params", JSONEndware<SpawnParams>((rqd: IRequestData) => rqd.SpawnParamsStore.load()));
router.use("/server", serverRouter);