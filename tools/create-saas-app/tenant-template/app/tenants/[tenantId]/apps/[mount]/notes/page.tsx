import { getSaasTenant } from "@saas-platform/sdk/tenant-next";
import { SaasTenantLink } from "@saas-platform/sdk/tenant-react";
import { saveNote } from "./actions";
import { db } from "../../../../../../db";
import ApiButton from "./api-button";
import { getTranslations } from "next-intl/server";
import { SaasPageHeader } from "@saas-platform/shell/page-header";
import { Button } from "@saas-platform/ui/components/button";
import { Input } from "@saas-platform/ui/components/input";
import { Field, FieldLabel } from "@saas-platform/ui/components/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@saas-platform/ui/components/card";
export default async function Notes() {
  const context = await getSaasTenant();
  if (!context.roles.includes("viewer")) throw new Error("Not authorized");
  const t = await getTranslations("App");
  const notes = await db.query(
    "SELECT body FROM sdk_notes WHERE app_id=$1 AND tenant_id=$2 ORDER BY id",
    [context.appId, context.tenantId],
  );
  return (
    <div className="flex flex-col gap-8">
      <SaasPageHeader
        title={t("notes")}
        description={t("tenant", { id: context.tenantId })}
        actions={
          <Button asChild variant="outline">
            <SaasTenantLink href="/">{t("home")}</SaasTenantLink>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("noteBody")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <form action={saveNote} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="body">{t("noteBody")}</FieldLabel>
              <Input id="body" name="body" maxLength={200} required />
            </Field>
            <Button type="submit">{t("save")}</Button>
          </form>
          <ApiButton />
          <ul className="flex flex-col gap-2">
            {notes.rows.map((note, index) => (
              <li className="rounded-md border p-3" key={index}>
                {note.body}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
