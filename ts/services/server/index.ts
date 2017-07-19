import * as express from 'express';
import * as core from 'express-serve-static-core';
import {RequestData} from "../../request-data";
import {Server} from "../../state-machine";

let router = express.Router();
export {router as Router};

function getSetApiServerMiddleware(getApiServerFromRequestData: (rqd: RequestData) => Server) : express.RequestHandler {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let rqd = new RequestData(req);
        let apiServer = getApiServerFromRequestData(rqd);
        if (apiServer) {
            rqd.APIServer = apiServer;  // set the api server to rqd
            next();
        } else
            res.status(404).json({error: "not-found", error_description: "api server not found"});
    };
}

let serverRouter = express.Router();

router.use("/curr", getSetApiServerMiddleware((rqd: RequestData) => rqd.StateMachine.CurrentServer), serverRouter);
router.use("/new", getSetApiServerMiddleware((rqd: RequestData) => rqd.StateMachine.NewServer), serverRouter);
router.use("/old", getSetApiServerMiddleware((rqd: RequestData) => rqd.StateMachine.OldServer), serverRouter);

serverRouter.get("/", RequestData.Endware<Server>((rqd: RequestData) => Promise.resolve<Server>(rqd.APIServer)));