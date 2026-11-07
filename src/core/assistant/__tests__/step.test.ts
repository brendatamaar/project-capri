import {expect,it} from 'vitest';import fc from 'fast-check';
import {initial,type Input,type State} from '../model';import {step} from '../step';
const note={tag:'Remember' as const,text:'A fact'};
const pending=():State=>step({...initial(),visible:true},{tag:'Offline',runId:1,text:'/remember A fact',action:note,reply:''}).state;
it('requires a matching visible user decision, exactly once',()=>{
 const p=pending();expect(step(p,{tag:'Decide',runId:2,approve:true}).commands).toEqual([]);
 const result=step(p,{tag:'Decide',runId:1,approve:true});expect(result.commands).toContainEqual({tag:'Execute',runId:1,action:note});
 expect(step(result.state,{tag:'Decide',runId:1,approve:true}).commands).toEqual([]);
 for(const guard of [{visible:false},{blocked:true}])expect(step({...p,...guard},{tag:'Decide',runId:1,approve:true}).commands).toEqual([]);
});
it('ignores stale attempts, revisions and completed effects after Stop',()=>{
 let s=step({...initial(),visible:true},{tag:'Submit',runId:1,text:'Hi'}).state;
 expect(step(s,{tag:'Chunk',runId:1,attempt:1,text:'stale'}).state).toBe(s);
 s=step(s,{tag:'Chunk',runId:1,attempt:0,text:'Hi'}).state;
 expect(step(s,{tag:'StallDue',runId:1,attempt:0,revision:0}).commands).toEqual([]);
 const stopped=step(s,{tag:'Stop'}).state;
 expect(step(stopped,{tag:'Completed',runId:1,attempt:0,action:note}).state).toBe(stopped);
 expect(step(stopped,{tag:'ActionFinished',runId:1,text:'wrong'}).state).toBe(stopped);
});
it('retries at most twice before output and never retries partial output',()=>{
 let s=step(initial(),{tag:'Submit',runId:1,text:'Hi'}).state;
 for(let attempt=0;attempt<3;attempt++){
  const failed=step(s,{tag:'Failed',runId:1,attempt,transient:true});
  if(attempt<2){expect(failed.state.phase).toBe('RetryWait');s=step(failed.state,{tag:'RetryDue',runId:1,attempt}).state;}else expect(failed.state.phase).toBe('Idle');
 }
 s=step(initial(),{tag:'Submit',runId:2,text:'Hi'}).state;s=step(s,{tag:'Chunk',runId:2,attempt:0,text:'partial'}).state;
 expect(step(s,{tag:'Failed',runId:2,attempt:0,transient:true}).state.phase).toBe('Idle');
});
it('cancels proposals on hide, blocking activity and expiry',()=>{
 for(const input of [{tag:'Ui',visible:false,blocked:false},{tag:'Ui',visible:true,blocked:true},{tag:'DecisionExpired',runId:1},{tag:'Stop'}] as Input[]){const r=step(pending(),input);expect(r.state.pending).toBeNull();expect(r.commands.some(c=>c.tag==='Execute')).toBe(false);}
});
it('never executes from generated text, results, timers or arbitrary input sequences',()=>{
 const inputs=fc.oneof(fc.boolean().map(approve=>({tag:'Decide',runId:1,approve}) as Input),fc.constantFrom<Input>({tag:'Offline',runId:1,text:'proposal',action:note,reply:''},{tag:'Stop'},{tag:'Ui',visible:true,blocked:false},{tag:'Ui',visible:false,blocked:false},{tag:'DecisionExpired',runId:1},{tag:'Completed',runId:1,attempt:0,action:note},{tag:'ActionFinished',runId:1,text:'done'}));
 fc.assert(fc.property(fc.array(inputs,{maxLength:100}),events=>{let state=initial();for(const input of events){const result=step(state,input);if(result.commands.some(c=>c.tag==='Execute')){expect(input.tag).toBe('Decide');expect((input as {approve:boolean}).approve).toBe(true);expect(state.phase).toBe('AwaitingDecision');expect(state.visible&&!state.blocked).toBe(true);}expect(step(state,input)).toEqual(result);state=result.state;}}));
});
it('stale run results are always inert and output is bounded',()=>{
 fc.assert(fc.property(fc.integer({min:2,max:100000}),fc.string(),(runId,text)=>{const s={...initial(),runId,phase:'Generating' as const};expect(step(s,{tag:'Chunk',runId:runId-1,attempt:0,text}).state).toBe(s);}));
 const s=step(initial(),{tag:'Submit',runId:1,text:'Hi'}).state;expect(step(s,{tag:'Chunk',runId:1,attempt:0,text:'x'.repeat(20000)}).state.draft.length).toBeLessThanOrEqual(16000);
});
it('audits before execution, times out actions and ignores late completion',()=>{
 const approved=step(pending(),{tag:'Decide',runId:1,approve:true});expect(approved.commands.findIndex(c=>c.tag==='AuditDecision')).toBeLessThan(approved.commands.findIndex(c=>c.tag==='Execute'));
 const expired=step(approved.state,{tag:'ActionDeadline',runId:1});expect(expired.state.phase).toBe('Idle');expect(expired.state.result).toContain('may already');expect(step(expired.state,{tag:'ActionFinished',runId:1,text:'late'}).state).toBe(expired.state);
});
it('retry budget and stale revisions hold across generated attempts',()=>{
 fc.assert(fc.property(fc.integer({min:1,max:10}),fc.string({minLength:1,maxLength:100}), (failures,text)=>{
  let state=step(initial(),{tag:'Submit',runId:1,text}).state;let generations=1;
  for(let i=0;i<failures;i++){const attempt=state.attempt;const failed=step(state,{tag:'Failed',runId:1,attempt,transient:true});state=failed.state;if(state.phase==='RetryWait'){const retry=step(state,{tag:'RetryDue',runId:1,attempt});generations+=retry.commands.filter(c=>c.tag==='Generate').length;state=retry.state;}}
  expect(generations).toBeLessThanOrEqual(3);
  let active=step(initial(),{tag:'Submit',runId:1,text}).state;active=step(active,{tag:'Chunk',runId:1,attempt:0,text}).state;
  expect(step(active,{tag:'StallDue',runId:1,attempt:0,revision:0}).state).toBe(active);
 }));
});
it('conversation retention remains bounded over arbitrary completed turns',()=>{
 fc.assert(fc.property(fc.integer({min:1,max:100}),turns=>{let state={...initial(),visible:true};for(let runId=1;runId<=turns;runId++){state=step(state,{tag:'Offline',runId,text:'user',action:null,reply:'assistant'}).state;expect(state.messages.length).toBeLessThanOrEqual(40);}}));
});
it('input jobs can execute only from a matching user approval in that step',()=>{fc.assert(fc.property(fc.boolean(),fc.boolean(),fc.boolean(),(approve,visible,blocked)=>{const action={tag:'InputJob' as const,id:'opaque',steps:[{tag:'Key' as const,key:'Left' as const}]};const state=step({...initial(),visible:true},{tag:'Offline',runId:10,text:'job',action,reply:''}).state;const result=step({...state,visible,blocked},{tag:'Decide',runId:10,approve});expect(result.commands.some(c=>c.tag==='Execute')).toBe(approve&&visible&&!blocked);expect(step(state,{tag:'ActionFinished',runId:10,text:'approve'}).commands).toEqual([]);}));});
