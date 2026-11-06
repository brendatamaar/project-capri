import {initial,type State,type Input,type Detail,type ThreadId} from '../../core/agent/model';
import {step,presence} from '../../core/agent/step';
import type {SecureStore,AuditLog,Scheduler,PanelPort,CharacterPort,AgentRpc} from './ports';
import type {BoardView} from '../../shared/agent';
export function boardView(s:State,warning:string|null):BoardView {
  return {demo:false,connection:s.connection.tag,server:'baseUrl' in s.connection?s.connection.baseUrl:null,reason:'reason' in s.connection?s.connection.reason:null,warning,sequence:s.sequence,presence:presence(s),quiet:s.quiet,
    threads:s.threads.map(t=>{const d=s.details.find(d=>d.requestId===t.pending?.id);return {id:t.id,project:s.projects.find(p=>p.id===t.projectId)?.title??'Unknown project',title:t.title,provider:t.provider,mode:t.mode,phase:t.phase,error:t.error,summary:t.summary,pending:t.pending?{id:t.pending.id,kind:t.pending.kind,blocking:t.pending.blocking,text:d?.text??null,reason:d?.reason??null,focused:s.focus===t.pending.id}:null};}),limits:s.limits};
}
export function createAgent(deps:{store:SecureStore;audit:AuditLog;scheduler:Scheduler;panel:PanelPort;character:CharacterPort;rpc:AgentRpc;parseDetail:(value:unknown,threadId:string,requestId:string)=>Detail|null;random:()=>number}) {
  let state=initial(),token:string|null=null,baseUrl:string|null=null,warning:string|null=null,controller:AbortController|null=null,stopped=false;
  const current=(attempt:number)=>'attempt' in state.connection&&state.connection.attempt===attempt;
  const render=()=>{deps.panel.render(state,warning);deps.character.presence(state);};
  const warn=(text:string)=>{warning=text;render();};
  function dispatch(input:Input) {
    if(stopped)return;
    const result=step(state,input);state=result.state;
    for(const command of result.commands) {
      const execute=async()=>{
        switch(command.tag){
          case 'Render':render();return;
          case 'Close':controller?.abort();controller=null;return;
          case 'Forget':token=null;if(state.connection.tag==='Unpaired')baseUrl=null;deps.scheduler.clear();await deps.store.clear();return;
          case 'Exchange': {
            const value=await deps.rpc.pair(command.baseUrl,command.credential).catch(()=>null);
            if(!current(command.attempt))return;
            if(!value){dispatch({tag:'PairFailed',attempt:command.attempt});return;}
            token=value;baseUrl=command.baseUrl;dispatch({tag:'Paired',attempt:command.attempt,baseUrl:command.baseUrl});return;
          }
          case 'Save':if(token&&current(command.attempt)) {const saved=await deps.store.save({baseUrl:command.baseUrl,token});if(!saved)warn('Secure encryption unavailable; pairing is held in memory until exit.');}return;
          case 'CheckServer': {
            try {const compatible=await deps.rpc.check(command.baseUrl);dispatch({tag:'ServerChecked',attempt:command.attempt,compatible});}
            catch {dispatch({tag:'Closed',attempt:command.attempt,jitter:deps.random()});}return;
          }
          case 'Connect': {
            if(!token){dispatch({tag:'AuthFailed',attempt:command.attempt});return;}
            controller?.abort();const active=new AbortController();controller=active;
            try{await deps.rpc.connect(command.baseUrl,token,command.attempt,command.afterSequence,dispatch,active.signal);if(!active.signal.aborted)dispatch({tag:'Closed',attempt:command.attempt,jitter:deps.random()});}
            catch(error){if(!active.signal.aborted)dispatch(error instanceof Error&&error.name==='AuthRejected'?{tag:'AuthFailed',attempt:command.attempt}:{tag:'Closed',attempt:command.attempt,jitter:deps.random()});}return;
          }
          case 'LoadDetail': {
            try{const raw=await deps.rpc.detail(command.threadId,command.requestId);const detail=deps.parseDetail(raw,command.threadId,command.requestId);if(detail)dispatch({tag:'DetailLoaded',attempt:command.attempt,detail});}
            catch{dispatch({tag:'DetailFailed',attempt:command.attempt,threadId:command.threadId,requestId:command.requestId,retry:command.retry});}return;
          }
          case 'Schedule':deps.scheduler.schedule(command.key,command.delay,()=>dispatch(command.input));return;
          case 'Audit':try{await deps.audit.append(command.key,command.outcome);}catch{warn('Local audit could not be saved.');}return;
          case 'Open':if(baseUrl)await deps.rpc.open(baseUrl,command.threadId);return;
          case 'Reaction':if(!state.hidden)deps.character.reaction(command);return;
          default:{const never:never=command;return never;}
        }
      };
      void execute().catch(()=>warn('An adapter operation failed. Connection details and request text are withheld.'));
    }
  }
  return {dispatch,state:()=>state,view:()=>boardView(state,warning),async start(){const generation=state.generation;const saved=await deps.store.load();if(stopped||state.generation!==generation)return;token=saved?.token??null;baseUrl=saved?.baseUrl??null;dispatch({tag:'Started',baseUrl});},stop(){stopped=true;controller?.abort();deps.scheduler.clear();token=null;},open(threadId:string){dispatch({tag:'OpenThread',threadId:threadId as ThreadId});}};
}
