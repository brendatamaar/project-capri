import {describe,it,expect} from 'vitest';
import fc from 'fast-check';
import {initial,type Thread,type Input,type State} from '../model';
import {step,run,presence} from '../step';
const thread=(patch:Partial<Thread>={}):Thread=>({id:'t' as Thread['id'],projectId:'p',title:'Fixture',provider:'codex',mode:'supervised',phase:'running',runId:'r' as Thread['runId'],error:null,summary:null,pending:null,...patch});
const pending=()=>({id:'a' as NonNullable<Thread['pending']>['id'],kind:'approval',createdAt:1,blocking:true});
function live(threads:Thread[]=[]){return run([{tag:'Started',baseUrl:'http://localhost:3774'},{tag:'ServerChecked',attempt:1,compatible:true},{tag:'Opened',attempt:1},{tag:'Snapshot',attempt:1,sequence:0,projects:[],threads},{tag:'Synchronized',attempt:1}]).state;}
describe('monitoring fallback core',()=>{
 it('pairing, auth rejection, version rejection and forgetting are explicit',()=>{
  let s=step(initial(),{tag:'Pair',baseUrl:'http://localhost:3774',credential:'fixture'});
  expect(s.commands.some(c=>c.tag==='Exchange')).toBe(true);
  s=step(s.state,{tag:'Paired',attempt:1,baseUrl:'http://localhost:3774'});
  expect(s.commands.map(c=>c.tag)).toEqual(['Save','CheckServer','Render']);
  expect(step(s.state,{tag:'ServerChecked',attempt:1,compatible:false}).state.connection.tag).toBe('Incompatible');
  expect(step(s.state,{tag:'AuthFailed',attempt:1}).commands.map(c=>c.tag)).toContain('Forget');
  expect(step(live(),{tag:'Disconnect'}).state.connection.tag).toBe('Unpaired');
 });
 it('snapshots and synchronization load details without playing reactions',()=>{
  const s=live([thread({pending:pending(),phase:'completed'})]);
  expect(s.focus).toBe('a');expect(presence(s)).toBe('NeedsYou');
  const result=step(s,{tag:'Snapshot',attempt:1,sequence:1,projects:[],threads:[thread({phase:'failed'})]});
  expect(result.commands.some(c=>c.tag==='Reaction')).toBe(false);
 });
 it('only live status edges react, and stale hold results do not affect a new run',()=>{
  const done=step(live([thread()]),{tag:'ThreadUpdated',attempt:1,sequence:1,thread:thread({phase:'completed'})});
  expect(done.commands.find(c=>c.tag==='Reaction')).toMatchObject({kind:'Done'});
  expect(presence(done.state)).toBe('Done');
  const newer=step(done.state,{tag:'ThreadUpdated',attempt:1,sequence:2,thread:thread({runId:'new' as Thread['runId']})}).state;
  expect(presence(newer)).toBe('Working');
  expect(step(newer,{tag:'ReactionEnded',attempt:1,threadId:thread().id,runId:'r' as NonNullable<Thread['runId']>}).state).toBe(newer);
 });
 it('closes a pending audit once and rejects stale details',()=>{
  const s=live([thread({pending:pending()})]);
  const input:Input={tag:'ThreadUpdated',attempt:1,sequence:1,thread:thread()};
  const first=step(s,input);expect(first.commands.filter(c=>c.tag==='Audit')).toHaveLength(1);
  expect(step(first.state,input).commands).toEqual([]);
  expect(step(first.state,{tag:'DetailLoaded',attempt:1,detail:{requestId:pending().id,threadId:thread().id,text:'old',reason:'',kind:'approval'}}).state).toBe(first.state);
 });
 it('reconnect uses a new attempt and preserves the cursor',()=>{
  const s=step(live(),{tag:'Closed',attempt:1,jitter:0}).state;
  const retried=step(s,{tag:'Retry',attempt:1}).state;
  expect(retried.connection).toMatchObject({tag:'Connecting',attempt:2});
  expect(step(retried,{tag:'Snapshot',attempt:1,sequence:999,projects:[],threads:[]}).state).toBe(retried);
  expect(step(retried,{tag:'ServerChecked',attempt:2,compatible:true}).commands).toContainEqual({tag:'Connect',attempt:2,baseUrl:'http://localhost:3774',afterSequence:0});
 });
 it('details retry at most three times; OpenThread only opens a known thread',()=>{
  const s=live([thread({pending:pending()})]);
  for(let retry=0;retry<4;retry++)expect(step(s,{tag:'DetailFailed',attempt:1,threadId:thread().id,requestId:pending().id,retry}).commands.filter(c=>c.tag==='Schedule')).toHaveLength(retry<3?1:0);
  expect(step(s,{tag:'OpenThread',threadId:thread().id}).commands.some(c=>c.tag==='Open')).toBe(true);
  expect(step(s,{tag:'OpenThread',threadId:'unknown' as Thread['id']}).commands).toEqual([]);
 });
 it('focuses oldest blocking request; asynchronous questions do not force focus',()=>{
  const s=live([thread({pending:{...pending(),createdAt:2}}),thread({id:'second' as Thread['id'],pending:{...pending(),id:'b' as ReturnType<typeof pending>['id'],createdAt:0,blocking:false}})]);
  expect(s.focus).toBe('a');
 });
 it('sequenceIsMonotonic, staleResultsAreIgnored, stepIsDeterministic',()=>{
  fc.assert(fc.property(fc.array(fc.integer({min:0,max:10000})),numbers=>{
   let s=live([thread()]);
   for(const sequence of numbers){
    const input:Input={tag:'ThreadUpdated',attempt:1,sequence,thread:thread({phase:sequence%2?'completed':'running'})};
    const result=step(s,input);expect(result.state.sequence).toBeGreaterThanOrEqual(s.sequence);expect(step(s,input)).toEqual(result);
    expect(step(s,{...input,attempt:100}).state).toBe(s);s=result.state;
   }
  }));
 });
 it('needsYouWins, quietSuppressesNoise, fallback never exposes decision commands',()=>{
  fc.assert(fc.property(fc.boolean(),fc.boolean(),(quiet,hidden)=>{
   const s:State={...live([thread({pending:pending()})]),quiet,hidden};
   expect(presence(s)).toBe(hidden?'Hidden':'NeedsYou');
   const result=step(s,{tag:'ThreadUpdated',attempt:1,sequence:1,thread:thread({phase:'completed',pending:pending()})});
   for(const command of result.commands){expect(command.tag).not.toBe('SendDecision');if(command.tag==='Reaction')expect(command.quiet).toBe(quiet);}
  }));
 });
 it('quiet timer applies only to the matching active run',()=>{
  const s=live([thread()]);
  expect(presence(step(s,{tag:'QuietDue',attempt:1,threadId:thread().id,runId:'r' as NonNullable<Thread['runId']>}).state)).toBe('Thinking');
 });
});

it('live replacement snapshots retain Live and refresh pending details without reactions',()=>{
 const result=step(live(),{tag:'Snapshot',attempt:1,sequence:2,projects:[],threads:[thread({pending:pending()})]});
 expect(result.state.connection.tag).toBe('Live');expect(result.commands.some(c=>c.tag==='LoadDetail')).toBe(true);expect(result.commands.some(c=>c.tag==='Reaction')).toBe(false);
});
