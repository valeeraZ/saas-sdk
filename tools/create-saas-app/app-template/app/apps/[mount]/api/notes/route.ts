import { getSaasApp } from "@saas-platform/sdk/app-next";
import { db } from "../../../../../db";
export async function GET() {
  const context = await getSaasApp();
  if (!context.roles.includes("viewer"))
    return Response.json({ error: "denied" }, { status: 403 });
  const notes = await db.query(
    "SELECT body FROM sdk_notes WHERE app_id=$1 AND user_id=$2 ORDER BY id",
    [context.appId, context.userId],
  );
  return Response.json(
    { userId: context.userId, notes: notes.rows },
    { headers: { "cache-control": "no-store" } },
  );
}
