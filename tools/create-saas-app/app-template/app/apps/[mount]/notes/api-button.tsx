"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSaasApp } from "@saas-platform/sdk/app-react";
import { appFetch } from "@saas-platform/sdk/app";
import { Button } from "@saas-platform/ui/components/button";
export default function ApiButton() {
  const context = useSaasApp(),
    t = useTranslations("App"),
    [result, setResult] = useState(""),
    [pending, setPending] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const response = await appFetch(context, "/api/notes");
            setResult(
              response.ok
                ? t("apiUser", { id: (await response.json()).userId })
                : t("apiFailed"),
            );
          } catch {
            setResult(t("apiFailed"));
          } finally {
            setPending(false);
          }
        }}
      >
        {t("checkFetch")}
      </Button>
      <p role="status" className="break-all text-sm text-muted-foreground">
        {result}
      </p>
    </div>
  );
}
