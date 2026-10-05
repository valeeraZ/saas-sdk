"use client";
import { useEffect, useState, type ReactNode } from "react";
import { SaasShell } from "./saas-shell.tsx";
import { SaasPresentationControls } from "./presentation-controls.tsx";
import { getSaasShellMessages } from "./messages.ts";
import type { SaasNavigationItem } from "./navigation.ts";
import { DEFAULT_SAAS_PREFERENCES, type SaasPresentation } from "@saas-platform/theme";
import { Alert, AlertDescription } from "@saas-platform/ui/components/alert";
import { Button } from "@saas-platform/ui/components/button";
import {loadSaasNavigation,type SaasAccessibleApp} from "./accessible-apps.ts";
export {loadSaasNavigation,type SaasAccessibleApp} from "./accessible-apps.ts";
export function SaasPlatformShell({children,user,currentAppId='portal',currentAppLabel, presentation,initialApps=[],authenticated=true}:{children:ReactNode;user:{displayName:string;email:string};currentAppId?:string;currentAppLabel:string;presentation:SaasPresentation;initialApps?:readonly SaasAccessibleApp[];authenticated?:boolean}){
  const [apps,setApps]=useState(initialApps),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  const messages=getSaasShellMessages(presentation.locale);
  useEffect(()=>{
    if(!authenticated)return;
    let controller:AbortController|undefined;
    const refresh=()=>{
      controller?.abort();
      const request=new AbortController();controller=request;
      void loadSaasNavigation(request.signal).then(next=>{
        if(!request.signal.aborted){setApps(next);setFailed(false);}
      }).catch(()=>{if(!request.signal.aborted){setApps([]);setFailed(true);}});
    };
    refresh();
    window.addEventListener('focus',refresh);
    return()=>{controller?.abort();window.removeEventListener('focus',refresh);};
  },[authenticated,retry]);
  const navigation:SaasNavigationItem[]=[{appName:null,href:'/',label:messages.applications,description:messages.unified,kind:'home',section:'platform'},...apps.map(app=>({appName:app.id,href:'/apps'+app.suffix+'/',label:app.name,description:app.description,kind:'app' as const,section:'apps' as const}))];
  return <SaasShell canAccessAdmin={false} currentAppName={currentAppId} currentAppLabel={currentAppLabel} homeHref='/' navigation={navigation} user={{displayName:user.displayName,secondaryLabel:user.email}} preferencesMode='local' initialPreferences={{...DEFAULT_SAAS_PREFERENCES,theme:presentation.theme,sidebarCollapsed:presentation.sidebarCollapsed}} messages={messages} headerActions={<SaasPresentationControls locale={presentation.locale}/>}>{failed?<Alert variant='destructive'><AlertDescription>{messages.navigationUnavailable}<Button variant='outline' onClick={()=>setRetry(x=>x+1)}>{messages.retry}</Button></AlertDescription></Alert>:null}{children}</SaasShell>;
}
