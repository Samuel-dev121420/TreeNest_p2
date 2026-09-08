import { Router } from "express";
import { adminRouter } from "./admin.routes.js";
import { moderationRouter } from "./moderation.routes.js";
import { statsRouter } from "./stats.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "TreeNest Backend API",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

apiRouter.use("/admin", adminRouter);
apiRouter.use("/moderation", moderationRouter);
apiRouter.use("/stats", statsRouter);
