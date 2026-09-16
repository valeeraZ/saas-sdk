import { getSaasTenant } from "@saas-platform/sdk/tenant-next";
import { tenantHref, publicTenantContext } from "@saas-platform/sdk/tenant";
import { SaasTenantProvider } from "@saas-platform/sdk/tenant-react";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const context = await getSaasTenant();
  return { icons: { icon: tenantHref(context, "/public/pixel.png") } };
}
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SaasTenantProvider context={publicTenantContext(await getSaasTenant())}>
      <main>{children}</main>
    </SaasTenantProvider>
  );
}
