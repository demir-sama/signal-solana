import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { canSign, type Analysis } from './engine';
import { assertDevnet, rpc, type Simulation } from './rpc';
export type SigningWallet={publicKey?:PublicKey;signTransaction:(tx:VersionedTransaction)=>Promise<VersionedTransaction>};
export async function authorizeAndBroadcast({analysis:a,simulation:sim,wallet,fixture,confirmed,isCurrent=()=>true,onBroadcastAttempt}:{analysis:Analysis;simulation:Simulation|null;wallet:SigningWallet;fixture:boolean;confirmed:boolean;isCurrent?:()=>boolean;onBroadcastAttempt?:(signature:string)=>void}):Promise<string>{
 const reason=canSign(a,wallet.publicKey?.toBase58()??null,fixture);
 const fresh=()=>!!sim&&Date.now()-sim.at>=0&&Date.now()-sim.at<=60000;
 if(!confirmed||!sim||sim.transaction!==a.base64||sim.err||sim.fee===null||reason||!fresh()||!isCurrent())throw new Error(reason??'A confirmed review and a successful simulation with a known fee less than 60 seconds old are required.');
 await assertDevnet();
 const valid=await rpc('isBlockhashValid',[a.blockhash,{commitment:'confirmed'}]);
 if(!valid.value)throw new Error('The preview blockhash expired. Rebuild and review again. Signal will not silently change your transaction.');
 // Re-check the exact original message immediately before the wallet request. No replacement blockhash.
 const exact=await rpc('simulateTransaction',[a.base64,{encoding:'base64',commitment:'confirmed',sigVerify:false,replaceRecentBlockhash:false}]);
 if(exact.value?.err)throw new Error(`Exact-message pre-approval simulation failed: ${JSON.stringify(exact.value.err)}. No signature requested.`);
 if(!exact.value||exact.value.err!==null)throw new Error('Exact-message pre-approval simulation was unavailable. No signature requested.');
 if(!fresh()||!isCurrent()||wallet.publicKey?.toBase58()!==a.payer)throw new Error('The review expired or changed during pre-approval checks. No signature requested.');
 const original=Buffer.from(a.tx.message.serialize()).toString('base64');
 const signed=await wallet.signTransaction(VersionedTransaction.deserialize(Buffer.from(a.base64,'base64')));
 if(!isCurrent())throw new Error('The request changed while the wallet was open. Broadcasting blocked.');
 if(Buffer.from(signed.message.serialize()).toString('base64')!==original)throw new Error('Wallet changed the transaction message. Broadcasting blocked.');
 if(wallet.publicKey?.toBase58()!==a.payer)throw new Error('Wallet account changed. Broadcasting blocked.');
 if(!fresh())throw new Error('Preview expired during wallet approval. Nothing broadcast. Simulate again.');
 if(signed.signatures.length!==1||signed.signatures[0].every(n=>n===0))throw new Error('Wallet did not return a signature. Nothing broadcast.');
 const expectedSignature=bs58.encode(signed.signatures[0]);
 onBroadcastAttempt?.(expectedSignature);
 let result:string;
 try{result=await rpc<string>('sendTransaction',[Buffer.from(signed.serialize()).toString('base64'),{encoding:'base64',skipPreflight:false,preflightCommitment:'confirmed',maxRetries:2}]);}catch(error){throw new Error(`Broadcast status is unknown. Keep the displayed signature and check its receipt before another action. ${error instanceof Error?error.message:'RPC unavailable.'}`)}
 if(result!==expectedSignature)throw new Error('RPC returned an unexpected signature. Use the locally derived signature to check the receipt.');
 return expectedSignature;
}
