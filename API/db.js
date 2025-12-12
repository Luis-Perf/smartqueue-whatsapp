import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "app",
  password: "app",
  database: "smartqueue",
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY,
      channel TEXT,
      from_phone TEXT,
      text TEXT,
      status TEXT,
      priority TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}
