import { Router } from "express";
import { getSystemMetrics } from "../controllers/stats.controller.js";

export const statsRouter = Router();

statsRouter.get("/metrics", getSystemMetrics);
