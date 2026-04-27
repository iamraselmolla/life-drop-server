import AuthRouter from "../modules/auth/auth.routes.js";

const routerArr = [
  {
    path: "/auth",
    router: AuthRouter,
  },
];
routerArr.forEach(({ path, router }) => {
  router.use(path, router);
});

export default routerArr;
