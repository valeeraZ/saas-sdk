import "@saas-platform/ui/globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { headers } from "next/headers";
import { getSaasApp } from "@saas-platform/sdk/app-next";
import { createSaasPresentation } from "@saas-platform/theme";
export const metadata = { title: "__APP_TITLE__" };
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const context = h.has("x-saas-verified-context")
    ? await getSaasApp()
    : null;
  const presentation = createSaasPresentation(context?.presentation);
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html
      lang={locale}
      className={presentation.theme === "dark" ? "dark" : undefined}
      data-theme={presentation.theme}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
