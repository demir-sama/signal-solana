import { it,expect } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { parseTransaction,fixture,buildPayment,FIXTURE_RECIPIENT,DEVNET_GENESIS } from '../src/engine';
const endpoint='https://api.devnet.solana.com';
async function request(method:string,params:any[]=[]){const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});if(!res.ok)throw new Error(`HTTP ${res.status}`);const d=await res.json();if(d.error)throw new Error(d.error.message);return d.result}
it.skipIf(process.env.RUN_DEVNET!=='1')('live devnet: verifies identity, reports fixture failure and simulates an unsigned real transfer without broadcasting',async()=>{
 expect(await request('getGenesisHash')).toBe(DEVNET_GENESIS);
 const failed=await request('simulateTransaction',[fixture('payment'),{encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed'}]);
 expect(failed.value.err).not.toBeNull();
 // A public block supplies a funded public fee-payer address for unsigned simulation only.
 // No private key, signature, faucet request or sendTransaction is used by this test.
 const slot=await request('getSlot',[{commitment:'confirmed'}]);
 let block:any;
 for(let n=0;n<4;n++){try{block=await request('getBlock',[slot-n,{commitment:'confirmed',encoding:'json',maxSupportedTransactionVersion:1,rewards:false,transactionDetails:'accounts'}]);if(block?.transactions?.length)break}catch{/* skipped slots are normal */}}
 expect(block?.transactions?.length).toBeGreaterThan(0);
 let payer:string|undefined;
 for(const t of block.transactions.slice(0,8)){const k=t.transaction.accountKeys[0];const address=typeof k==='string'?k:k.pubkey;const balance=await request('getBalance',[address,{commitment:'confirmed'}]);if(balance.value>2000000&&Number.isSafeInteger(balance.value)){payer=address;break}}
 expect(payer).toBeTruthy();
 const latest=await request('getLatestBlockhash',[{commitment:'confirmed'}]);
 const a=parseTransaction(buildPayment(payer!,FIXTURE_RECIPIENT.toBase58(),latest.value.blockhash));
 const result=await request('simulateTransaction',[a.base64,{encoding:'base64',sigVerify:false,replaceRecentBlockhash:true,commitment:'confirmed',accounts:{addresses:a.accounts.map(k=>k.address),encoding:'base64'}}]);
 expect(result.value.err).toBeNull();
 expect(result.value.unitsConsumed).toBeGreaterThan(0);
 await writeFile('docs/devnet-smoke.json',JSON.stringify({verifiedAt:new Date().toISOString(),network:'devnet',method:'read-only unsigned simulation; no broadcast',fixtureFailure:failed.value.err,successfulSimulation:{slot:result.context.slot,units:result.value.unitsConsumed,err:result.value.err,logs:result.value.logs},limitations:'Not a wallet/signature/confirmed-receipt test. A public funded account was used for unsigned simulation only.'},null,2));
},120000);
