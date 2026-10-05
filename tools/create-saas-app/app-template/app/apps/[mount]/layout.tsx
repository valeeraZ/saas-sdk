import { getSaasApp } from "@saas-platform/sdk/app-next";
import { appHref, publicAppContext } from "@saas-platform/sdk/app";
import { SaasAppProvider } from "@saas-platform/sdk/app-react";
import { SaasPlatformShell } from "@saas-platform/shell/platform-shell";
import { createSaasPresentation } from "@saas-platform/theme";
export const dynamic = "force-dynamic";
export async function generateMetadata(){const context=await getSaasApp();return {icons:{icon:appHref(context,"/public/pixel.png")}};}
export default async function Layout({children}:{children:React.ReactNode}){
 const context=await getSaasApp();
 return <SaasAppProvider context={publicAppContext(context)}><SaasPlatformShell currentAppId={context.appId} currentAppLabel="__APP_TITLE__" presentation={createSaasPresentation(context.presentation)} user={context.user}>{children}</SaasPlatformShell></SaasAppProvider>;
}
