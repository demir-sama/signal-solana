// Fixed-destination, devnet-only JSON-RPC relay. No secrets or arbitrary upstream URLs.
const allowed=new Set(['getGenesisHash','getLatestBlockhash','getMultipleAccounts','getBalance','getFeeForMessage','simulateTransaction','isBlockhashValid','sendTransaction','getSignatureStatuses','getTransaction','getBlockHeight']);
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 const b=req.body;
 if(!b||Array.isArray(b)||b.jsonrpc!=='2.0'||!allowed.has(b.method)||JSON.stringify(b).length>24000)return res.status(400).json({error:'Unsupported devnet RPC request'});
 try{
  const upstream=await fetch('https://api.devnet.solana.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b),signal:AbortSignal.timeout(18000)});
  if(!upstream.ok)return res.status(503).json({error:'Public devnet RPC temporarily unavailable'});
  return res.status(200).json(await upstream.json());
 }catch{return res.status(503).json({error:'Public devnet RPC timeout'})}
}
