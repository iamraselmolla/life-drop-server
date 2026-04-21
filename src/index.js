import express from "express";
import cors from "cors";
import pool from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post("/api/register", async (req, res) => {
  const { name, email, blood_group, last_donation, phone, location, diseases } =
    req.body;

  try {
    const newUser = await pool.query(
      "INSERT INTO users (name, email, blood_group, last_donation, phone, location, diseases) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [name, email, blood_group, last_donation, phone, location, diseases],
    );
    res.json(newUser.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// 2. Get All Donors
app.get("/api/donors", async (req, res) => {
  try {
    const allDonors = await pool.query(
      "SELECT * FROM users ORDER BY created_at DESC",
    );
    res.json(allDonors.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server has started on port ${PORT}`);
});
