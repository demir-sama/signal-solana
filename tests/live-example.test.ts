import {afterEach,describe,it,expect,vi} from 'vitest';
import {PublicKey,SystemProgram} from '@solana/web3.js';
import {prepareLiveExample} from '../src/live-example';
import {parseTransaction,canSign,FIXTURE_RECIPIENT,DEVNET_GENESIS} from '../src/engine';
const payer=new PublicKey(new Uint8Array(32).fill(44)).toBase58();
const second=new PublicKey(new Uint8Array(32).fill(45)).toBase58();
function mock({genesis=DEVNET_GENESIS,funded=true,failFirst=false,failAll=false,blockEmpty=false}={}){
 const calls:any[]=[];let simulations=0;
 vi.stubGlobal('fetch',vi.fn(async(_url,init:any)=>{
  const b=JSON.parse(init.body);calls.push(b);let result:any;
  if(b.method==='getGenesisHash')result=genesis;
  else if(b.method==='getSlot')result=200;
  else if(b.method==='getBlock')result={transactions:blockEmpty?[]:[payer,second].map(pubkey=>({transaction:{accountKeys:[{pubkey}]}}))};
  else if(b.method==='getMultipleAccounts')result={context:{slot:200},value:b.params[0].map((address:string)=>({owner:SystemProgram.programId.toBase58(),lamports:address===FIXTURE_RECIPIENT.toBase58()?0:funded?20000000:10,executable:false}))};
  else if(b.method==='getLatestBlockhash')result={value:{blockhash:FIXTURE_RECIPIENT.toBase58()}};
  else if(b.method==='getFeeForMessage')result={value:5000};
  else if(b.method==='simulateTransaction'){simulations++;result={context:{slot:201},value:{err:failAll||(failFirst&&simulations===1)?'AccountNotFound':null,fee:5000,unitsConsumed:150,logs:[],accounts:b.params[1].accounts.addresses.map(()=>({lamports:20000000}))}}}
  else throw new Error(`Unexpected method ${b.method}`);
  return new Response(JSON.stringify({result}));
 }));return calls;
}
afterEach(()=>vi.unstubAllGlobals());
describe('live unsigned public sample',()=>{
 it('builds genuine SDK bytes and returns only a real successful simulation without wallet or send calls',async()=>{const calls=mock();const result=await prepareLiveExample();const a=parseTransaction(result.base64);expect(a.payer).toBe(payer);expect(a.steps[0].amount).toBe('1000000');expect(result.simulation.err).toBeNull();expect(result.simulation.transaction).toBe(a.base64);expect(result.discoveredSlot).toBe(200);expect(canSign(a,payer,true)).toBeTruthy();expect(calls.every(c=>!['sendTransaction','requestAirdrop'].includes(c.method))).toBe(true);expect(calls.find(c=>c.method==='simulateTransaction').params[1]).toMatchObject({sigVerify:false,replaceRecentBlockhash:true})});
 it('tries another public candidate rather than relabeling a failed simulation successful',async()=>{mock({failFirst:true});const result=await prepareLiveExample();expect(result.publicPayer).toBe(second);expect(result.simulation.err).toBeNull()});
 it('does not fabricate success when all candidates fail',async()=>{const calls=mock({failAll:true});await expect(prepareLiveExample()).rejects.toThrow(/No successful public devnet sample/);expect(calls.filter(c=>c.method==='getBlock')).toHaveLength(4);expect(calls.filter(c=>c.method==='simulateTransaction')).toHaveLength(2)});
 it('rejects unfunded accounts without attempting simulation',async()=>{const calls=mock({funded:false});await expect(prepareLiveExample()).rejects.toThrow(/No successful/);expect(calls.some(c=>c.method==='simulateTransaction')).toBe(false)});
 it('fails closed for a mismatched cluster',async()=>{const calls=mock({genesis:'not-devnet'});await expect(prepareLiveExample()).rejects.toThrow(/Cluster/);expect(calls.map(c=>c.method)).toEqual(['getGenesisHash'])});
 it('reports empty/skipped history honestly after bounded attempts',async()=>{const calls=mock({blockEmpty:true});await expect(prepareLiveExample()).rejects.toThrow(/No successful/);expect(calls.filter(c=>c.method==='getBlock')).toHaveLength(4)});
});
