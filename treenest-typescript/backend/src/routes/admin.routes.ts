import { Router } from "express";
import {
  getAllUsers,
  suspendUser,
  unsuspendUser,
  deleteUser,
} from "../controllers/admin.controller.js";

export const adminRouter = Router();

adminRouter.get("/users", getAllUsers);
adminRouter.post("/users/suspend", suspendUser);
adminRouter.post("/users/unsuspend", unsuspendUser);
adminRouter.post("/users/delete", deleteUser);
