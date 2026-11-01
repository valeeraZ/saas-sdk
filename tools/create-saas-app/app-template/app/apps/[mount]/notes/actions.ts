"use server";
import { redirect } from "next/navigation";
import { getSaasApp } from "@saas-platform/sdk/app-next";
import { appHref } from "@saas-platform/sdk/app";
import { db } from "../../../../db";
export async function saveNote(form: FormData) {
  const context = await getSaasApp();
  if (!context.roles.includes("viewer")) throw new Error("Not authorized");
  const body = form.get("body");
  if (typeof body !== "string" || !body.trim() || body.length > 200)
    throw new Error("Invalid note");
  await db.query(
    "INSERT INTO sdk_notes(app_id,user_id,body) VALUES($1,$2,$3)",
    [context.appId, context.userId, body],
  );
  redirect(appHref(context, "/notes?saved=1"));
}
