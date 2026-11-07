import {type State,type Input,type Command,type Message} from './model';
export function step(state:State,input:Input):{state:State;commands:readonly Command[]}{
 const none=()=>({state,commands:[] as Command[]});
 const out=(next:State,commands:Command[]=[])=>({state:next,commands});
 const active='runId' in input&&input.runId===state.runId;
 const generating=active&&'attempt' in input&&input.attempt===state.attempt&&state.phase==='Generating';
 const stop=(message:string)=>out({...state,phase:'Idle',pending:null,thinking:false,result:message},[{tag:'Abort'}]);
 const generation=(s:State):Command[]=>[{tag:'Generate',runId:s.runId,attempt:s.attempt,messages:s.messages},{tag:'Schedule',key:'stall',delay:30000,input:{tag:'StallDue',runId:s.runId,attempt:s.attempt,revision:s.revision}},{tag:'Schedule',key:'deadline',delay:120000,input:{tag:'Deadline',runId:s.runId,attempt:s.attempt}}];
 const save=(s:State,text:string):Command=>({tag:'SaveExchange',runId:s.runId,user:[...s.messages].reverse().find(m=>m.role==='user')?.text??'',assistant:text});
 switch(input.tag){
  case 'Submit':case 'Offline':{
   if(input.runId<=state.runId||state.phase!=='Idle'||state.blocked)return none();
   const messages:Message[]=[...state.messages,{role:'user' as const,text:input.text}].slice(-40);
   const next:State={...state,runId:input.runId,attempt:0,revision:0,draft:'',pending:null,result:'',thinking:false,messages,phase:input.tag==='Submit'?'Generating':input.action?'AwaitingDecision':'Idle'};
   if(input.tag==='Submit')return out(next,generation(next));
   next.pending=input.action;next.result=input.reply;
   if(input.reply)next.messages=[...messages,{role:'assistant' as const,text:input.reply}].slice(-40);
   return out(next,input.action?[{tag:'Schedule',key:'decision',delay:60000,input:{tag:'DecisionExpired',runId:next.runId}}]:[save(next,input.reply)]);
  }
  case 'Chunk':{
   if(!generating)return none();const revision=state.revision+1;
   return out({...state,draft:(state.draft+input.text).slice(0,16000),revision,thinking:false},[{tag:'Schedule',key:'stall',delay:30000,input:{tag:'StallDue',runId:state.runId,attempt:state.attempt,revision}}]);
  }
  case 'Completed':{
   if(!generating)return none();const pending=state.visible&&!state.blocked?input.action:null;
   const draft=state.draft|| (input.action?'Action proposed for review.':'The provider returned no text.');
   const next:State={...state,phase:pending?'AwaitingDecision':'Idle',thinking:false,pending,draft:'',messages:[...state.messages,{role:'assistant' as const,text:draft}].slice(-40),result:input.action&&!pending?'Proposal cancelled because the panel was hidden or blocked.':''};
   return out(next,[{tag:'Abort'},save(state,draft),...(pending?[{tag:'Schedule' as const,key:'decision' as const,delay:60000,input:{tag:'DecisionExpired' as const,runId:state.runId}}]:[])]);
  }
  case 'Failed':
   if(!generating)return none();
   if(input.transient&&!state.draft&&state.attempt<2)return out({...state,phase:'RetryWait'},[{tag:'Abort'},{tag:'Schedule',key:'retry',delay:1000*(state.attempt+1),input:{tag:'RetryDue',runId:state.runId,attempt:state.attempt}}]);
   return stop(state.draft?'Provider failed after partial output. Nothing was executed.':'Provider unavailable. Use offline commands or retry manually.');
  case 'RetryDue':{
   if(!active||state.phase!=='RetryWait'||input.attempt!==state.attempt)return none();const next={...state,phase:'Generating' as const,attempt:state.attempt+1,revision:0};return out(next,generation(next));
  }
  case 'StallDue':if(!generating||input.revision!==state.revision)return none();return stop('Provider stalled for 30 seconds. Nothing was executed.');
  case 'Deadline':if(!generating)return none();return stop('Provider timed out. Nothing was executed.');
  case 'ActionDeadline':if(!active||state.phase!=='Executing')return none();return stop('Action timed out. It may already have completed; inspect the result before trying again.');
  case 'DecisionExpired':if(!active||state.phase!=='AwaitingDecision')return none();return stop('Action confirmation expired. Nothing was executed.');
  case 'Decide':
   if(!active||state.phase!=='AwaitingDecision'||!state.visible||state.blocked||!state.pending)return none();
   if(!input.approve){const denied=stop('Action denied.');return out(denied.state,[...denied.commands,{tag:'AuditDecision',runId:state.runId,approve:false}]);}
   return out({...state,phase:'Executing',pending:null,result:'Executing confirmed action.'},[{tag:'Abort'},{tag:'AuditDecision',runId:state.runId,approve:true},{tag:'Execute',runId:state.runId,action:state.pending},{tag:'Schedule',key:'action',delay:30000,input:{tag:'ActionDeadline',runId:state.runId}}]);
  case 'ActionFinished':{
   if(!active||state.phase!=='Executing')return none();const text=input.text.slice(0,12000);return out({...state,phase:'Idle',result:text,messages:[...state.messages,{role:'assistant' as const,text}].slice(-40)},[{tag:'Abort'},save(state,text)]);
  }
  case 'Ui':{
   const next={...state,visible:input.visible,blocked:input.blocked};
   if((!input.visible||input.blocked)&&['AwaitingDecision','Executing','Generating','RetryWait'].includes(state.phase))return out({...next,phase:'Idle',pending:null,result:state.phase==='Executing'?'Stopped. An action already accepted may have completed.':'Stopped because the assistant is hidden or blocked.'},[{tag:'Abort'}]);
   return out(next);
  }
  case 'Stop':return stop(state.phase==='Executing'?'Stopped. An action already accepted may have completed.':'Stopped.');
  case 'Clear':return out({...state,phase:'Idle',pending:null,draft:'',messages:[],result:'Conversation cleared.'},[{tag:'Abort'}]);
  default:{const exhaustive:never=input;return exhaustive;}
 }
}
