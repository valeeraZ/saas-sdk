const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type SaasAccessibleApp = Readonly<{id:string;name:string;description:string;suffix:string}>;
export async function loadSaasNavigation(signal?:AbortSignal):Promise<SaasAccessibleApp[]> {
  const items=new Map<string,SaasAccessibleApp>(), cursors=new Set<string>();
  let cursor:string|null=null;
  do {
    const response:Response=await fetch('/api/navigation'+(cursor?'?cursor='+encodeURIComponent(cursor):''),{credentials:'same-origin',cache:'no-store',signal});
    if(!response.ok) throw Error('navigation_unavailable');
    const page:{items:SaasAccessibleApp[];nextCursor:string|null}=await response.json();
    if(!Array.isArray(page.items)||page.items.length>50) throw Error('invalid_navigation');
    for(const item of page.items){
      if(!item||typeof item.id!=='string'||!uuid.test(item.id)||typeof item.name!=='string'||!item.name.trim()||item.name.length>200||typeof item.description!=='string'||item.description.length>2000||typeof item.suffix!=='string'||!/^\/[a-z][a-z0-9-]{0,62}$/.test(item.suffix)) throw Error('invalid_navigation');
      items.set(item.id,{id:item.id,name:item.name,description:item.description,suffix:item.suffix});
    }
    cursor=page.nextCursor;
    if(cursor!==null&&(typeof cursor!=='string'||!uuid.test(cursor)||cursors.has(cursor))) throw Error('invalid_navigation_cursor');
    if(cursor)cursors.add(cursor);
  }while(cursor);
  return [...items.values()];
}
