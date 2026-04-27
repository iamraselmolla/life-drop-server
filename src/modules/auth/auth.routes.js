import express from "express";
import AuthController from "./auth.controller.js";
const router = express.Router();

router.post("/register", AuthController.registerUser);

export default AuthRouter;
