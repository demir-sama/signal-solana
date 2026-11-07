import {PublicKey,VersionedTransaction} from '@solana/web3.js';
import {getWallets} from '@wallet-standard/app';
import type {Wallet,WalletAccount} from '@wallet-standard/base';
export type WalletProvider={publicKey?:PublicKey;connect:()=>Promise<{publicKey:PublicKey}>;disconnect?:()=>Promise<void>;signTransaction:(tx:VersionedTransaction)=>Promise<VersionedTransaction>;on?:(event:string,fn:(p?:PublicKey)=>void)=>void;removeListener?:(event:string,fn:(p?:PublicKey)=>void)=>void};
export type WalletChoice={id:string;name:string;detail:string;kind:'standard'|'injected'|'sdk';create:()=>Promise<WalletProvider>};
export type Platform='ios'|'android-chrome'|'android-other'|'desktop';
export function walletPlatform(ua:string,platform='',touches=0,brave=false):Platform{
 if(/iPhone|iPad|iPod/i.test(ua)||(platform==='MacIntel'&&touches>1))return 'ios';
 if(/Android/i.test(ua))return /Chrome\//.test(ua)&&!/EdgA|OPR|SamsungBrowser|Firefox|Brave/i.test(ua)&&!brave?'android-chrome':'android-other';
 return 'desktop';
}
export function solflareBrowseUrl(origin:string){const u=new URL(origin);if(u.protocol!=='https:'||u.username||u.password)return undefined;const root=u.origin+'/';return `https://solflare.com/ul/v1/browse/${encodeURIComponent(root)}?ref=${encodeURIComponent(root)}`}
const chain='solana:devnet';
export function standardProvider(wallet:Wallet):WalletProvider{
 let account:WalletAccount|undefined;let off:(()=>void)|undefined;const listeners=new Map<string,Set<(p?:PublicKey)=>void>>();
 const emit=(event:string,key?:PublicKey)=>listeners.get(event)?.forEach(fn=>fn(key));
 const select=(accounts:readonly WalletAccount[])=>accounts.find(a=>a.chains.includes(chain));
 const provider:WalletProvider={
  get publicKey(){return account?new PublicKey(account.address):undefined},
  async connect(){const feature=wallet.features['standard:connect'] as any;const result=await feature.connect();account=select(result.accounts??wallet.accounts);if(!account)throw new Error(`${wallet.name} did not return a devnet-compatible account. No signature was requested.`);new PublicKey(account.address);const events=wallet.features['standard:events'] as any;if(events?.on)off=events.on('change',(change:any)=>{if(change.accounts){account=select(change.accounts);emit('accountChanged',provider.publicKey)}});return {publicKey:provider.publicKey!}},
  async disconnect(){try{await (wallet.features['standard:disconnect'] as any)?.disconnect()}finally{off?.();account=undefined;emit('disconnect')}},
  async signTransaction(tx){if(!account)throw new Error('Connect the selected wallet first.');const f=wallet.features['solana:signTransaction'] as any;if(!f?.signTransaction||!f.supportedTransactionVersions?.includes(tx.message.version))throw new Error('This wallet does not advertise sign-only support for this transaction format. No sign-and-send fallback is used.');const [result]=await f.signTransaction({account,chain,transaction:tx.serialize()});if(!result?.signedTransaction)throw new Error('Wallet returned no signed transaction.');return VersionedTransaction.deserialize(result.signedTransaction)},
  on(event,fn){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event)!.add(fn)},removeListener(event,fn){listeners.get(event)?.delete(fn)}
 };return provider;
}
let mobileInitialization:Promise<void>|undefined;
export async function initializeMobileWallet(platform:Platform){
 if(platform!=='android-chrome'||!window.isSecureContext)return;
 if(!mobileInitialization)mobileInitialization=(async()=>{const {registerMwa}=await import('@solana-mobile/wallet-standard-mobile');let authorization:any;registerMwa({appIdentity:{name:'Signal — Read Before You Sign',uri:window.location.origin,icon:'signal.svg'},chains:[chain],authorizationCache:{async get(){return authorization},async set(value){authorization=value},async clear(){authorization=undefined}},onWalletNotFound:async()=>{throw new Error('No compatible Android wallet responded. Nothing was retried. Android Chrome and an installed MWA-compatible wallet are required.')}})})();
 await mobileInitialization;
}
export function discoverWallets(win:any=window,registered:readonly Wallet[]=getWallets().get()):WalletChoice[]{
 const choices:WalletChoice[]=[];const names=new Set<string>();
 for(const [index,wallet] of registered.entries()){
  if(!wallet.chains.includes(chain)||!(wallet.features['standard:connect'] as any)?.connect)continue;
  const name=String(wallet.name).slice(0,70);names.add(name.toLowerCase());choices.push({id:`standard-${index}-${name}`,name,kind:'standard',detail:name.includes('Mobile Wallet Adapter')?'Android Chrome · choose an installed compatible wallet':'Detected · Wallet Standard · devnet',create:async()=>standardProvider(wallet)});
 }
 const phantom=win.phantom?.solana?.isPhantom?win.phantom.solana:win.solana?.isPhantom?win.solana:undefined;
 if(phantom&&!names.has('phantom'))choices.push({id:'phantom-injected',name:'Phantom',kind:'injected',detail:'Detected in this browser · manual connection',create:async()=>phantom});
 if(win.solflare?.isSolflare&&!names.has('solflare'))choices.push({id:'solflare-injected',name:'Solflare',kind:'injected',detail:'Detected in this browser · manual connection',create:async()=>win.solflare});
 if(!choices.some(c=>c.name.toLowerCase()==='solflare'))choices.push({id:'solflare-sdk',name:'Solflare',kind:'sdk',detail:'Official SDK · extension, web or mobile connection flow',create:async()=>{
   const {default:Solflare}=await import('@solflare-wallet/sdk');const sdk=new Solflare({network:'devnet'});
   // Restrict this SDK's iframe-message channel to its actual official frame, not arbitrary window senders.
   const guard=(e:MessageEvent)=>{if(e.data?.channel==='solflareIframeToWalletAdapter'){const frame=document.querySelector<HTMLIFrameElement>('.solflare-wallet-adapter-iframe iframe');if(e.origin!=='https://connect.solflare.com'||e.source!==frame?.contentWindow)e.stopImmediatePropagation()}};
   window.addEventListener('message',guard,true);const cleanup=()=>window.removeEventListener('message',guard,true);
   return {get publicKey(){return sdk.publicKey??undefined},async connect(){try{await sdk.connect();if(!sdk.publicKey)throw new Error('Solflare returned no public address.');return {publicKey:sdk.publicKey}}catch(e){cleanup();await sdk.disconnect().catch(()=>{});throw e}},async disconnect(){try{await sdk.disconnect()}finally{cleanup()}},async signTransaction(tx){return await sdk.signTransaction(tx) as VersionedTransaction},on:(event,fn)=>{sdk.on(event,fn)},removeListener:(event,fn)=>{sdk.removeListener(event,fn)}};
  }});
 return choices;
}
export function subscribeWallets(changed:()=>void){const registry=getWallets();const off1=registry.on('register',changed),off2=registry.on('unregister',changed);return()=>{off1();off2()}}
