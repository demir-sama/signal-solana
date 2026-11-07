import { describe,it,expect,vi,afterEach } from 'vitest';
import { Buffer } from 'buffer';
import { parseTransaction,fixture,DEVNET_GENESIS } from '../src/engine';
import { simulate,readReceipt,rpc } from '../src/rpc';
const a=parseTransaction(fixture('payment'));
function mockRpc(results:Record<string,any>){const calls:string[]=[];vi.stubGlobal('fetch',vi.fn(async(_url:any,init:any)=>{const body=JSON.parse(init.body);calls.push(body.method);return new Response(JSON.stringify({jsonrpc:'2.0',id:body.id,result:typeof results[body.method]==='function'?results[body.method](body.params):results[body.method]}),{status:200})}));return calls}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()});
function results(v:any){return {getGenesisHash:DEVNET_GENESIS,getMultipleAccounts:{context:{slot:100},value:[{lamports:2000000},null,{lamports:1}]},simulateTransaction:{context:{slot:101},value:v},getFeeForMessage:{value:5000}}}
describe('simulation evidence',()=>{
 it('uses actual RPC atomic deltas where available and skips signature verification explicitly',async()=>{mockRpc(results({err:null,preBalances:[2000000,0,1],postBalances:[995000,1000000,1],fee:5000,unitsConsumed:150,logs:['program output'],innerInstructions:[]}));const s=await simulate(a);expect(s.atomic).toBe(true);expect(s.deltas.map(d=>d.lamports)).toEqual(['-1005000','1000000']);const call=(fetch as any).mock.calls.map((c:any)=>JSON.parse(c[1].body)).find((c:any)=>c.method==='simulateTransaction');expect(call.params[1]).toMatchObject({sigVerify:false,replaceRecentBlockhash:true,minContextSlot:100})});
 it('labels separate pre-snapshot deltas as non-atomic',async()=>{mockRpc(results({err:null,accounts:[{lamports:995000},{lamports:1000000},{lamports:1}],logs:[]}));const s=await simulate(a);expect(s.atomic).toBe(false);expect(s.fee).toBe(5000);expect(s.deltas[0].lamports).toBe('-1005000')});
 it('does not show failed simulation deltas as execution',async()=>{mockRpc(results({err:'AccountNotFound',accounts:[null,null,null],logs:[]}));const s=await simulate(a);expect(s.err).toBe('AccountNotFound');expect(s.deltas).toEqual([])});
 it('retains a missing fee as unknown, not zero',async()=>{mockRpc({...results({err:null,accounts:[],logs:[]}),getFeeForMessage:{value:null}});expect((await simulate(a)).fee).toBeNull()});
 it('refuses unsafe integer balance comparisons rather than rounding',async()=>{mockRpc(results({err:null,preBalances:[Number.MAX_SAFE_INTEGER+1,0,1],postBalances:[0,0,1],logs:[]}));await expect(simulate(a)).rejects.toThrow(/exact JavaScript integer/)});
 it('retains RPC failures honestly',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response('rate limited',{status:429})));await expect(rpc('getGenesisHash')).rejects.toThrow(/429/)});
});
describe('confirmed receipt comparator',()=>{
 function tx(fee=5000,credit=1000000){return {slot:555,transaction:{message:{accountKeys:a.accounts.map(k=>k.address)}},meta:{err:null,fee,preBalances:[2000000,0,1],postBalances:[995000,credit,1]}}}
 it('matches account deltas, exact on-chain message and fee',async()=>{mockRpc({getTransaction:(p:any)=>p[1].encoding==='base64'?{transaction:[a.base64,'base64']}:tx()});const r=await readReceipt('public-signature',a,5000);expect(r.matched).toBe(true);expect(r.rows.every(r=>r.match)).toBe(true)});
 it('reports mismatched deltas without claiming preview matched',async()=>{mockRpc({getTransaction:(p:any)=>p[1].encoding==='base64'?{transaction:[a.base64,'base64']}:tx(5000,999999)});expect((await readReceipt('public-signature',a,5000)).matched).toBe(false)});
 it('reports fee differences',async()=>{mockRpc({getTransaction:(p:any)=>p[1].encoding==='base64'?{transaction:[a.base64,'base64']}:tx(6000)});expect((await readReceipt('public-signature',a,5000)).matched).toBe(false)});
 it('handles not-yet-indexed receipts without re-sending',async()=>{const calls=mockRpc({getTransaction:null});await expect(readReceipt('public-signature',a,5000)).rejects.toThrow(/not indexed/);expect(calls).toEqual(['getTransaction'])});
 it('does not call failed on-chain execution a success',async()=>{mockRpc({getTransaction:{...tx(),meta:{err:{InstructionError:[0,'failure']}}}});await expect(readReceipt('public-signature',a,5000)).rejects.toThrow(/execution failed/)});
});
