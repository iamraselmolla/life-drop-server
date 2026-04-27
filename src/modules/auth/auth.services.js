import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../../db/pool.js";
import http from "http-status";

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

const registerUser = (data) => async () => {
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

  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `INSERT INTO users (email, phone, password)
       VALUES ($1, $2, $3)
       RETURNING id, email, phone, created_at`,
      [email.toLowerCase().trim(), phone.trim(), password_hash],
    );
    const user = userResult.rows[0];

    const profileResult = await client.query(
      `INSERT INTO profiles (user_id, name, age, division, disease)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, age, division`,
      [user.id, name.trim(), age, division?.trim() || null, null],
    );
    const profile = profileResult.rows[0];

    const medicalResult = await client.query(
      `INSERT INTO donor_medical (
         profile_id,
         blood_group,
         weight,
         last_donation,
         is_smoker,
         hepatitis_b,
         hepatitis_c,
         hiv,
         is_diabetic,
         heart_disease,
         malaria
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING
         id,
         blood_group,
         weight,
         last_donation,
         is_smoker,
         hepatitis_b,
         hepatitis_c,
         hiv,
         is_diabetic,
         heart_disease,
         malaria`,
      [
        profile.id,
        blood_group,
        weight_kg,
        last_donated_at || null,
        is_smoker,
        has_hepatitis_b,
        has_hepatitis_c,
        has_hiv,
        has_diabetes,
        has_heart_disease,
        has_malaria_recent,
      ],
    );
    const medical = medicalResult.rows[0];

    await client.query("COMMIT");

    const token = signToken({
      userId: user.id,
      profileId: profile.id,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        created_at: user.created_at,
        profile: {
          id: profile.id,
          name: profile.name,
          age: profile.age,
          district,
          division: profile.division,
          medical: {
            id: medical.id,
            blood_group: medical.blood_group,
            weight: medical.weight,
            last_donation: medical.last_donation,
            flags: {
              is_smoker: medical.is_smoker,
              hepatitis_b: medical.hepatitis_b,
              hepatitis_c: medical.hepatitis_c,
              hiv: medical.hiv,
              is_diabetic: medical.is_diabetic,
              heart_disease: medical.heart_disease,
              malaria: medical.malaria,
            },
          },
        },
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.code === "23505") {
      if (err.constraint?.includes("email")) {
        throw {
          status: http.CONFLICT,
          message: "An account with this email already exists.",
        };
      }
      if (err.constraint?.includes("phone")) {
        throw {
          status: http.CONFLICT,
          message: "An account with this phone number already exists.",
        };
      }
    }

    throw {
      status: http.SERVICE_UNAVAILABLE,
      message: "Registration failed. Please try again.",
      detail: err.message,
    };
  } finally {
    client.release();
  }
};

const AuthServices = {
  registerUser,
};

export default AuthServices;
