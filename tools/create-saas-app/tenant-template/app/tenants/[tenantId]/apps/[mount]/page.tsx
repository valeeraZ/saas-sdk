import { Suspense } from "react";
import { getSaasTenant } from "@saas-platform/sdk/tenant-next";
import { SaasTenantLink } from "@saas-platform/sdk/tenant-react";
import { tenantImageUrl, tenantHref } from "@saas-platform/sdk/tenant";
async function Streaming() {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return <p>流式内容已加载</p>;
}
export default async function Page() {
  const context = await getSaasTenant();
  return (
    <>
      <h1>__APP_TITLE__</h1>
      <p>租户：{context.tenantId}</p>
      <nav>
        <SaasTenantLink href="/notes">记录页面</SaasTenantLink>
        <a href="/">返回 Portal</a>
      </nav>
      <img
        alt="公共资源"
        width="32"
        height="32"
        src={tenantHref(context, "/public/pixel.png")}
      />
      <img
        alt="优化图片"
        width="64"
        height="64"
        src={tenantImageUrl(context, "/public/pixel.png", 64)}
      />
      <Suspense fallback={<p>加载流式内容…</p>}>
        <Streaming />
      </Suspense>
    </>
  );
}
