import { Buffer } from 'buffer';
import { VersionedTransaction } from '@solana/web3.js';
import { DEVNET_GENESIS, type Analysis, expectedDeltas } from './engine';
let id=0;
function exactInteger(n:unknown):bigint {if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0)throw new Error('RPC returned a balance outside exact JavaScript integer range. Numeric comparison is unavailable rather than rounded.');return BigInt(n);}
export async function rpc<T=any>(method:string,params:unknown[]=[]):Promise<T>{
 const res=await fetch('/api/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params}),signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw new Error(`Devnet RPC unavailable (HTTP ${res.status}). Decoding still works offline; retry later.`);
 const data=await res.json();if(data.error)throw new Error(String(data.error.message??'RPC error').slice(0,240));return data.result as T;
}
export async function assertDevnet(){if(await rpc('getGenesisHash')!==DEVNET_GENESIS)throw new Error('Cluster identity mismatch. All network actions are blocked.');}
export type Simulation={transaction:string;slot:number;err:unknown;logs:string[];units:number|null;fee:number|null;deltas:{address:string;lamports:string}[];atomic:boolean;at:number;replacement:boolean;innerCount:number;raw:unknown};
export async function simulate(a:Analysis):Promise<Simulation>{
 await assertDevnet();
 const addresses=a.accounts.map(k=>k.address);
 const before=await rpc('getMultipleAccounts',[addresses,{encoding:'base64',dataSlice:{offset:0,length:0},commitment:'confirmed'}]);
 const result=await rpc('simulateTransaction',[a.base64,{encoding:'base64',commitment:'confirmed',sigVerify:false,replaceRecentBlockhash:true,innerInstructions:true,accounts:{encoding:'base64',addresses},minContextSlot:before.context.slot}]);
 const v=result.value;
 let fee:number|null=v.fee??null;
 if(fee===null){try{const f=await rpc('getFeeForMessage',[Buffer.from(a.tx.message.serialize()).toString('base64'),{commitment:'confirmed'}]);fee=f.value}catch{/* optional fee missing stays unknown */}}
 const atomic=Array.isArray(v.preBalances)&&v.preBalances.length===addresses.length&&Array.isArray(v.postBalances)&&v.postBalances.length===addresses.length;
 const deltas=v.err?[]:addresses.flatMap((address,i)=>{const pre=atomic?v.preBalances[i]:(before.value[i]?.lamports??0);const post=atomic?v.postBalances[i]:(v.accounts?.[i]?.lamports??0);if(!atomic && !v.accounts)return [];const delta=exactInteger(post)-exactInteger(pre);return delta? [{address,lamports:delta.toString()}]:[]});
 return {transaction:a.base64,slot:result.context.slot,err:v.err,logs:v.logs??[],units:v.unitsConsumed??null,fee,deltas,atomic,at:Date.now(),replacement:true,innerCount:(v.innerInstructions??[]).reduce((n:number,g:any)=>n+g.instructions.length,0),raw:result};
}
export type Receipt={signature:string;slot:number;fee:number;matched:boolean;messageMatch:boolean;rows:{address:string;expected:string;actual:string;match:boolean}[];raw:unknown};
export async function readReceipt(signature:string,a:Analysis,previewFee:number):Promise<Receipt>{
 const result=await rpc('getTransaction',[signature,{encoding:'json',commitment:'confirmed',maxSupportedTransactionVersion:0}]);
 if(!result?.meta)throw new Error('Confirmation data is not indexed yet. Retry receipt lookup; do not send again.');
 if(result.meta.err)throw new Error(`On-chain execution failed: ${JSON.stringify(result.meta.err)}. A network fee may still have been charged.`);
 // Never trust a receipt for a different message, even if an external wallet returned an unexpected signature.
 const keys=result.transaction.message.accountKeys as string[];
 const expected=expectedDeltas(a,previewFee);
 const rows=a.accounts.map(k=>{const i=keys.indexOf(k.address);if(i<0)throw new Error('Receipt account list differs from preview.');const actual=(exactInteger(result.meta.postBalances[i])-exactInteger(result.meta.preBalances[i])).toString();const wanted=(expected.get(k.address)??0n).toString();return {address:k.address,expected:wanted,actual,match:actual===wanted}});
 
 const original=Buffer.from(a.tx.message.serialize()).toString('base64');
 const encoded=await rpc('getTransaction',[signature,{encoding:'base64',commitment:'confirmed',maxSupportedTransactionVersion:0}]);
 
 const chain=VersionedTransaction.deserialize(Buffer.from(encoded.transaction[0],'base64'));
 const same=Buffer.from(chain.message.serialize()).toString('base64')===original;
 return {signature,slot:result.slot,fee:result.meta.fee,messageMatch:same,matched:same&&rows.every(r=>r.match)&&result.meta.fee===previewFee,rows,raw:result};
}
