import pg from "pg";
import { databaseUrl } from "./config.js";

export const pool = new pg.Pool({
  connectionString: databaseUrl()
});
