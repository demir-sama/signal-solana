// The model receives only locally constructed, decoder-grounded facts.
export function explanationMessages(evidence:string){return [{role:'user',content:`Explain this UNSIGNED transaction request in two sentences. It has NOT executed. Describe effects using the word 'would'. Preserve amounts exactly. Use only report facts. Do not recommend signing or claim safety. Report: ${evidence.slice(0,2500)}`}];}
export function normalizeExplanation(text:string){return text.replace(/(^|\n)\s*\d+[.)]\s+/g,'$1').trim();}
export function checkGeneratedExplanation(text:string,evidence:string):string|null{
 if((text.match(/[^\x00-\x7F]/g)??[]).length>text.length*.1)return 'The model returned an unreadable response. Its explanation was withheld.';
 if(!text.trim())return 'The local model returned no explanation.';
 if(text.length>2000)return 'The local model returned an unexpectedly long response.';
 // Fail closed on obvious invented numeric claims. This is a narrow sanity check, not a factuality guarantee.
 const numbers=(s:string)=>s.match(/\d+(?:\.\d+)?/g)??[];
 const allowed=new Set(numbers(evidence));
 if(numbers(text).some(n=>!allowed.has(n)))return 'The model introduced a number that is not in the evidence. Its explanation was withheld.';
 const inventedAsset=(text.match(/\b(?:SOL|DOT|BTC|ETH|USDC|USDT)\b/g)??[]).find(asset=>!evidence.includes(asset));
 if(inventedAsset)return 'The model introduced an asset name outside the evidence. Its explanation was withheld.';
 if(/\b(safe|guaranteed|risk-free|trustworthy)\b/i.test(text))return 'The model used unsupported safety language. Its explanation was withheld.';
 return null;
}
