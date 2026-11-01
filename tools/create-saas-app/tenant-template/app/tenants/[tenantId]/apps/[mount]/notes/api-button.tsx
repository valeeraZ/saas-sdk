"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSaasTenant } from "@saas-platform/sdk/tenant-react";
import { tenantFetch } from "@saas-platform/sdk/tenant";
import { Button } from "@saas-platform/ui/components/button";
export default function ApiButton() {
  const context = useSaasTenant(),
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
            const response = await tenantFetch(context, "/api/notes");
            setResult(
              response.ok
                ? t("apiTenant", { id: (await response.json()).tenantId })
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
