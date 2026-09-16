import { headers } from "next/headers.js";
import { readSaasVerifiedContext } from "./tenant-server.ts";
export async function getSaasTenant() {
  const value = (await headers()).get("x-saas-verified-context");
  if (!value)
    throw new Error("Use the verified SDK server entry for tenant requests");
  return readSaasVerifiedContext(value);
}
