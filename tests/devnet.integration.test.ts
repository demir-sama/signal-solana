import { it,expect,vi } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { parseTransaction,fixture,canSign,DEVNET_GENESIS } from '../src/engine';
import {prepareLiveExample} from '../src/live-example';
import handler from '../api/rpc';
const endpoint='https://api.devnet.solana.com';
async function request(method:string,params:any[]=[]){const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});if(!res.ok)throw new Error(`HTTP ${res.status}`);const d=await res.json();if(d.error)throw new Error(d.error.message);return d.result}
it.skipIf(process.env.RUN_DEVNET!=='1')('live devnet: verifies the exact no-wallet feature through the production relay handler without signing or broadcast',async()=>{
 const realFetch=globalThis.fetch;const methods:string[]=[];
 vi.stubGlobal('fetch',async(input:any,init:any)=>{
  if(input!=='/api/rpc')return realFetch(input,init);
  const body=JSON.parse(init.body);methods.push(body.method);let status=200;let value:any;
  const res:any={setHeader(){},status(s:number){status=s;return res},json(v:any){value=v;return res}};
  await handler({method:init.method,body},res);
  return new Response(JSON.stringify(value),{status});
 });
 try{
  expect(await request('getGenesisHash')).toBe(DEVNET_GENESIS);
  const fixtureOutcome=await request('simulateTransaction',[fixture('payment'),{encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'}]);
  const sample=await prepareLiveExample();const a=parseTransaction(sample.base64);
  expect(sample.simulation.err).toBeNull();expect(sample.simulation.units).toBeGreaterThan(0);
  expect(sample.simulation.transaction).toBe(sample.base64);expect(a.payer).toBe(sample.publicPayer);
  expect(canSign(a,sample.publicPayer,true)).toBeTruthy();
  expect(methods.some(m=>m==='sendTransaction'||m==='requestAirdrop')).toBe(false);
  await writeFile('docs/devnet-smoke.json',JSON.stringify({verifiedAt:new Date().toISOString(),network:'devnet',method:'Actual prepareLiveExample feature through production API handler; read-only unsigned simulation, no wallet or broadcast',fixtureOutcome:fixtureOutcome.value.err,successfulSimulation:{slot:sample.simulation.slot,units:sample.simulation.units,fee:sample.simulation.fee,err:sample.simulation.err,logs:sample.simulation.logs},discoveredSlot:sample.discoveredSlot,rpcMethods:methods,limitations:'Not browser, wallet, signature, broadcast, confirmed receipt or Phantom clearance verification. Public funded fee-payer address used for unsigned simulation only.'},null,2));
 }finally{vi.unstubAllGlobals()}
},120000);
