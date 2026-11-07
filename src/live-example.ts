import { SystemProgram } from '@solana/web3.js';
import { assertDevnet, rpc, simulate, type Simulation } from './rpc';
import { buildPayment, FIXTURE_RECIPIENT, parseTransaction } from './engine';
export type LiveExample={base64:string;simulation:Simulation;publicPayer:string;discoveredSlot:number};
/** Read-only example. No wallet provider, keypair, faucet request or broadcast method is used. */
export async function prepareLiveExample():Promise<LiveExample>{
 await assertDevnet();
 const slot=await rpc<number>('getSlot',[{commitment:'confirmed'}]);
 if(!Number.isSafeInteger(slot)||slot<0)throw new Error('Devnet returned an invalid slot. No sample was assumed successful.');
 const seen=new Set<string>();let attempts=0;
 for(let offset=0;offset<4;offset++){
  let block:any;
  try{block=await rpc('getBlock',[slot-offset,{commitment:'confirmed',encoding:'json',transactionDetails:'accounts',maxSupportedTransactionVersion:1,rewards:false}])}catch{continue}
  const candidates:string[]=[];
  for(const entry of (block?.transactions??[]).slice(0,12)){
   const first=entry.transaction?.accountKeys?.[0];const address=typeof first==='string'?first:first?.pubkey;
   if(typeof address==='string'&&!seen.has(address)&&address!==FIXTURE_RECIPIENT.toBase58()){seen.add(address);candidates.push(address)}
  }
  if(!candidates.length)continue;
  const snapshot=await rpc('getMultipleAccounts',[candidates,{commitment:'confirmed',encoding:'base64',dataSlice:{offset:0,length:0}}]);
  for(let i=0;i<candidates.length&&attempts<4;i++){
   const account=snapshot.value?.[i];
   if(!account||account.owner!==SystemProgram.programId.toBase58()||account.executable||!Number.isSafeInteger(account.lamports)||account.lamports<2000000)continue;
   attempts++;
   const latest=await rpc('getLatestBlockhash',[{commitment:'confirmed'}]);
   const base64=buildPayment(candidates[i],FIXTURE_RECIPIENT.toBase58(),latest.value.blockhash);
   const simulation=await simulate(parseTransaction(base64));
   if(!simulation.err&&simulation.fee!==null)return {base64,simulation,publicPayer:candidates[i],discoveredSlot:slot-offset};
  }
  if(attempts>=4)break;
 }
 throw new Error('No successful public devnet sample was available after bounded read-only checks. Nothing was signed or sent. Retry later; offline walkthroughs still decode.');
}
