import { pipeline,env } from '@huggingface/transformers';
import { writeFile } from 'node:fs/promises';
import { explanationMessages,checkGeneratedExplanation,normalizeExplanation } from '../src/ai-policy.ts';
env.allowLocalModels=false;
console.log('Loading actual SmolLM2-360M-Instruct q4 weights for a free local inference smoke test.');
const generate=await pipeline('text-generation','HuggingFaceTB/SmolLM2-360M-Instruct',{device:'cpu',dtype:'q4'});
const samples=[
 'Network: Solana devnet, not real money. Instruction 1 requests a direct transfer of 0.001 SOL from its source account to its destination account. Simulation has not run. The destination identity is not verified. These are requested instructions, not proof of a completed payment.',
 'Network: Solana devnet, not real money. Instruction 1 grants a delegate permission to spend up to 18446744073709551615 raw token units later. It is not an immediate transfer. Risk flag: Spending permission. Simulation has not run. The destination identity is not verified. These are requested instructions, not proof of a completed payment.'
];
const results=[];
for(const evidence of samples){
 const output=await generate(explanationMessages(evidence),{max_new_tokens:150,do_sample:false,return_full_text:false});
 const text=normalizeExplanation(output[0].generated_text.at(-1).content);
 const withheld=checkGeneratedExplanation(text,evidence);
 console.log(JSON.stringify({text,withheld}));results.push({input:evidence,output:text,withheld});
}
await writeFile('docs/ai-smoke.json',JSON.stringify({verifiedAt:new Date().toISOString(),model:'HuggingFaceTB/SmolLM2-360M-Instruct',dtype:'q4',runtime:'Actual local Node CPU inference, NOT browser WASM verification',results,limitations:'Small-model outputs can be incomplete or inaccurate. Sanity checks are not a factuality guarantee. The deterministic decoder remains authoritative.'},null,2));
await generate.dispose();
