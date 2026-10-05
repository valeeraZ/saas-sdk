import { headers } from "next/headers.js";
import { readSaasVerifiedContext } from "./app-server.ts";
export async function getSaasApp() {
  const value = (await headers()).get("x-saas-verified-context");
  if (!value)
    throw new Error("Use the verified SDK server entry for application requests");
  return readSaasVerifiedContext(value);
}
