import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { getSaasApp } from "@saas-platform/sdk/app-next";
import { createSaasPresentation } from "@saas-platform/theme";
export default getRequestConfig(async () => {
  const h = await headers();
  const context = h.has("x-saas-verified-context")
    ? await getSaasApp()
    : null;
  const { locale } = createSaasPresentation(context?.presentation);
  return {
    locale,
    timeZone: "UTC",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
