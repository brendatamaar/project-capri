import {initial, type State, type Input, type Command, type Presence, type Thread} from './model';
const active = (t: Thread) => ['preparing','starting','running','queued'].includes(t.phase);
export function presence(s: State): Presence {
  if(s.hidden) return 'Hidden';
  if(s.connection.tag !== 'Live') return 'Asleep';
  if(s.threads.some(t=>t.pending?.blocking)) return 'NeedsYou';
  if(s.holds.some(h=>h.kind==='Failed')) return 'Failed';
  if(s.holds.some(h=>h.kind==='Done')) return 'Done';
  if(s.threads.some(t=>active(t)&&t.runId&&!s.thinking.includes(t.runId))) return 'Working';
  if(s.threads.some(active)) return 'Thinking';
  return 'Idle';
}
export function step(before: State, input: Input): {state: State; commands: Command[]} {
  let s=before; const commands: Command[]=[];
  const live = () => s.connection.tag==='Live';
  const attempt = 'attempt' in s.connection ? s.connection.attempt : -1;
  if('attempt' in input && input.attempt!==attempt) return {state:s,commands};
  const request = (thread: Thread, retry=0): Command|null => thread.pending ? {tag:'LoadDetail',attempt,threadId:thread.id,requestId:thread.pending.id,retry}:null;
  const scheduleQuiet = (thread: Thread) => {
    if(active(thread)&&thread.runId) commands.push({tag:'Schedule',key:`quiet:${thread.id}`,delay:15000,input:{tag:'QuietDue',attempt,threadId:thread.id,runId:thread.runId}});
  };
  switch(input.tag) {
    case 'Started':
      if(before.generation!==0) break;
      s={...initial(),generation:1,connection:input.baseUrl?{tag:'Connecting',attempt:1,baseUrl:input.baseUrl,failures:0}:{tag:'Unpaired'}};
      if(input.baseUrl) commands.push({tag:'CheckServer',attempt:1,baseUrl:input.baseUrl}); break;
    case 'Pair': {
      const next=s.generation+1;
      s={...initial(),generation:next,panelVisible:s.panelVisible,hidden:s.hidden,quiet:s.quiet,connection:{tag:'Pairing',attempt:next,baseUrl:input.baseUrl}};
      commands.push({tag:'Close'},{tag:'Exchange',attempt:next,baseUrl:input.baseUrl,credential:input.credential}); break;
    }
    case 'Paired':
      if(s.connection.tag!=='Pairing')break;
      s={...s,connection:{tag:'Connecting',attempt,baseUrl:input.baseUrl,failures:0}};
      commands.push({tag:'Save',attempt,baseUrl:input.baseUrl},{tag:'CheckServer',attempt,baseUrl:input.baseUrl});break;
    case 'PairFailed':
      if(s.connection.tag!=='Pairing')break;
      s={...s,connection:{tag:'AuthRejected',reason:'Pairing failed or code possibly consumed. Create a new code.'}};commands.push({tag:'Forget'});break;
    case 'ServerChecked':
      if(s.connection.tag!=='Connecting')break;
      if(input.compatible) commands.push({tag:'Connect',attempt,baseUrl:s.connection.baseUrl,afterSequence:s.sequence});
      else s={...s,connection:{tag:'Incompatible',reason:'Requires T3Code 0.1.7, orchestration protocol 2'}};break;
    case 'Opened':
      if(s.connection.tag==='Connecting')s={...s,connection:{...s.connection,tag:'Syncing'}};break;
    case 'Closed':
      if(!['Connecting','Syncing','Live'].includes(s.connection.tag)||!('failures' in s.connection))break;
      s={...s,connection:{...s.connection,tag:'Backoff',failures:s.connection.failures+1}};
      commands.push({tag:'Close'},{tag:'Schedule',key:'reconnect',delay:Math.min(300000,1000*2**Math.min(9,s.connection.tag==='Backoff'?s.connection.failures-1:0))*(0.5+Math.max(0,Math.min(1,input.jitter))*0.5),input:{tag:'Retry',attempt}});break;
    case 'Retry':
      if(s.connection.tag!=='Backoff')break;
      s={...s,generation:s.generation+1,connection:{...s.connection,tag:'Connecting',attempt:s.generation+1}};
      commands.push({tag:'CheckServer',attempt:s.generation,baseUrl:s.connection.tag==='Connecting'?s.connection.baseUrl:''});break;
    case 'AuthFailed':
      s={...s,generation:s.generation+1,connection:{tag:'AuthRejected',reason:'Credential expired, revoked, or missing scope'}};commands.push({tag:'Close'},{tag:'Forget'});break;
    case 'Snapshot':
      if(!['Syncing','Live'].includes(s.connection.tag)||input.sequence<s.sequence)break;
      {
        const wasLive=live();
        for(const t of s.threads)if(t.pending&&!input.threads.some(n=>n.pending?.id===t.pending!.id))commands.push({tag:'Audit',key:`${t.pending.id}:closed`,outcome:'closed'});
        for(const t of input.threads)if(t.pending&&!s.threads.some(old=>old.pending?.id===t.pending!.id))commands.push({tag:'Audit',key:`${t.pending.id}:detected`,outcome:'detected'});
        s={...s,sequence:input.sequence,projects:input.projects,threads:input.threads,holds:[],thinking:[],details:[],connection:{...(s.connection as Extract<State['connection'],{failures:number}>),tag:wasLive?'Live':'Syncing'}};
        if(wasLive)for(const t of s.threads){const c=request(t);if(c)commands.push(c);scheduleQuiet(t);}
      }break;
    case 'Synchronized':
      if(s.connection.tag!=='Syncing')break;
      s={...s,connection:{...s.connection,tag:'Live',failures:0}};
      for(const t of s.threads) {const c=request(t);if(c)commands.push(c);scheduleQuiet(t);}break;
    case 'ThreadUpdated': {
      if(!['Syncing','Live'].includes(s.connection.tag)||input.sequence<=s.sequence)break;
      const old=s.threads.find(t=>t.id===input.thread.id), t=input.thread;
      const sameRun=old?.runId===t.runId;const activityChanged=!sameRun||old?.summary!==t.summary;
      s={...s,sequence:input.sequence,threads:[...s.threads.filter(v=>v.id!==t.id),t],thinking:!activityChanged?s.thinking:s.thinking.filter(id=>id!==old?.runId),holds:s.holds.filter(h=>h.threadId!==t.id||h.runId===t.runId)};
      if(old?.pending&&old.pending.id!==t.pending?.id)commands.push({tag:'Audit',key:`${old.pending.id}:closed`,outcome:'closed'});
      if(t.pending&&old?.pending?.id!==t.pending.id) {
        commands.push({tag:'Audit',key:`${t.pending.id}:detected`,outcome:'detected'});
        if(live()){const c=request(t);if(c)commands.push(c);if(t.runId)commands.push({tag:'Reaction',threadId:t.id,runId:t.runId,kind:'NeedsYou',quiet:s.quiet});}
      }
      if(live()&&old&&t.runId&&old.phase!==t.phase) {
        const kind=t.phase==='completed'?'Done':t.phase==='failed'?'Failed':active(t)?'Working':null;
        if(kind){commands.push({tag:'Reaction',threadId:t.id,runId:t.runId,kind,quiet:s.quiet});if(kind==='Done'||kind==='Failed'){
          s={...s,holds:[...s.holds.filter(h=>h.threadId!==t.id),{threadId:t.id,runId:t.runId,kind}]};
          commands.push({tag:'Schedule',key:`reaction:${t.id}`,delay:5000,input:{tag:'ReactionEnded',attempt,threadId:t.id,runId:t.runId}});
        }}
      }
      if(activityChanged)scheduleQuiet(t);
      break;
    }
    case 'ThreadRemoved': {
      if(!['Syncing','Live'].includes(s.connection.tag)||input.sequence<=s.sequence)break;
      const removed=s.threads.find(t=>t.id===input.threadId);
      if(removed?.pending)commands.push({tag:'Audit',key:`${removed.pending.id}:closed`,outcome:'closed'});
      s={...s,sequence:input.sequence,threads:s.threads.filter(t=>t.id!==input.threadId)};break;
    }
    case 'ProjectUpdated':
      if(!['Syncing','Live'].includes(s.connection.tag)||input.sequence<=s.sequence)break;
      s={...s,sequence:input.sequence,projects:[...s.projects.filter(p=>p.id!==input.project.id),input.project]};break;
    case 'ProjectRemoved':
      if(!['Syncing','Live'].includes(s.connection.tag)||input.sequence<=s.sequence)break;
      s={...s,sequence:input.sequence,projects:s.projects.filter(p=>p.id!==input.projectId)};break;
    case 'DetailLoaded':
      if(!live()||!s.threads.some(t=>t.id===input.detail.threadId&&t.pending?.id===input.detail.requestId))break;
      s={...s,details:[...s.details.filter(d=>d.requestId!==input.detail.requestId),input.detail]};break;
    case 'DetailFailed':
      if(!live()||input.retry>=3||!s.threads.some(t=>t.id===input.threadId&&t.pending?.id===input.requestId))break;
      commands.push({tag:'Schedule',key:`detail:${input.requestId}`,delay:1000*2**input.retry,input:{...input,tag:'DetailRetry',retry:input.retry+1}});break;
    case 'DetailRetry':
      if(live()&&s.threads.some(t=>t.id===input.threadId&&t.pending?.id===input.requestId))commands.push({tag:'LoadDetail',attempt,threadId:input.threadId,requestId:input.requestId,retry:input.retry});break;
    case 'Limits': if(live()||s.connection.tag==='Syncing')s={...s,limits:input.limits};break;
    case 'QuietDue':
      if(live()&&s.threads.some(t=>t.id===input.threadId&&t.runId===input.runId&&active(t)))s={...s,thinking:[...s.thinking.filter(r=>r!==input.runId),input.runId]};break;
    case 'ReactionEnded':
      if(s.threads.some(t=>t.id===input.threadId&&t.runId===input.runId))s={...s,holds:s.holds.filter(h=>h.threadId!==input.threadId||h.runId!==input.runId)};break;
    case 'Ui':s={...s,panelVisible:input.visible,hidden:input.hidden,quiet:input.quiet};break;
    case 'OpenThread': {
      const t=s.threads.find(t=>t.id===input.threadId);if(!t)break;
      commands.push({tag:'Open',threadId:t.id});if(t.pending)commands.push({tag:'Audit',key:`${t.pending.id}:opened`,outcome:'opened'});break;
    }
    case 'Disconnect':s={...initial(),generation:s.generation+1,panelVisible:s.panelVisible,quiet:s.quiet,hidden:s.hidden};commands.push({tag:'Close'},{tag:'Forget'});break;
    default: {const never:never=input;return never;}
  }
  if(s!==before) {
    const pending=s.threads.flatMap(t=>t.pending?.blocking?[t.pending]:[]).sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id));
    s={...s,focus:pending[0]?.id??null,details:s.details.filter(d=>s.threads.some(t=>t.pending?.id===d.requestId))};commands.push({tag:'Render'});
  }
  return {state:s,commands};
}
export function run(inputs: readonly Input[], state=initial()) {const commands:Command[]=[];for(const i of inputs){const result=step(state,i);state=result.state;commands.push(...result.commands);}return {state,commands};}
