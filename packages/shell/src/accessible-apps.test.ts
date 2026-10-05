import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSaasNavigation} from './accessible-apps.ts';
const id=(n:number)=>'00000000-0000-4000-8000-'+n.toString().padStart(12,'0');
const item=(n:number)=>({id:id(n),name:'App '+n,description:'',suffix:'/app-'+n});
test('navigation reads every page, including empty filtered pages, with same-origin session',async()=>{
 const original=globalThis.fetch;let calls=0;
 const pages=[{items:Array.from({length:50},(_,i)=>item(i+1)),nextCursor:id(50)},{items:[],nextCursor:id(100)},{items:[item(101)],nextCursor:null}];
 globalThis.fetch=async (url,init)=>{assert.equal(init?.credentials,'same-origin');assert.equal(init?.cache,'no-store');assert.equal(String(url),'/api/navigation'+(calls?'?cursor='+id(calls*50):''));return Response.json(pages[calls++]);};
 try{assert.equal((await loadSaasNavigation()).length,51);assert.equal(calls,3);}finally{globalThis.fetch=original;}
});
test('navigation rejects malformed entries, cycles and rejected sessions',async()=>{
 const original=globalThis.fetch;
 try{
  for(const value of [{items:[{...item(1),suffix:'//evil.test'}],nextCursor:null},{items:[{...item(1),id:'bad'}],nextCursor:null},{items:[],nextCursor:'bad'},{items:[],nextCursor:id(1)}]){
   globalThis.fetch=async()=>Response.json(value);await assert.rejects(loadSaasNavigation());
  }
  globalThis.fetch=async()=>new Response('',{status:401});await assert.rejects(loadSaasNavigation());
 }finally{globalThis.fetch=original;}
});
