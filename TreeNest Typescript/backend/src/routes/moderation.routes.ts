import { Router } from "express";
import {
  getVideosForModeration,
  moderateVideo,
  deleteVideoHistory,
} from "../controllers/moderation.controller.js";

export const moderationRouter = Router();

moderationRouter.get("/videos", getVideosForModeration);
moderationRouter.post("/videos/moderate", moderateVideo);
moderationRouter.post("/videos/delete", deleteVideoHistory);
