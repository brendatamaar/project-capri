import {createAgentPanel} from '../windows/agent-panel';
import {memorySecureStore} from './stores';
import type {AgentRpc} from './ports';
import type {Thread,ThreadId,RequestId,RunId,Detail} from '../../core/agent/model';
import type {createCompanion} from '../windows/overlay';
export async function agentSmoke(companion:Awaited<ReturnType<typeof createCompanion>>) {
 await companion.window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const check=()=>document.body.dataset.ready==='true'?resolve(true):document.body.dataset.ready==='failed'?reject(Error('Overlay failed')):setTimeout(check,25);check();})`);
 const store=memorySecureStore();await store.save({baseUrl:'http://127.0.0.1:3774',token:'fixture-bearer-never-expose'});
 const threads:Thread[]=['claude','codex','antigravity','muse'].map((provider,i)=>({id:`thread-${i}` as ThreadId,projectId:'fixture-project',title:`${provider} fixture`,provider,mode:'approval-required',phase:i===0?'waiting':'running',runId:`run-${i}` as RunId,error:null,summary:'Synthetic activity',pending:i===0?{id:'request-fixture' as RequestId,kind:'command',blocking:true,createdAt:1}:null}));
 let opened:string|null=null;
 const rpc:AgentRpc={check:async()=>true,pair:async()=>{throw new Error('No real pairing in smoke');},connect:async(_url,_token,attempt,_sequence,emit,signal)=>{
  emit({tag:'Opened',attempt});emit({tag:'Snapshot',attempt,sequence:1,projects:[{id:'fixture-project',title:'Original test project'}],threads});emit({tag:'Synchronized',attempt});await new Promise<void>(resolve=>signal.addEventListener('abort',()=>resolve(),{once:true}));
 },detail:async(threadId,requestId)=>({threadId,requestId,text:'<img src=x onerror="window.injected=true"> exact request',reason:'Original synthetic reason',kind:'command'}),open:async(_url,threadId)=>{opened=threadId;}};
 const board=await createAgentPanel(companion,{rpc,store,parseDetail:value=>value as Detail});
 await board.panel.webContents.executeJavaScript(`new Promise(resolve=>{const check=()=>document.querySelector('#approval pre')?resolve(true):setTimeout(check,25);check();})`);
 await board.panel.webContents.executeJavaScript(`(async()=>{
  const view=await window.agents.view();
  if(view.threads.length!==4||view.connection!=='Live')throw Error('Provider board incomplete');
  if(JSON.stringify(view).includes('fixture-bearer-never-expose'))throw Error('Token exposed');
  if(document.querySelector('#approval img')||window.injected)throw Error('Untrusted text executed');
  if(!document.querySelector('#approval pre').textContent.includes('<img'))throw Error('Exact request lost');
  const actions=[...document.querySelectorAll('#approval button')];if(!actions.filter(b=>b.textContent==='Approve'||b.textContent==='Deny').every(b=>b.disabled))throw Error('Fallback decision enabled');
  let rejected=false;try{await window.agents.act({tag:'Approve',requestId:'request-fixture'})}catch{rejected=true;}if(!rejected)throw Error('Decision IPC accepted');
  await window.agents.act({tag:'OpenThread',threadId:'thread-0'});
  await window.agents.act({tag:'Quiet',quiet:true});
 })()`);
 if(opened!=='thread-0')throw new Error('Wrong thread opened');
 board.panel.hide();if(board.agent.state().focus!=='request-fixture')throw new Error('Hide erased approval');
 board.agent.dispatch({tag:'Closed',attempt:1,jitter:0});board.agent.dispatch({tag:'Retry',attempt:1});
 await board.panel.webContents.executeJavaScript(`new Promise(resolve=>{const check=async()=>{if((await window.agents.view()).connection==='Live')resolve(true);else setTimeout(check,25);};check();})`);
 if(!board.agent.state().quiet)throw new Error('Quiet lost across reconnect');
 board.agent.dispatch({tag:'ThreadUpdated',attempt:1,sequence:99,thread:{...threads[0]!,title:'stale'}});
 if(board.agent.state().sequence!==1)throw new Error('Stale connection accepted');
 companion.receive({fg:0,fullscreen:true,wins:[]});if(board.panel.isVisible()||!board.agent.state().hidden)throw new Error('Fullscreen did not hide panel');
 companion.receive({fg:0,fullscreen:false,wins:[]});
 await companion.window.webContents.executeJavaScript(`(async()=>{
  const {capri,receive,processAgentReaction}=window.__companionTest;
  receive({tag:'hidden',hidden:false});capri.busy=false;capri.setHidden(false);capri.motionActive=false;
  void capri.perform('victory');const signature=capri.act;if(!signature)throw Error('Signature fixture did not start');
  receive({tag:'agentReaction',kind:'Failed'});processAgentReaction();
  if(capri.act!==signature)throw Error('Agent interrupted signature');
  capri.endAct(false);processAgentReaction();
  if(capri.act?.player.name!=='flinch')throw Error('Failure reaction missing');
  capri.endAct(false);receive({tag:'agent',active:true,presence:'Working',caption:'Synthetic work'});processAgentReaction();if(capri.mode!=='work')throw Error('Working presence not applied');receive({tag:'settings',settings:{...await window.companion.settings(),motion:'reduced'}});receive({tag:'agentReaction',kind:'Done'});processAgentReaction();if(capri.act?.player.name!=='look')throw Error('Reduced-motion reaction missing');
 })()`);
 board.agent.stop();console.log('AGENT_SMOKE_OK:board-threadonly-exact-text-ipc-hide-quiet-reconnect');
}
