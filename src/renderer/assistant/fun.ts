import type {FunHost,FunView} from '../../shared/fun';
declare global{interface Window{fun:FunHost}}
const host=window.fun,$=(id:string)=>document.getElementById(id)!;
let current:FunView|null=null,edited=false;
async function act(value:unknown){try{await host.act(value);$('fun-error').textContent='';}catch{$('fun-error').textContent='Fun control unavailable or rejected.';}}
function render(v:FunView){current=v;$('bond-status').textContent=`Bond ${v.settings.bond?'enabled':'off'} · Stage ${v.stage+1}/5 · ${v.xp}/1000 · ${v.mood}`;$('fun-error').textContent=v.warning;$('job-stop').textContent=v.jobStopReady?'Control+Alt+Escape is registered. Escape also stops between native steps.':'Input jobs unavailable: Windows and a registered stop shortcut are required.';
 if(!edited)for(const [key,value] of Object.entries(v.settings))($('fun-'+key) as HTMLInputElement).checked=value;
 const select=$('job-target') as HTMLSelectElement,selected=select.value;select.replaceChildren(...v.targets.map(t=>{const o=document.createElement('option');o.value=t.id;o.textContent=`${t.name} · PID ${t.pid}`;return o;}));if([...select.options].some(o=>o.value===selected))select.value=selected;
 $('mini-player').hidden=!v.settings.miniPlayer;$('song').textContent=v.music?`${v.music.playing?'Playing':'Paused'} · ${v.music.title} · ${v.music.artist}`:'No active Windows media session, or metadata unavailable.';
}
$('fun-settings').addEventListener('input',()=>edited=true);$('fun-settings').onsubmit=async event=>{event.preventDefault();if(!current)return;const settings=Object.fromEntries(Object.keys(current.settings).map(key=>[key,($('fun-'+key) as HTMLInputElement).checked]));await act({tag:'Configure',settings});edited=false;render(await host.view());};
$('stop-fun').onclick=()=>{edited=false;void act({tag:'StopFun'});};$('reset-bond').onclick=()=>{if(confirm('Reset local bond progress to zero?'))void act({tag:'ResetBond'});};
for(const [id,kind] of [['fun-rival','Rival'],['fun-chaos','Insult'],['fun-calm','Apology']] as const)$(id).onclick=()=>void act({tag:'Signal',kind});
for(const operation of ['previous','playPause','next'])$('music-'+operation).onclick=()=>void act({tag:'Music',operation});
$('list-job-targets').onclick=()=>void window.assistant.act({tag:'Send',text:'/action '+JSON.stringify({tag:'ListInputTargets'})});
$('input-job').onsubmit=async event=>{event.preventDefault();try{const id=($('job-target') as HTMLSelectElement).value,steps=JSON.parse(($('job-steps') as HTMLTextAreaElement).value);await window.assistant.act({tag:'Send',text:'/action '+JSON.stringify({tag:'InputJob',id,steps})});}catch{$('fun-error').textContent='Invalid job. Use a listed target and 1–20 allowed steps.';}};
host.onView(render);void host.view().then(render);
