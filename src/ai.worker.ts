import { explanationMessages, checkGeneratedExplanation, normalizeExplanation } from './ai-policy';
import { pipeline, env, type TextGenerationPipeline } from '@huggingface/transformers';
env.allowLocalModels=false;
// Dedicated worker keeps model downloads and CPU inference away from the interaction thread.
env.backends.onnx.wasm!.numThreads=1;
let generator:TextGenerationPipeline|undefined;
self.onmessage=async(event:MessageEvent<{id:number;evidence:string}>)=>{
 const {id,evidence}=event.data;
 try{
  if(!generator){
   self.postMessage({id,type:'status',text:'Downloading SmolLM2 • roughly 390 MB, cached on this device'});
   generator=await (pipeline as Function)('text-generation','HuggingFaceTB/SmolLM2-360M-Instruct',{device:'wasm',dtype:'q4',progress_callback:(p:any)=>{if(p.status==='progress')self.postMessage({id,type:'status',text:`Loading local model • ${p.file?.split('/').pop()??''} ${Math.round(p.progress??0)}%`})}}) as TextGenerationPipeline;
  }
  self.postMessage({id,type:'status',text:'Explaining evidence on your device…'});
  const output=await generator(explanationMessages(evidence),{max_new_tokens:150,do_sample:false,return_full_text:false});
  const first=output[0] as any;
  const generated=first.generated_text;
  const rawText=typeof generated==='string'?generated:generated?.at(-1)?.content;
  const text=normalizeExplanation(String(rawText??''));
  if(!text)throw new Error('The model returned no explanation.');
  const invalid=checkGeneratedExplanation(String(text),evidence);if(invalid)throw new Error(invalid);
  self.postMessage({id,type:'result',text:String(text)});
 }catch(error){self.postMessage({id,type:'error',text:error instanceof Error?error.message:'Local inference failed.'})}
};
