/**
 * auth.service.js
 *
 * All database work for authentication lives here.
 * Controllers stay thin — they just call these functions.
 *
 * REGISTRATION FLOW (single atomic transaction):
 *   1. Hash password
 *   2. INSERT → users          (email, phone, password_hash)
 *   3. INSERT → profiles       (name, age, district, division, user_id)
 *   4. INSERT → donor_medical  (blood_group, weight, flags…, profile_id)
 *   5. COMMIT  — or ROLLBACK if anything fails
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../../db/pool.js";

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "30d";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/** Strip password_hash before sending user data to client */
function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────

export async function registerUser(data) {
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

  // ── 1. Hash password BEFORE opening DB transaction (CPU-bound, keep outside tx)
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

  // ── 2. Open transaction — ALL inserts succeed or ALL roll back
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const findExisting = await client.query(
      `SELECT id FROM users WHERE email = $1 OR phone = $2 LIMIT 1`,
      [email.toLowerCase().trim(), phone.trim()],
    );

    if (findExisting.rows[0]) {
      throw {
        status: 409,
        message: "An account with this email or phone number already exists.",
      };
    }

    // ── Step A: Create user account ──────────────────────────────────────────
    const userResult = await client.query(
      `INSERT INTO users (email, phone, password)
       VALUES ($1, $2, $3)
       RETURNING id, email, phone, created_at`,
      [email.toLowerCase().trim(), phone.trim(), password_hash],
    );
    const user = userResult.rows[0];

    // ── Step B: Create profile ───────────────────────────────────────────────
    const profileResult = await client.query(
      `INSERT INTO profiles (user_id, name, age, division, disease)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, age, division`,
      [
        user.id,
        name.trim(),
        age,
        division?.trim() || null,
        null, // disease — not collected at registration
      ],
    );
    const profile = profileResult.rows[0];

    // ── Step C: Create donor medical record ──────────────────────────────────
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

    // ── Commit — all three inserts succeeded ─────────────────────────────────
    await client.query("COMMIT");

    // ── 3. Issue JWT ─────────────────────────────────────────────────────────
    const token = signToken({
      userId: user.id,
      profileId: profile.id,
      email: user.email,
      phone: user.phone,
      blood_group: medical.blood_group,
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
          district, // kept from input (not in profiles table yet — add column if needed)
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

    // Detect duplicate email or phone (Postgres unique violation = code 23505)
    if (err.code === "23505") {
      if (err.constraint?.includes("email")) {
        throw {
          status: 409,
          message: "An account with this email already exists.",
        };
      }
      if (err.constraint?.includes("phone")) {
        throw {
          status: 409,
          message: "An account with this phone number already exists.",
        };
      }
    }

    // Re-throw everything else as a 500
    throw {
      status: 500,
      message: "Registration failed. Please try again.",
      detail: err.message,
    };
  } finally {
    client.release(); // always return connection to pool
  }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

export async function loginUser({ email, password }) {
  // Fetch user + profile + medical in one JOIN query
  const result = await pool.query(
    `SELECT
       u.id          AS user_id,
       u.email,
       u.phone,
       u.password,
       u.created_at,
       p.id          AS profile_id,
       p.name,
       p.age,
       p.division,
       p.avatar_url,
       dm.blood_group,
       dm.weight,
       dm.last_donation,
       dm.is_smoker,
       dm.hepatitis_b,
       dm.hepatitis_c,
       dm.hiv,
       dm.is_diabetic,
       dm.heart_disease,
       dm.malaria
     FROM users u
     LEFT JOIN profiles     p  ON p.user_id    = u.id
     LEFT JOIN donor_medical dm ON dm.profile_id = p.id
     WHERE u.email = $1
     LIMIT 1`,
    [email.toLowerCase().trim()],
  );

  const row = result.rows[0];
  if (!row) {
    throw { status: 401, message: "Invalid email or password." };
  }

  const valid = await bcrypt.compare(password, row.password);
  if (!valid) {
    throw { status: 401, message: "Invalid email or password." };
  }

  const token = signToken({
    userId: row.user_id,
    profileId: row.profile_id,
    email: row.email,
  });

  return {
    token,
    user: {
      id: row.user_id,
      email: row.email,
      phone: row.phone,
      profile: {
        id: row.profile_id,
        name: row.name,
        age: row.age,
        division: row.division,
        avatar_url: row.avatar_url,
        medical: {
          blood_group: row.blood_group,
          weight: row.weight,
          last_donation: row.last_donation,
          flags: {
            is_smoker: row.is_smoker,
            hepatitis_b: row.hepatitis_b,
            hepatitis_c: row.hepatitis_c,
            hiv: row.hiv,
            is_diabetic: row.is_diabetic,
            heart_disease: row.heart_disease,
            malaria: row.malaria,
          },
        },
      },
    },
  };
}

// ─── GET MY PROFILE ───────────────────────────────────────────────────────────

export async function getMyProfile(userId) {
  const result = await pool.query(
    `SELECT
       u.id, u.email, u.phone, u.created_at,
       p.id AS profile_id, p.name, p.age, p.division, p.disease, p.avatar_url,
       dm.blood_group, dm.weight, dm.last_donation,
       dm.is_smoker, dm.hepatitis_b, dm.hepatitis_c,
       dm.hiv, dm.is_diabetic, dm.heart_disease, dm.malaria
     FROM users u
     LEFT JOIN profiles      p  ON p.user_id    = u.id
     LEFT JOIN donor_medical dm ON dm.profile_id = p.id
     WHERE u.id = $1`,
    [userId],
  );

  if (!result.rows[0]) throw { status: 404, message: "User not found." };
  return result.rows[0];
}
