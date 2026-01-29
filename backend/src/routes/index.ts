import { Router } from "express";
import { healthRouter } from "./health";
import { usersRouter } from "./users";
import { agentRouter } from "./agent";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(usersRouter);
apiRouter.use(agentRouter);

apiRouter.get("/", (_req, res) => {
  res.json({ ok: true, message: "API online" });
});
