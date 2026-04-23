import pool from "./pool.js";

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query(`BEGIN`);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `);

    // PROFILE
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE NOT NULL rEFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      age INTEGER cHECK (age >= 16 AND age <= 100),
      disease VARCHAR(255),
      division VARCHAR(255),
      avatar_url VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
      )
      `);

    // DONOR MEDICAL
    await client.query(`
      CREATE TABLE IF NOT EXISTS donor_medical (
      id SERIAL PRIMARY KEY,
      profile_id INTEGER UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      blood_group VARCHAR(3) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
      weight NUMERIC(5,1) ,
      last_donation DATE,
      is_smoker BOOLEAN DEFAULT FALSE,
      hepatitis_b BOOLEAN DEFAULT FALSE,
      hepatitis_c BOOLEAN DEFAULT FALSE,
      hiv BOOLEAN DEFAULT FALSE,
      is_diabetic BOOLEAN DEFAULT FALSE,
      heart_disease BOOLEAN DEFAULT FALSE,
      malaria BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // CAMPAIGNS
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id             SERIAL PRIMARY KEY,
        title          VARCHAR(200) NOT NULL,
        category       VARCHAR(50) CHECK (category IN ('Emergency','Oncology','Infrastructure','General')),
        description    TEXT,
        goal_amount    INTEGER NOT NULL CHECK (goal_amount > 0),
        raised_amount  INTEGER DEFAULT 0,
        donor_count    INTEGER DEFAULT 0,
        days_left      INTEGER,
        is_urgent      BOOLEAN DEFAULT FALSE,
        icon           VARCHAR(10),
        color_hex      VARCHAR(7) DEFAULT '#C62828',
        created_by     INTEGER REFERENCES users(id),
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // ── 5. DONATIONS ──────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id           SERIAL PRIMARY KEY,
        campaign_id  INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        profile_id   INTEGER NOT NULL REFERENCES profiles(id),
        amount       INTEGER NOT NULL CHECK (amount > 0),
        donated_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`COMMIT`);
    console.log("Migration completed successfully.");
  } catch (err) {
    await client.query(`ROLLBACK`);
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
};

migrate();
