import { SaasPageHeader } from "@saas-platform/shell/page-header";
import { Badge } from "@saas-platform/ui/components/badge";
import { Button } from "@saas-platform/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@saas-platform/ui/components/card";
import { ArrowLeftIcon, ArrowRightIcon, CheckCircle2Icon, FlaskConicalIcon } from "lucide-react";

type SpikePageProps = Readonly<{
  appName: string;
  basePath: string;
  topology: string;
}>;

export function SpikePage({ appName, basePath, topology }: SpikePageProps) {
  return (
    <div className="flex flex-col gap-10">
      <SaasPageHeader
        actions={<Badge variant="secondary">{topology}</Badge>}
        breadcrumbs={[{ href: "/", label: "SAAS" }, { label: appName }]}
        description={`Rendered by an independent Next.js zone at ${basePath}. The public URL and query string are preserved through the Portal rewrite.`}
        eyebrow="Independent application"
        status="Connected"
        title={appName}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FlaskConicalIcon /> Protocol checks</CardTitle>
            <CardDescription>Exercise the contracts that keep this Zone independent.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={`${basePath}/deep?source=saas-shell`}>
                Test deep link <ArrowRightIcon data-icon="inline-end" />
              </a>
            </Button>
            <form action={verifyServerAction}>
              <Button type="submit" variant="outline">Test Server Action</Button>
            </form>
            <Button asChild variant="ghost">
              <a href="/"><ArrowLeftIcon data-icon="inline-start" /> Back to Portal</a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2Icon /> Shell contract</CardTitle>
            <CardDescription>Versioned Shell, semantic theme, normal cross-Zone anchors.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Base path</dt><dd className="font-mono">{basePath}</dd>
              <dt className="text-muted-foreground">Navigation</dt><dd>Full document</dd>
              <dt className="text-muted-foreground">Theme</dt><dd>Shared tokens</dd>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { verifyServerAction } from "./actions.ts";
