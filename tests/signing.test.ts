import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { describe,it,expect,vi,afterEach } from 'vitest';
import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { parseTransaction,buildPayment, FIXTURE_RECIPIENT, DEVNET_GENESIS } from '../src/engine';
import { authorizeAndBroadcast } from '../src/signing';
import type { Simulation } from '../src/rpc';
const kp=Keypair.generate(); // Ephemeral, in-memory test key; never used on-chain.
const a=parseTransaction(buildPayment(kp.publicKey.toBase58(),FIXTURE_RECIPIENT.toBase58(),FIXTURE_RECIPIENT.toBase58()));
function sim():Simulation{return {transaction:a.base64,slot:1,err:null,logs:[],units:150,fee:5000,deltas:[],atomic:false,at:Date.now(),replacement:true,innerCount:0,raw:{}}}
const sign=vi.fn(async(tx:VersionedTransaction)=>{tx.sign([kp]);return tx});
function mockRpc(genesis=DEVNET_GENESIS,valid=true){const methods:string[]=[];vi.stubGlobal('fetch',vi.fn(async(_url:any,init:any)=>{const b=JSON.parse(init.body);methods.push(b.method);return new Response(JSON.stringify({jsonrpc:'2.0',id:b.id,result:b.method==='getGenesisHash'?genesis:b.method==='isBlockhashValid'?{value:valid}:bs58.encode(VersionedTransaction.deserialize(Buffer.from(b.params[0],'base64')).signatures[0])}),{status:200})}));return methods}
const wallet={publicKey:kp.publicKey,signTransaction:sign};
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();sign.mockClear()});
describe('authorization and message binding',()=>{
 it('requires explicit confirmation before any wallet or network request',async()=>{const methods=mockRpc();await expect(authorizeAndBroadcast({analysis:a,simulation:sim(),wallet,fixture:false,confirmed:false})).rejects.toThrow();expect(methods).toEqual([]);expect(sign).not.toHaveBeenCalled()});
 it('rejects stale simulation',async()=>{mockRpc();await expect(authorizeAndBroadcast({analysis:a,simulation:{...sim(),at:Date.now()-61000},wallet,fixture:false,confirmed:true})).rejects.toThrow(/60 seconds/)});
 it('rejects a simulation bound to different transaction bytes',async()=>{mockRpc();await expect(authorizeAndBroadcast({analysis:a,simulation:{...sim(),transaction:'different-bytes'},wallet,fixture:false,confirmed:true})).rejects.toThrow()});
 it('rejects failed simulation',async()=>{mockRpc();await expect(authorizeAndBroadcast({analysis:a,simulation:{...sim(),err:'AccountNotFound'},wallet,fixture:false,confirmed:true})).rejects.toThrow()});
 it('rejects an unknown fee',async()=>{mockRpc();await expect(authorizeAndBroadcast({analysis:a,simulation:{...sim(),fee:null},wallet,fixture:false,confirmed:true})).rejects.toThrow()});
 it('blocks a mismatched cluster before a wallet request',async()=>{mockRpc('mainnet-genesis');await expect(authorizeAndBroadcast({analysis:a,simulation:sim(),wallet,fixture:false,confirmed:true})).rejects.toThrow(/Cluster/);expect(sign).not.toHaveBeenCalled()});
 it('never silently replaces an expired original blockhash',async()=>{mockRpc(DEVNET_GENESIS,false);await expect(authorizeAndBroadcast({analysis:a,simulation:sim(),wallet,fixture:false,confirmed:true})).rejects.toThrow(/expired/);expect(sign).not.toHaveBeenCalled()});
 it('does not broadcast a wallet-mutated message',async()=>{const methods=mockRpc();const mutated={...wallet,signTransaction:async(tx:VersionedTransaction)=>{tx.message.recentBlockhash=kp.publicKey.toBase58();tx.sign([kp]);return tx}};await expect(authorizeAndBroadcast({analysis:a,simulation:sim(),wallet:mutated,fixture:false,confirmed:true})).rejects.toThrow(/changed the transaction/);expect(methods).not.toContain('sendTransaction')});
 it('does not broadcast when the source changed during the wallet prompt',async()=>{const methods=mockRpc();let current=true;const w={...wallet,signTransaction:async(tx:VersionedTransaction)=>{current=false;return sign(tx)}};await expect(authorizeAndBroadcast({analysis:a,simulation:sim(),wallet:w,fixture:false,confirmed:true,isCurrent:()=>current})).rejects.toThrow(/request changed/);expect(methods).not.toContain('sendTransaction')});
 it('does not broadcast after wallet rejection',async()=>{const methods=mockRpc();const w={...wallet,signTransaction:async()=>{throw new Error('User rejected')}};await expect(authorizeAndBroadcast({analysis:a,simulation:sim(),wallet:w,fixture:false,confirmed:true})).rejects.toThrow(/rejected/);expect(methods).not.toContain('sendTransaction')});
 it('broadcasts exactly the reviewed signed message with preflight enabled',async()=>{const methods=mockRpc();expect(await authorizeAndBroadcast({analysis:a,simulation:sim(),wallet,fixture:false,confirmed:true})).toMatch(/^[1-9A-HJ-NP-Za-km-z]{80,90}$/);expect(methods).toEqual(['getGenesisHash','isBlockhashValid','sendTransaction']);const calls=(fetch as any).mock.calls;const send=JSON.parse(calls[2][1].body);expect(send.params[1].skipPreflight).toBe(false);expect(send.params[0]).toBeDefined()});
 it('exposes the locally derived signature even when broadcasting times out',async()=>{const attempt=vi.fn();vi.stubGlobal('fetch',vi.fn(async(_url:any,init:any)=>{const b=JSON.parse(init.body);if(b.method==='sendTransaction')throw new Error('Network timeout');return new Response(JSON.stringify({result:b.method==='getGenesisHash'?DEVNET_GENESIS:{value:true}}))}));await expect(authorizeAndBroadcast({analysis:a,simulation:sim(),wallet,fixture:false,confirmed:true,onBroadcastAttempt:attempt})).rejects.toThrow(/Broadcast status is unknown/);expect(attempt).toHaveBeenCalledWith(expect.stringMatching(/^[1-9A-HJ-NP-Za-km-z]{80,90}$/))});

});
