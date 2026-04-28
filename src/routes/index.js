import express from "express";
import AuthRouter from "../modules/auth/auth.routes.js";

const router = express.Router();

// register routes
const routes = [
  {
    path: "/auth",
    route: AuthRouter,
  },
];

routes.forEach(({ path, route }) => {
  router.use(path, route);
});

export default router;
