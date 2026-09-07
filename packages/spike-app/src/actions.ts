"use server";

import { redirect } from "next/navigation";

export async function verifyServerAction(): Promise<never> {
  redirect("/deep?serverAction=passed");
}
