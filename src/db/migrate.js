import pool from "./pool.js";

const migrate = async () => {
  const client = await pool.connect();
  try {
  } catch (err) {
    await client.query(`ROLLBACK`);
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
};
