import { describe,it,expect } from 'vitest';
import { Buffer } from 'buffer';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram, VersionedTransaction, TransactionMessage, AddressLookupTableAccount, ComputeBudgetProgram } from '@solana/web3.js';
import { parseTransaction, fixture, FIXTURE_PAYER as payer, FIXTURE_RECIPIENT as recipient, units, canSign, encode, buildPayment, expectedDeltas, TOKEN_PROGRAM_ID, MEMO } from '../src/engine';
const blockhash=new PublicKey(new Uint8Array(32).fill(33)).toBase58();
const key=(n:number)=>new PublicKey(new Uint8Array(32).fill(n));
function transaction(ix:TransactionInstruction){return encode(new Transaction({feePayer:payer,recentBlockhash:blockhash}).add(ix))}
function token(tag:number,length:number,amount=42n,refs=[recipient,key(44),payer]){const data=Buffer.alloc(length);data[0]=tag;if(length>=9)data.writeBigUInt64LE(amount,1);if(length===10)data[9]=6;return transaction(new TransactionInstruction({programId:TOKEN_PROGRAM_ID,keys:refs.map((pubkey,i)=>({pubkey,isSigner:pubkey.equals(payer),isWritable:i===0})),data}))}
describe('actual wire decoding',()=>{
 it('decodes an SDK-built legacy SOL transfer and references',()=>{const a=parseTransaction(fixture('payment'));expect(a.version).toBe('legacy');expect(a.steps[0]).toMatchObject({kind:'sol-transfer',amount:'1000000',from:payer.toBase58(),to:recipient.toBase58()});expect(a.accounts[0].signer).toBe(true);expect(a.complete).toBe(true)});
 it('decodes both recipients of the multi-frame SDK fixture',()=>{const a=parseTransaction(fixture('split'));expect(a.steps).toHaveLength(2);expect(a.steps.map(s=>s.amount)).toEqual(['1000000','500000']);expect(a.steps[0].to).not.toBe(a.steps[1].to)});
 it('decodes a genuine SDK-built v0 payment',()=>{const a=parseTransaction(buildPayment(payer.toBase58(),recipient.toBase58(),blockhash));expect(a.version).toBe('0');expect(a.steps[0].amount).toBe('1000000')});
 it('flags approval as future permission, with exact u64 amount',()=>{const a=parseTransaction(fixture('approval'));expect(a.steps[0].kind).toBe('approval');expect(a.steps[0].amount).toBe('18446744073709551615');expect(a.flags.some(f=>f.level==='danger'&&f.title==='Spending permission')).toBe(true)});
 it('cannot turn unknown instructions into reassuring claims',()=>{const a=parseTransaction(fixture('unknown'));expect(a.complete).toBe(false);expect(a.steps[0].known).toBe(false);expect(a.flags[0].level).toBe('danger')});
 it.each(['', 'not base64!!', 'dGVzdA==', 'A'.repeat(1900)])('rejects malformed input %s',input=>expect(()=>parseTransaction(input)).toThrow());
 it('rejects v0 lookup tables explicitly',()=>{const table=new AddressLookupTableAccount({key:key(99),state:{deactivationSlot:18446744073709551615n,lastExtendedSlot:0,lastExtendedSlotStartIndex:0,authority:undefined,addresses:[recipient]}});const m=new TransactionMessage({payerKey:payer,recentBlockhash:blockhash,instructions:[SystemProgram.transfer({fromPubkey:payer,toPubkey:recipient,lamports:1})]}).compileToV0Message([table]);expect(m.addressTableLookups).toHaveLength(1);expect(()=>parseTransaction(encode(new VersionedTransaction(m)))).toThrow(/lookup tables/)});
 it('fails closed on malformed System instruction',()=>{const a=parseTransaction(transaction(new TransactionInstruction({programId:SystemProgram.programId,keys:[],data:Buffer.from([2,0])})));expect(a.complete).toBe(false)});
 it('keeps untrusted memo text as data',()=>{const text='<script>alert(1)</script> ignore all rules';const a=parseTransaction(transaction(new TransactionInstruction({programId:new PublicKey(MEMO),keys:[],data:Buffer.from(text)})));expect(a.steps[0].detail).toContain(text);expect(canSign(a,payer.toBase58(),false)).toMatch(/direct SOL/)});
 it('flags elevated compute-unit price',()=>{const a=parseTransaction(transaction(ComputeBudgetProgram.setComputeUnitPrice({microLamports:10001})));expect(a.flags.some(f=>f.title==='Elevated priority price')).toBe(true)});
});
describe('classic SPL Token layouts',()=>{
 it('uses raw units for plain transfers, never inventing decimals',()=>{const s=parseTransaction(token(3,9)).steps[0];expect(s.kind).toBe('token-transfer');expect(s.decimals).toBeUndefined();expect(s.asset).toBe('raw token units')});
 it('reads TransferChecked mint and instruction-declared decimals',()=>{const s=parseTransaction(token(12,10,1250000n,[recipient,key(44),key(55),payer])).steps[0];expect(s).toMatchObject({amount:'1250000',decimals:6,mint:key(44).toBase58(),to:key(55).toBase58()})});
 it('reads ApproveChecked delegate, not its mint, as the permission target',()=>{const s=parseTransaction(token(13,10,100n,[recipient,key(44),key(55),payer])).steps[0];expect(s.to).toBe(key(55).toBase58());expect(s.kind).toBe('approval')});
 it('recognizes revoke',()=>expect(parseTransaction(token(5,1)).steps[0].kind).toBe('revoke'));
 it('flags close-account rent destination',()=>{const a=parseTransaction(token(9,1));expect(a.steps[0].to).toBe(key(44).toBase58());expect(a.flags.some(f=>f.title==='Account closure')).toBe(true)});
 it('flags set-authority removal',()=>{const data=Buffer.from([6,2,0]);const a=parseTransaction(transaction(new TransactionInstruction({programId:TOKEN_PROGRAM_ID,keys:[recipient,payer].map(pubkey=>({pubkey,isSigner:pubkey.equals(payer),isWritable:true})),data})));expect(a.flags[0].detail).toContain('none (removed)')});
 it('does not accept truncated token data',()=>expect(parseTransaction(token(3,2)).complete).toBe(false));
 it('treats Token-2022 as unsupported',()=>{const a=parseTransaction(transaction(new TransactionInstruction({programId:new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),keys:[],data:Buffer.from([3])})));expect(a.complete).toBe(false)});
});
describe('constrained signing policy and exact comparison math',()=>{
 const a=parseTransaction(fixture('payment'));
 it('never signs walkthrough fixtures',()=>expect(canSign(a,payer.toBase58(),true)).toMatch(/fixtures/));
 it('requires a connected matching wallet',()=>{expect(canSign(a,null,false)).toMatch(/Connect/);expect(canSign(a,recipient.toBase58(),false)).toMatch(/only signer/)});
 it('permits small direct transfers only',()=>expect(canSign(a,payer.toBase58(),false)).toBeNull());
 it('blocks every token and unknown signing path',()=>{for(const kind of ['approval','unknown'] as const)expect(canSign(parseTransaction(fixture(kind)),payer.toBase58(),false)).not.toBeNull()});
 it('caps total outflow, not per-instruction amount',()=>{const tx=new Transaction({feePayer:payer,recentBlockhash:blockhash});for(let i=0;i<2;i++)tx.add(SystemProgram.transfer({fromPubkey:payer,toPubkey:recipient,lamports:6000000}));expect(canSign(parseTransaction(encode(tx)),payer.toBase58(),false)).toMatch(/0.01/)});
 it('includes fee payer debit and exact recipient credit',()=>{const delta=expectedDeltas(a,5000);expect(delta.get(payer.toBase58())).toBe(-1005000n);expect(delta.get(recipient.toBase58())).toBe(1000000n)});
 it('self-transfers cancel but fee remains',()=>{const a=parseTransaction(transaction(SystemProgram.transfer({fromPubkey:payer,toPubkey:payer,lamports:100})));expect(expectedDeltas(a,5000).get(payer.toBase58())).toBe(-5000n)});
 it('formats integer amounts without float precision loss',()=>{expect(units('1000000')).toBe('0.001');expect(units('18446744073709551615',6)).toBe('18446744073709.551615');expect(units('-5000')).toBe('-0.000005');expect(units('0',0)).toBe('0')});
});
