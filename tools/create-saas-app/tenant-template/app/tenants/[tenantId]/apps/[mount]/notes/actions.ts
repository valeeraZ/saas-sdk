"use server";
import { redirect } from "next/navigation";
import { getSaasTenant } from "@saas-platform/sdk/tenant-next";
import { tenantHref } from "@saas-platform/sdk/tenant";
import { db } from "../../../../../../db";
export async function saveNote(form: FormData) {
  const context = await getSaasTenant();
  if (!context.roles.includes("viewer")) throw new Error("Not authorized");
  const body = form.get("body");
  if (typeof body !== "string" || !body.trim() || body.length > 200)
    throw new Error("Invalid note");
  await db.query(
    "INSERT INTO sdk_notes(app_id,tenant_id,body) VALUES($1,$2,$3)",
    [context.appId, context.tenantId, body],
  );
  redirect(tenantHref(context, "/notes?saved=1"));
}
