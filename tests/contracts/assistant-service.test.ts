import {expect,it,vi} from 'vitest';import {assistantService} from '../../src/main/assistant/service';import {providerStore} from '../../src/main/assistant/config';import {loadAssistantContext} from '../../src/main/assistant/context';import path from 'node:path';
const store=()=>providerStore('/unused',{isEncryptionAvailable:()=>false,encryptString:()=>{throw Error();},decryptString:()=>{throw Error();}});
it('runs only a confirmed action and suppresses stopped async results',async()=>{
 let executed=0,finish:((text:string)=>void)|undefined;
 const service=assistantService({store:store(),context:()=>loadAssistantContext('/unused',path.resolve('assistant/defaults')),render:()=>{},save:()=>{},audit:()=>{},cancelPoint:()=>{},policy:()=>null,execute:async()=>{executed++;return new Promise<string>(resolve=>{finish=resolve;});}});
 await service.start();service.dispatch({tag:'Ui',visible:true,blocked:false});service.submit('/remember hello');expect(executed).toBe(0);expect(service.state().phase).toBe('AwaitingDecision');
 service.dispatch({tag:'Decide',runId:service.state().runId,approve:true});expect(executed).toBe(1);service.dispatch({tag:'Stop'});finish?.('late result');await Promise.resolve();expect(service.state().result).not.toBe('late result');service.stop();
});
it('uses scheduled stall deadlines with fake timers and never retries partial output',async()=>{
 vi.useFakeTimers();try{
  let calls=0;const service=assistantService({store:store(),context:async()=>({} as never),render:()=>{},save:()=>{},audit:()=>{},cancelPoint:()=>{},policy:()=>null,execute:async()=>'',provider:async(_config,_key,_context,_messages,emit,signal)=>{calls++;emit({tag:'Text',text:'partial'});await new Promise<void>((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Error()),{once:true}));}});
  await service.start();await service.configure({config:{kind:'ollama',baseUrl:'http://127.0.0.1:11434',model:'fixture',cloudConsent:false,smallContext:true},key:''});service.dispatch({tag:'Ui',visible:true,blocked:false});service.submit('hello');await Promise.resolve();await vi.advanceTimersByTimeAsync(30000);expect(service.state().phase).toBe('Idle');expect(calls).toBe(1);service.stop();
 }finally{vi.useRealTimers();}
});
it('blocks execution when the decision audit cannot be saved',async()=>{
 let count=0;const service=assistantService({store:store(),context:async()=>({} as never),render:()=>{},save:()=>{},audit:()=>{throw Error();},cancelPoint:()=>{},policy:()=>null,execute:async()=>{count++;return 'unexpected';}});
 await service.start();service.dispatch({tag:'Ui',visible:true,blocked:false});service.submit('/remember hello');service.dispatch({tag:'Decide',runId:1,approve:true});expect(count).toBe(0);expect(service.state().result).toContain('blocked');service.stop();
});
it('forget disables the provider in memory even if deleting saved credentials fails',async()=>{
 const broken={...store(),clear:async()=>{throw Error();}};
 const service=assistantService({store:broken,context:async()=>({} as never),render:()=>{},save:()=>{},audit:()=>{},cancelPoint:()=>{},policy:()=>null,execute:async()=>''});await service.start();await service.configure({config:{kind:'ollama',baseUrl:'http://127.0.0.1:11434',model:'fixture',cloudConsent:false,smallContext:true},key:'fixture'});await service.forget();expect(service.settings().config.kind).toBe('offline');expect(service.settings().key).toBe('');expect(service.warning()).toContain('could not be deleted');service.stop();
});
