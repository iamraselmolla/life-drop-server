import sendResponse from "../../utils/sendResponse.js";
import AuthServices from "./auth.services.js";

const registerUser = async (req, res, next) => {
  try {
    const result = await AuthServices.registerUser(req.body)();
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const AuthControllers = {
  registerUser,
};

export default AuthControllers;
