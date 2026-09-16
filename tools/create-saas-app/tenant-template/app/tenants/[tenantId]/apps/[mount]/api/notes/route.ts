import { getSaasTenant } from "@saas-platform/sdk/tenant-next";
import { db } from "../../../../../../../db";
export async function GET() {
  const context = await getSaasTenant();
  if (!context.roles.includes("viewer"))
    return Response.json({ error: "denied" }, { status: 403 });
  const notes = await db.query(
    "SELECT body FROM sdk_notes WHERE app_id=$1 AND tenant_id=$2 ORDER BY id",
    [context.appId, context.tenantId],
  );
  return Response.json(
    { tenantId: context.tenantId, notes: notes.rows },
    { headers: { "cache-control": "no-store" } },
  );
}
