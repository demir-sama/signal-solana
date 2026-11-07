import { pipeline,env } from '@huggingface/transformers';
env.allowLocalModels=false;
const model=process.argv[2]??'HuggingFaceTB/SmolLM2-360M-Instruct';
console.log('Testing actual local model:',model);
const task=model.includes('T5')?'text2text-generation':'text-generation';
const gen=await pipeline(task,model,{device:'cpu',dtype:task==='text2text-generation'?'q8':'q4'});
for(const report of ['This Solana devnet transaction requests a direct transfer of 0.001 SOL. Simulation has not run. Destination identity is unverified.','This Solana devnet transaction grants a delegate permission to spend up to 18446744073709551615 raw token units later. This is not an immediate transfer. Simulation has not run.']){
 const prompt=`Explain the following transaction report in two concise sentences. Use only facts from the report. Do not recommend signing. Report: ${report}`;
 const input=task==='text2text-generation'?prompt:[{role:'user',content:prompt}];
 const out=await gen(input,{max_new_tokens:100,do_sample:false,return_full_text:false});
 console.log(JSON.stringify(out));
}
await gen.dispose();
