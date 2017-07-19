// route /services
import * as express from 'express';
import * as core from 'express-serve-static-core';
import {RequestData} from "../request-data";
import {StateMachineJSON, State} from "../state-machine";
import {Router as serverRouter} from "./server";

let router = express.Router();
export {router as Router};

router.get("/", RequestData.Endware<StateMachineJSON>((rqd: RequestData) => Promise.resolve<StateMachineJSON>(rqd.StateMachine.toJSON())));
router.get("/state", RequestData.Endware<State>((rqd: RequestData) => Promise.resolve<State>(rqd.StateMachine.State)));
router.get("/deploy", RequestData.Endware<any>((rqd: RequestData) => rqd.StateMachine.deploy()));
router.get("/reload", RequestData.Endware<any>((rqd: RequestData) => rqd.StateMachine.deploy()));
router.use("/server", serverRouter);