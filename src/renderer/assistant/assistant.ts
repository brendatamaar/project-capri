import './fun';
import './media';
import type {AssistantHost,AssistantView} from '../../shared/assistant';
declare global{interface Window{assistant:AssistantHost}}

const host=window.assistant;
const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const input=(id:string)=>byId<HTMLInputElement>(id).value;
let current:AssistantView|null=null;
let settingsEdited=false;
let lastMessageCount=0;

// Every string from the model, files or tools goes through textContent, never innerHTML.
function el<K extends keyof HTMLElementTagNameMap>(tag:K,className?:string,content?:string):HTMLElementTagNameMap[K]{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(content!==undefined)node.textContent=content;
  return node;
}
function option(value:string,label:string){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
function setBanner(id:string,message:string){const node=byId(id);node.textContent=message;node.hidden=!message;}

async function act(value:unknown){
  try{await host.act(value);setBanner('error','');}
  catch{setBanner('error','Request rejected or unavailable. Check settings, connection and action details.');}
}

const PHASES:Record<string,{label:string;tone:'ok'|'busy'|'warn'}>={
  Idle:{label:'Ready',tone:'ok'},
  Generating:{label:'Thinking…',tone:'busy'},
  RetryWait:{label:'Retrying…',tone:'warn'},
  AwaitingDecision:{label:'Needs your decision',tone:'warn'},
  Executing:{label:'Running action…',tone:'busy'},
};

/* Tabs */
const tabs=[...document.querySelectorAll<HTMLButtonElement>('.tab')];
const panels=[...document.querySelectorAll<HTMLElement>('[data-panel]')];
function showTab(name:string,focus=false){
  for(const tab of tabs){const on=tab.dataset.tab===name;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;if(on&&focus)tab.focus();}
  for(const panel of panels)panel.hidden=panel.dataset.panel!==name;
  if(name==='chat')scrollChat(true);
}
for(const tab of tabs){
  tab.onclick=()=>showTab(tab.dataset.tab!);
  tab.onkeydown=event=>{
    const index=tabs.indexOf(tab);
    const next=event.key==='ArrowRight'?tabs[(index+1)%tabs.length]:event.key==='ArrowLeft'?tabs[(index-1+tabs.length)%tabs.length]:null;
    if(next){event.preventDefault();showTab(next.dataset.tab!,true);}
  };
}
showTab('chat');

/* Chat */
function scrollChat(force:boolean){
  const scroller=byId('chat-scroll');
  if(force||scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<96)scroller.scrollTop=scroller.scrollHeight;
}
function renderMessages(view:AssistantView){
  const messages=byId('messages');
  const scroller=byId('chat-scroll');
  const nearBottom=scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<96;
  if(!view.messages.length){
    const empty=el('div','empty');
    empty.append(el('strong',undefined,'Nothing here yet'),el('span',undefined,'Ask a question, or type /help to see what Capri can do offline.'));
    messages.replaceChildren(empty);
  }else{
    messages.replaceChildren(...view.messages.map(m=>{
      const user=m.role==='user';
      const bubble=el('article',`msg ${user?'user':'assistant'}`);
      bubble.append(el('strong','who',user?'You':'Capri'),el('p',undefined,m.text));
      return bubble;
    }));
  }
  if(nearBottom||view.messages.length>lastMessageCount)scrollChat(true);
  lastMessageCount=view.messages.length;
}
function renderAlerts(view:AssistantView){
  byId('alerts').replaceChildren(
    ...view.reminderAlerts.map(text=>{
      const row=el('div','alert due');
      row.append(el('span','text','Reminder: '+text));
      return row;
    }),
    ...view.reminders.map(r=>{
      const row=el('div','alert');
      const body=el('span','text',r.text);
      body.append(el('span','when',`Scheduled · ${new Date(r.due).toLocaleString()}`));
      const cancel=el('button','btn','Review cancellation');
      cancel.type='button';
      cancel.onclick=()=>void act({tag:'Send',text:'/action '+JSON.stringify({tag:'CancelReminder',id:r.id})});
      row.append(body,cancel);
      return row;
    }),
  );
}

function render(view:AssistantView){
  current=view;
  const phase=PHASES[view.phase]??{label:view.phase,tone:'warn' as const};
  const status=byId('status');
  status.textContent=phase.label;status.dataset.tone=phase.tone;status.title=`Phase: ${view.phase}`;
  byId('privacy').textContent=view.config.kind==='offline'
    ?'Offline · No model requests.'
    :`${view.config.kind} · ${view.config.baseUrl} · ${view.config.cloudConsent?'Cloud context disclosure enabled':'Loopback endpoint (verify the server does not proxy to cloud)'} · ${view.hasKey?'Key set':'No API key'}`;
  setBanner('warning',view.warning);

  if(!settingsEdited){
    byId<HTMLSelectElement>('kind').value=view.config.kind;
    byId<HTMLInputElement>('url').value=view.config.baseUrl;
    byId<HTMLInputElement>('model').value=view.config.model;
    byId<HTMLInputElement>('cloud').checked=view.config.cloudConsent;
    byId<HTMLInputElement>('small').checked=view.config.smallContext;
  }
  byId('context').textContent=view.context.map(d=>`${d.name}: ${d.source}${d.reason?' ('+d.reason+')':''}`).join(' · ');
  byId('search-folder').textContent=view.searchFolder??'No search folder selected.';
  byId('operation-status').textContent=view.operationsPaired?'Operations paired for this session.':'Operations not paired.';

  const project=byId<HTMLSelectElement>('project'),selectedProject=project.value;
  project.replaceChildren(...view.targets.projects.map(p=>option(p.id,p.title)));
  if([...project.options].some(o=>o.value===selectedProject))project.value=selectedProject;
  const thread=byId<HTMLSelectElement>('thread'),selectedThread=thread.value;
  thread.replaceChildren(...view.targets.threads.filter(t=>t.runId).map(t=>option(t.id,`${t.provider} · ${t.title}`)));
  if([...thread.options].some(o=>o.value===selectedThread))thread.value=selectedThread;

  byId('request').hidden=!view.pending;
  byId('exact').textContent=view.pendingDescription;
  byId<HTMLButtonElement>('approve').disabled=!view.canApprove;
  byId<HTMLButtonElement>('deny').disabled=!view.canApprove;
  byId<HTMLButtonElement>('send').disabled=view.phase!=='Idle';

  renderMessages(view);
  byId('draft').textContent=view.draft;
  byId('result').textContent=view.result;
  renderAlerts(view);
  document.body.dataset.ready='true';
}

/* A persistent indicator so a live microphone or screen watch is never hidden behind another tab. */
const mediaStatus=byId('media-status');
new MutationObserver(()=>{
  const text=mediaStatus.textContent??'';
  const parts=[text.includes('MICROPHONE ON')?'● Microphone on':'',text.includes('SCREEN WATCHING')?'● Watching screen':''].filter(Boolean);
  const live=byId('live');live.textContent=parts.join(' · ');live.hidden=!parts.length;
  mediaStatus.classList.toggle('active',parts.length>0||(text!==''&&!text.startsWith('Idle')));
}).observe(mediaStatus,{childList:true,characterData:true,subtree:true});

/* Handlers */
byId('settings').addEventListener('input',()=>{settingsEdited=true;});
byId('settings').onsubmit=async event=>{
  event.preventDefault();
  const key=input('key');byId<HTMLInputElement>('key').value='';
  await act({tag:'Configure',key,config:{kind:input('kind'),baseUrl:input('url'),model:input('model'),cloudConsent:byId<HTMLInputElement>('cloud').checked,smallContext:byId<HTMLInputElement>('small').checked}});
  settingsEdited=false;render(await host.view());
};
byId('chat').onsubmit=async event=>{
  event.preventDefault();
  const text=input('message');
  byId<HTMLTextAreaElement>('message').value='';
  await act({tag:'Send',text});
  byId('message').focus();
};
byId('message').onkeydown=event=>{
  if(event.key!=='Enter'||event.shiftKey||event.isComposing)return;
  event.preventDefault();
  const form=byId<HTMLFormElement>('chat');
  if(!byId<HTMLButtonElement>('send').disabled&&form.checkValidity())form.requestSubmit();
};
byId('stop').onclick=()=>void act({tag:'Stop'});
byId('help').onclick=()=>void act({tag:'Send',text:'/help'});
byId('approve').onclick=()=>{if(current)void act({tag:'Decide',runId:current.runId,approve:true});};
byId('deny').onclick=()=>{if(current)void act({tag:'Decide',runId:current.runId,approve:false});};
byId('forget').onclick=()=>{settingsEdited=false;void act({tag:'ForgetProvider'});};
byId('folder').onclick=()=>void act({tag:'ChooseSearchFolder'});
byId('clear').onclick=()=>{byId('clear-confirm').hidden=false;};
byId('clear-no').onclick=()=>{byId('clear-confirm').hidden=true;};
byId('clear-yes').onclick=()=>{byId('clear-confirm').hidden=true;void act({tag:'ClearTranscript'});};
byId('operations').onsubmit=async event=>{
  event.preventDefault();
  const credential=input('t3-code');byId<HTMLInputElement>('t3-code').value='';
  await act({tag:'PairOperations',baseUrl:input('t3-origin'),credential});
};
byId('forget-operations').onclick=()=>void act({tag:'ForgetOperations'});
byId('start-thread').onsubmit=async event=>{
  event.preventDefault();
  await act({tag:'Send',text:'/action '+JSON.stringify({tag:'StartThread',projectId:input('project'),provider:input('provider'),model:input('thread-model'),title:input('thread-title'),prompt:input('thread-prompt')})});
};
byId('steer').onsubmit=async event=>{
  event.preventDefault();
  const t=current?.targets.threads.find(t=>t.id===input('thread'));
  if(t?.runId)await act({tag:'Send',text:'/action '+JSON.stringify({tag:'SteerThread',projectId:t.projectId,provider:t.provider,threadId:t.id,runId:t.runId,text:input('steer-text')})});
};
// media.ts fills the draft; jump back to the chat so the user can edit and send it.
byId('use-transcript').addEventListener('click',()=>{showTab('chat');byId('message').focus();});

host.onView(render);
void host.view().then(render).catch(()=>setBanner('error','Assistant unavailable. Restart Capri.'));
