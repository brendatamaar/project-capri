import type {AssistantHost,AssistantView} from '../../shared/assistant';
declare global{interface Window{assistant:AssistantHost}}
const host=window.assistant,$=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
let current:AssistantView|null=null,settingsEdited=false;
async function act(value:unknown){try{await host.act(value);$('error').textContent='';}catch{$('error').textContent='Request rejected or unavailable. Check settings, connection and action details.';}}
const input=(id:string)=>$<HTMLInputElement>(id).value;
function option(value:string,label:string){const o=document.createElement('option');o.value=value;o.textContent=label;return o;}
function render(view:AssistantView){
 current=view;$('status').textContent=view.phase;$('privacy').textContent=view.config.kind==='offline'?'Offline · No model requests.':`${view.config.kind} · ${view.config.baseUrl} · ${view.config.cloudConsent?'Cloud context disclosure enabled':'Loopback endpoint (verify the server does not proxy to cloud)'} · ${view.hasKey?'Key set':'No API key'}`;$('warning').textContent=view.warning;
 if(!settingsEdited){$<HTMLSelectElement>('kind').value=view.config.kind;$<HTMLInputElement>('url').value=view.config.baseUrl;$<HTMLInputElement>('model').value=view.config.model;$<HTMLInputElement>('cloud').checked=view.config.cloudConsent;$<HTMLInputElement>('small').checked=view.config.smallContext;}
 $('context').textContent=view.context.map(d=>`${d.name}: ${d.source}${d.reason?' ('+d.reason+')':''}`).join(' · ');$('search-folder').textContent=view.searchFolder??'No search folder selected.';$('operation-status').textContent=view.operationsPaired?'Operations paired for this session.':'Operations not paired.';
 const project=$<HTMLSelectElement>('project'),selected=project.value;project.replaceChildren(...view.targets.projects.map(p=>option(p.id,p.title)));if([...project.options].some(o=>o.value===selected))project.value=selected;
 const thread=$<HTMLSelectElement>('thread'),previous=thread.value;thread.replaceChildren(...view.targets.threads.filter(t=>t.runId).map(t=>option(t.id,`${t.provider} · ${t.title}`)));if([...thread.options].some(o=>o.value===previous))thread.value=previous;
 $('request').hidden=!view.pending;$('exact').textContent=view.pendingDescription;$<HTMLButtonElement>('approve').disabled=!view.canApprove;$<HTMLButtonElement>('deny').disabled=!view.canApprove;$<HTMLButtonElement>('send').disabled=view.phase!=='Idle';
 const messages=$('messages');messages.replaceChildren(...view.messages.map(m=>{const article=document.createElement('article'),name=document.createElement('strong'),body=document.createElement('p');name.textContent=m.role==='user'?'You':'Capri';body.textContent=m.text;article.append(name,body);return article;}));
 $('draft').textContent=view.draft;$('result').textContent=view.result;
 const alerts=$('alerts');alerts.replaceChildren(...view.reminderAlerts.map(text=>{const p=document.createElement('p');p.textContent='Reminder: '+text;return p;}),...view.reminders.map(r=>{const p=document.createElement('p');p.textContent=`Scheduled: ${r.text} · ${new Date(r.due).toLocaleString()}`;const cancel=document.createElement('button');cancel.textContent='Review cancellation';cancel.type='button';cancel.onclick=()=>void act({tag:'Send',text:'/action '+JSON.stringify({tag:'CancelReminder',id:r.id})});p.append(cancel);return p;}));document.body.dataset.ready='true';
}
$('settings').addEventListener('input',()=>{settingsEdited=true;});
$('settings').onsubmit=async event=>{event.preventDefault();const key=input('key');$<HTMLInputElement>('key').value='';await act({tag:'Configure',key,config:{kind:input('kind'),baseUrl:input('url'),model:input('model'),cloudConsent:$<HTMLInputElement>('cloud').checked,smallContext:$<HTMLInputElement>('small').checked}});settingsEdited=false;render(await host.view());};
$('chat').onsubmit=async event=>{event.preventDefault();const text=input('message');$<HTMLTextAreaElement>('message').value='';await act({tag:'Send',text});};
$('stop').onclick=()=>void act({tag:'Stop'});$('help').onclick=()=>void act({tag:'Send',text:'/help'});
$('approve').onclick=()=>{if(current)void act({tag:'Decide',runId:current.runId,approve:true});};$('deny').onclick=()=>{if(current)void act({tag:'Decide',runId:current.runId,approve:false});};
$('forget').onclick=()=>{settingsEdited=false;void act({tag:'ForgetProvider'});};$('folder').onclick=()=>void act({tag:'ChooseSearchFolder'});
$('clear').onclick=()=>{$('clear-confirm').hidden=false;};$('clear-no').onclick=()=>{$('clear-confirm').hidden=true;};$('clear-yes').onclick=()=>{$('clear-confirm').hidden=true;void act({tag:'ClearTranscript'});};
$('operations').onsubmit=async event=>{event.preventDefault();const credential=input('t3-code');$<HTMLInputElement>('t3-code').value='';await act({tag:'PairOperations',baseUrl:input('t3-origin'),credential});};$('forget-operations').onclick=()=>void act({tag:'ForgetOperations'});
$('start-thread').onsubmit=async event=>{event.preventDefault();await act({tag:'Send',text:'/action '+JSON.stringify({tag:'StartThread',projectId:input('project'),provider:input('provider'),model:input('thread-model'),title:input('thread-title'),prompt:input('thread-prompt')})});};
$('steer').onsubmit=async event=>{event.preventDefault();const t=current?.targets.threads.find(t=>t.id===input('thread'));if(t?.runId)await act({tag:'Send',text:'/action '+JSON.stringify({tag:'SteerThread',projectId:t.projectId,provider:t.provider,threadId:t.id,runId:t.runId,text:input('steer-text')})});};
host.onView(render);void host.view().then(render).catch(()=>{$('error').textContent='Assistant unavailable. Restart Capri.';});
