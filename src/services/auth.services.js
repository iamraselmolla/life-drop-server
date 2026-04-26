import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db/pool.js";
import sendResponse from "../utils/sendResponse.js";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET
  ? process.env.JWT_SECRET
  : "iamraselmollasecretjwttoken";

const JWT_EXPIRES_IN = "365d";

const jwtSign = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const jwtVerify = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const safeUser = (user) => {
  const { password, ...safeData } = user;
  return safeData;
};

const registerUser = async (data) => {
  const {
    // Account
    email,
    phone,
    password,
    // Personal
    name,
    age,
    district,
    division,
    // Medical profile
    blood_group,
    weight_kg,
    last_donated_at,
    // Medical flags
    is_smoker = false,
    has_hepatitis_b = false,
    has_hepatitis_c = false,
    has_hiv = false,
    has_diabetes = false,
    has_heart_disease = false,
    has_malaria_recent = false,
  } = data;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const client = await pool.connect();
  try {
    await client.query(`BEGIN`);
    const userResult = await client.query(
      ` INSERT INTO users (email, phone, password) VALUES ($1, $2, $3) RETURNING id, email, phone, created_at`,
      [email, phone, hashedPassword],
    );
  } catch (error) {
    sendResponse(res, 500, {
      success: false,
      message: "An error occurred while registering the user",
      data: null,
      statusCode: 500,
    });
  } finally {
    client.release();
  }
};
