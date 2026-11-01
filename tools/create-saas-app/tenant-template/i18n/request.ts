import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { getSaasTenant } from "@saas-platform/sdk/tenant-next";
import { createSaasPresentation } from "@saas-platform/theme";
export default getRequestConfig(async () => {
  const h = await headers();
  const context = h.has("x-saas-verified-context")
    ? await getSaasTenant()
    : null;
  const { locale } = createSaasPresentation(context?.presentation);
  return {
    locale,
    timeZone: "UTC",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
