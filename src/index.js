import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: 200,
    success: true,
    message: "Welcome to the LifeDrop API",
  });
});
app.use("/api/v1", router);

app.use((req, res) => {
  res.status(404).json({
    status: 404,
    success: false,
    message: "Endpoint not found",
  });
});
app.listen(PORT, () => {
  console.log(`Server has started on port ${PORT}`);
});
