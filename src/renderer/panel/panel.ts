import type {AgentHost,BoardView} from '../../shared/agent';
declare global{interface Window{agents:AgentHost}}
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const host=window.agents;
let current:BoardView|null=null;
let sending=false;
const text=(tag:string,value:string,className?:string)=>{const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;};
async function act(value:unknown){try{await host.act(value);$('error').textContent='';}catch{$('error').textContent='Action failed. Check the connection and try again.';}}
function openButton(id:string){const button=text('button',current?.demo?'Demo thread (offline)':'Open in T3Code') as HTMLButtonElement;button.type='button';button.onclick=()=>void act({tag:'OpenThread',threadId:id});return button;}
function request(t:BoardView['threads'][number]){
 const box=document.createElement('article'),p=t.pending!;
 box.append(text('h3','Response needed'),text('p',`${t.provider} · ${t.project} · ${t.title}`),text('p',`${({ 'approval-required':'Supervised',auto:'Auto','auto-accept-edits':'Auto edits','full-access':'Full access'} as Record<string,string>)[t.mode]??t.mode} · ${p.kind} · ThreadOnly`, 'meta'));
 if(p.text!==null){box.append(text('pre',p.text));if(p.reason)box.append(text('p',p.reason));}
 else box.append(text('p','Exact request details are unavailable here. Open the thread to review the full request.'));
 box.append(text('p','Respond in T3Code. Outside responses have not been verified for this provider.'));
 const buttons=document.createElement('div');buttons.className='actions';buttons.append(openButton(t.id));
 for(const label of ['Deny','Approve']){const b=text('button',label) as HTMLButtonElement;b.disabled=true;b.title='Respond in T3Code';buttons.append(b);}box.append(buttons);return box;
}
function render(view:BoardView){
 current=view;$('notice').textContent=view.demo?'Offline demo · Synthetic events; no commands run.':'Monitoring only · Respond to requests in T3Code.';if(view.server&&document.activeElement!==$('address'))$<HTMLInputElement>('address').value=view.server;$('status').textContent=`${view.connection} · ${view.presence}`;
 $('warning').textContent=[view.warning,view.reason].filter(Boolean).join(' · ');
 $('quiet').textContent=view.quiet?'Quiet: on':'Quiet: off';$('quiet').setAttribute('aria-pressed',String(view.quiet));
 ($('disconnect') as HTMLButtonElement).disabled=view.connection==='Unpaired';
 if(['Unpaired','AuthRejected','Incompatible'].includes(view.connection))($('connection') as HTMLDetailsElement).open=true;
 const focused=view.threads.find(t=>t.pending?.focused),approval=$('approval');approval.replaceChildren();approval.hidden=!focused;
 if(focused)approval.append(request(focused));
 const list=$('threads');list.replaceChildren();
 if(!view.threads.length)list.append(text('p',view.connection==='Live'?'No threads in this T3Code instance.':'Connect to T3Code to see your threads.'));
 for(const t of [...view.threads].sort((a,b)=>Number(Boolean(b.pending))-Number(Boolean(a.pending))||a.title.localeCompare(b.title))){
  const row=document.createElement('article');row.append(text('h3',t.title),text('p',`${t.provider} · ${t.project} · ${({ 'approval-required':'Supervised',auto:'Auto','auto-accept-edits':'Auto edits','full-access':'Full access'} as Record<string,string>)[t.mode]??t.mode} · ${view.connection==='Live'?t.phase:'Status unavailable'}`,'meta'));
  if(t.error)row.append(text('pre',t.error));else if(t.summary)row.append(text('p',t.summary));
  if(t.pending&&!t.pending.focused)row.append(request(t));else row.append(openButton(t.id));list.append(row);
 }
 const limits=$('limits');limits.replaceChildren();
 const providers=[...new Set(['claude','codex','antigravity','muse',...view.limits.map(l=>l.provider),...view.threads.map(t=>t.provider)])];
 for(const provider of providers){const entries=view.limits.filter(l=>l.provider===provider);limits.append(text('p',`${provider}: ${view.connection==='Live'&&entries.length?entries.map(l=>l.remaining===null?'Unavailable':`${l.label}: ${Math.round(l.remaining)}% remaining${l.reset?' · resets '+l.reset:''}`).join(' · '):'Unavailable'}`,'limit'));}
 document.body.dataset.ready='true';
}
$('quiet').onclick=()=>{if(current)void act({tag:'Quiet',quiet:!current.quiet});};
$('disconnect').onclick=()=>void act({tag:'Disconnect'});
$('pair').onsubmit=async event=>{event.preventDefault();if(sending)return;sending=true;($('connect') as HTMLButtonElement).disabled=true;const credential=$<HTMLInputElement>('credential').value;$<HTMLInputElement>('credential').value='';try{await act({tag:'Pair',baseUrl:$<HTMLInputElement>('address').value,credential});}finally{sending=false;($('connect') as HTMLButtonElement).disabled=false;}};
host.onView(render);void host.view().then(render).catch(()=>{$('error').textContent='Agent board unavailable. Restart Capri to retry.';});
