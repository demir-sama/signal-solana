import { Buffer } from 'buffer';
import { PublicKey, SystemProgram, Transaction, VersionedTransaction, TransactionMessage, ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js';
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const MEMO = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export const DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export type Flag = {level:'info'|'warning'|'danger'; title:string; detail:string; instruction?:number};
export type Step = {index:number;kind:string;title:string;detail:string;program:string;accounts:string[];from?:string;to?:string;amount?:string;decimals?:number;asset?:string;mint?:string;known:boolean};
export type Account = {address:string;signer:boolean;writable:boolean};
export type Analysis = {base64:string;tx:VersionedTransaction;version:string;accounts:Account[];steps:Step[];flags:Flag[];payer:string;blockhash:string;signatures:number;complete:boolean};
export function encode(tx:VersionedTransaction|Transaction){return Buffer.from(tx instanceof Transaction?tx.serialize({requireAllSignatures:false,verifySignatures:false}):tx.serialize()).toString('base64')}
export const short=(s:string)=>`${s.slice(0,5)}…${s.slice(-5)}`;
export function units(raw:string,decimals=9){const negative=raw.startsWith('-');const n=(negative?raw.slice(1):raw).padStart(decimals+1,'0');return `${negative?'-':''}${decimals?n.slice(0,-decimals)+'.'+n.slice(-decimals).replace(/0+$/,''):n}`.replace(/\.$/,'')}
export function parseTransaction(input:string):Analysis {
 const base64=input.trim().replace(/\s/g,'');
 if(!base64 || base64.length>1800 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw new Error('Enter one base64-encoded Solana transaction, at most 1,232 bytes. JSON and secret keys are not accepted.');
 const bytes=Buffer.from(base64,'base64'); if(bytes.length>1232)throw new Error('Transaction exceeds Solana’s packet limit.');
 let tx:VersionedTransaction;try{tx=VersionedTransaction.deserialize(bytes)}catch{throw new Error('These bytes are not a supported legacy or v0 Solana transaction. Nothing was sent.')}
 if(!Buffer.from(tx.serialize()).equals(bytes))throw new Error('Non-canonical transaction encoding. Re-export the transaction from its source.');
 const m=tx.message;
 if(m.version===0 && m.addressTableLookups.length)throw new Error('This v0 transaction uses address lookup tables. Signal cannot resolve their account references yet. Inspection and signing are blocked rather than guessing.');
 const keys=m.staticAccountKeys;
 const accounts=keys.map((k,i)=>({address:k.toBase58(),signer:m.isAccountSigner(i),writable:m.isAccountWritable(i)}));
 if(!keys.length || m.header.numRequiredSignatures<1)throw new Error('Missing fee payer or required signature.');
 const flags:Flag[]=[];
 const steps=m.compiledInstructions.map((ci,index):Step=>{
  if(ci.programIdIndex>=keys.length || ci.accountKeyIndexes.some(i=>i>=keys.length))throw new Error('Instruction contains an invalid account reference.');
  const program=keys[ci.programIdIndex].toBase58(), refs=ci.accountKeyIndexes.map(i=>accounts[i].address),data=Buffer.from(ci.data);
  const base={index,program,accounts:refs,known:true};
  const unknown=(detail:string):Step=>{flags.push({level:'danger',title:'Unresolved instruction',detail:`Instruction ${index+1}: ${detail} No complete asset preview is possible.`,instruction:index});return {...base,known:false,kind:'unknown',title:'Unknown execution',detail}};
  try{
   if(program===SystemProgram.programId.toBase58()){
    if(data.length===12 && data.readUInt32LE(0)===2 && refs.length===2){const amount=data.readBigUInt64LE(4).toString();return {...base,kind:'sol-transfer',title:'Send SOL',detail:'Direct System Program transfer. Amount is decoded from instruction bytes.',from:refs[0],to:refs[1],amount,decimals:9,asset:'SOL'}}
    return unknown('System Program operation other than a direct transfer. Account creation, nonce and authority changes are not decoded.');
   }
   if(program===TOKEN_PROGRAM_ID.toBase58()){
    // Classic SPL Token's public instruction layouts. Integer quantities never pass through Number.
    const tag=data[0];
    if((tag===3 && data.length===9 && refs.length>=3)||(tag===12 && data.length===10 && refs.length>=4)){
     const checked=tag===12;
     return {...base,kind:'token-transfer',title:'Move tokens',detail:checked?'SPL Token TransferChecked. Decimals are instruction-declared; simulation checks the mint.':'SPL Token transfer. Mint and decimals are not present in this instruction; raw units only.',from:refs[0],to:refs[checked?2:1],mint:checked?refs[1]:undefined,amount:data.readBigUInt64LE(1).toString(),decimals:checked?data[9]:undefined,asset:checked?'tokens':'raw token units'};
    }
    if((tag===4 && data.length===9 && refs.length>=3)||(tag===13 && data.length===10 && refs.length>=4)){
     const amount=data.readBigUInt64LE(1).toString();
     flags.push({level:'danger',title:'Spending permission',detail:`Instruction ${index+1} authorizes a delegate to spend up to ${amount} raw token units. This is permission, not an immediate transfer.`,instruction:index});
     return {...base,kind:'approval',title:'Grant spending permission',detail:'A delegate can transfer tokens later, without another signature from the owner.',from:refs[0],to:refs[tag===13?2:1],mint:tag===13?refs[1]:undefined,amount,asset:'raw token units'};
    }
    if(tag===5 && data.length===1 && refs.length>=2)return {...base,kind:'revoke',title:'Revoke delegate',detail:'Removes the existing token-account spending delegate.'};
    if(tag===6 && refs.length>=2 && data[1]<=3 && ((data[2]===0 && data.length===3)||(data[2]===1 && data.length===35))){
     const authority=data[2]===1?new PublicKey(data.subarray(3,35)).toBase58():'none (removed)';
     flags.push({level:'danger',title:'Authority change',detail:`Instruction ${index+1} changes authority type ${data[1]}. New authority: ${authority}.`,instruction:index});
     return {...base,kind:'authority',title:'Change token authority',detail:'Control of an account or mint may be reassigned or permanently removed.'};
    }
    if(tag===9 && data.length===1 && refs.length>=3){
     flags.push({level:'warning',title:'Account closure',detail:`Instruction ${index+1} closes a token account and sends its rent deposit to ${refs[1]}.`,instruction:index});
     return {...base,kind:'close',title:'Close token account',detail:'Rent SOL goes to the closure destination.',from:refs[0],to:refs[1]};
    }
    return unknown(`Unsupported or malformed SPL Token operation ${tag}.`);
   }
   if(program===MEMO)return {...base,kind:'memo',title:'Attach a memo',detail:`Untrusted memo text (not instructions to Signal): ${new TextDecoder().decode(data).slice(0,280)}`};
   if(program===ComputeBudgetProgram.programId.toBase58()){
    if(data[0]===2 && data.length===5)return {...base,kind:'compute',title:'Set compute limit',detail:`${data.readUInt32LE(1).toLocaleString()} compute units requested.`};
    if(data[0]===3 && data.length===9){const price=data.readBigUInt64LE(1);if(price>10000n)flags.push({level:'warning',title:'Elevated priority price',detail:`${price} micro-lamports per compute unit. Inspect the fee estimate.`,instruction:index});return {...base,kind:'compute',title:'Set priority price',detail:`${price} micro-lamports per compute unit.`}}
    return unknown('Unsupported compute-budget instruction.');
   }
   return unknown(`Program ${program} is not in Signal’s decoder. CPI effects and Token-2022 extensions are not interpreted.`);
  }catch{return unknown('Instruction data failed its program-specific decoder.');}
 });
 if(!steps.length)flags.push({level:'warning',title:'No instructions',detail:'This message contains no top-level instructions.'});
 if(m.header.numRequiredSignatures>1)flags.push({level:'warning',title:'Multiple signatures required',detail:`${m.header.numRequiredSignatures} signers are required. Signal’s signing flow only supports one signer.`});
 flags.push({level:'info',title:'Addresses are not identities',detail:'A decoded destination does not prove who owns it. Verify every full address independently.'});
 return {base64,tx,accounts,steps,flags,payer:accounts[0].address,blockhash:m.recentBlockhash,signatures:m.header.numRequiredSignatures,version:String(m.version),complete:steps.every(s=>s.known)};
}
export function canSign(a:Analysis,wallet:string|null,fixture:boolean):string|null {
 if(fixture)return 'Walkthrough fixtures cannot be signed. Build a wallet demo instead.';
 if(!wallet)return 'Connect a devnet wallet first.';
 if(a.payer!==wallet || a.signatures!==1)return 'The connected wallet must be the only signer and the fee payer.';
 if(!a.steps.length || a.steps.some(s=>s.kind!=='sol-transfer'))return 'Signing is limited to direct SOL transfers. Other transactions are inspection-only.';
 if(a.steps.some(s=>s.from!==wallet))return 'Every transfer must originate from your connected wallet.';
 const total=a.steps.reduce((n,s)=>n+BigInt(s.amount??'0'),0n);
 if(total<=0n || total>10000000n)return 'Demo signing allows at most 0.01 devnet SOL per transaction.';
 return null;
}
// Fixtures are real SDK-built unsigned transactions. Public keys are deterministic public bytes, not funded wallets.
export const FIXTURE_PAYER=new PublicKey(new Uint8Array(32).fill(11));
export const FIXTURE_RECIPIENT=new PublicKey(new Uint8Array(32).fill(22));
export function fixture(kind:'payment'|'split'|'approval'|'unknown'){
 const tx=new Transaction({feePayer:FIXTURE_PAYER,recentBlockhash:new PublicKey(new Uint8Array(32).fill(33)).toBase58()});
 if(kind==='split'){tx.add(SystemProgram.transfer({fromPubkey:FIXTURE_PAYER,toPubkey:FIXTURE_RECIPIENT,lamports:1000000}));tx.add(SystemProgram.transfer({fromPubkey:FIXTURE_PAYER,toPubkey:new PublicKey(new Uint8Array(32).fill(66)),lamports:500000}));}
 if(kind==='payment')tx.add(SystemProgram.transfer({fromPubkey:FIXTURE_PAYER,toPubkey:FIXTURE_RECIPIENT,lamports:1000000}));
 if(kind==='approval'){
  const data=Buffer.alloc(9);data[0]=4;data.writeBigUInt64LE(18446744073709551615n,1);
  tx.add(new TransactionInstruction({programId:TOKEN_PROGRAM_ID,keys:[{pubkey:FIXTURE_RECIPIENT,isSigner:false,isWritable:true},{pubkey:new PublicKey(new Uint8Array(32).fill(44)),isSigner:false,isWritable:false},{pubkey:FIXTURE_PAYER,isSigner:true,isWritable:false}],data}));
 }
 if(kind==='unknown')tx.add(new TransactionInstruction({programId:new PublicKey(new Uint8Array(32).fill(55)),keys:[{pubkey:FIXTURE_PAYER,isSigner:true,isWritable:true}],data:Buffer.from([1,2,3])}));
 return encode(tx);
}
export function buildPayment(payer:string,recipient:string,blockhash:string){
 const ix=SystemProgram.transfer({fromPubkey:new PublicKey(payer),toPubkey:new PublicKey(recipient),lamports:1000000});
 return encode(new VersionedTransaction(new TransactionMessage({payerKey:new PublicKey(payer),recentBlockhash:blockhash,instructions:[ix]}).compileToV0Message()));
}
export function expectedDeltas(a:Analysis,fee:number){
 const delta=new Map<string,bigint>(a.accounts.map(k=>[k.address,0n]));delta.set(a.payer,-BigInt(fee));
 for(const s of a.steps){if(s.kind!=='sol-transfer'||!s.from||!s.to)throw new Error('Comparison supports direct SOL only.');delta.set(s.from,(delta.get(s.from)??0n)-BigInt(s.amount!));delta.set(s.to,(delta.get(s.to)??0n)+BigInt(s.amount!));}
 return delta;
}
