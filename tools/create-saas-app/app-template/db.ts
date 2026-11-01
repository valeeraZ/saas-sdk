import { Pool } from "pg";
export const db = new Pool({
  connectionString: process.env.SAAS_APP_DATABASE_URL,
});
