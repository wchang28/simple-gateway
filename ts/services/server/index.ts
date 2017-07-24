import * as express from 'express';
import * as core from 'express-serve-static-core';
import {IRequestData, get as getRequestData, JSONEndware} from "../../request-data";
import {Server} from "../../state-machine";

let router = express.Router();
export {router as Router};

function getSetApiServerMiddleware(getApiServerFromRequestData: (rqd: IRequestData) => Server) : express.RequestHandler {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let rqd = getRequestData(req);
        let apiServer = getApiServerFromRequestData(rqd);
        if (apiServer) {
            rqd.set<Server>("ApiServer", apiServer) // set the api server to rqd
            next();
        } else
            res.status(404).json({error: "not-found", error_description: "api server not found"});
    };
}

let serverRouter = express.Router();

router.use("/curr", getSetApiServerMiddleware((rqd: IRequestData) => rqd.StateMachine.CurrentServer), serverRouter);
router.use("/new", getSetApiServerMiddleware((rqd: IRequestData) => rqd.StateMachine.NewServer), serverRouter);
router.use("/old", getSetApiServerMiddleware((rqd: IRequestData) => rqd.StateMachine.OldServer), serverRouter);

serverRouter.get("/", JSONEndware<Server>((rqd: IRequestData) => Promise.resolve<Server>(rqd.get<Server>("APIServer"))));