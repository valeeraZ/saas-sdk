import next from "next";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { importSPKI } from "jose";
import { Pool } from "pg";
import { createSaasAppHandler } from "@saas-platform/sdk/app-server";
const db = new Pool({ connectionString: process.env.SAAS_APP_DATABASE_URL });
await db.query(
  "CREATE TABLE IF NOT EXISTS sdk_requests(jti uuid PRIMARY KEY, expires_at timestamptz NOT NULL); CREATE TABLE IF NOT EXISTS sdk_notes(app_id uuid NOT NULL, user_id uuid NOT NULL, id bigint GENERATED ALWAYS AS IDENTITY, body text NOT NULL CHECK(length(body)<=200), PRIMARY KEY(app_id,user_id,id))",
);
const app = next({
  dev: false,
  hostname: "127.0.0.1",
  port: Number(process.env.PORT),
});
await app.prepare();
const handler = createSaasAppHandler(app.getRequestHandler(), {
  mount: "__APP_NAME__",
  assetVersion: process.env.SAAS_ASSET_VERSION,
  issuer: process.env.SAAS_PORTAL_ORIGIN,
  appId: process.env.SAAS_APP_ID,
  deploymentId: process.env.SAAS_DEPLOYMENT_ID,
  key: await importSPKI(
    readFileSync(process.env.SAAS_PUBLIC_KEY_FILE, "utf8"),
    "RS256",
  ),
  claimReplay: async (id, exp) => {
    await db.query("DELETE FROM sdk_requests WHERE expires_at < now()");
    return !!(
      await db.query(
        "INSERT INTO sdk_requests(jti,expires_at) VALUES($1,to_timestamp($2)) ON CONFLICT DO NOTHING RETURNING jti",
        [id, exp],
      )
    ).rowCount;
  },
});
createServer(handler).listen(Number(process.env.PORT), "127.0.0.1", () =>
  console.log("SDK Next.js application ready"),
);
