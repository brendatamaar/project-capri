import type {AgentHost,BoardView} from '../../shared/agent';
declare global{interface Window{agents:AgentHost}}

type ThreadView=BoardView['threads'][number];
type Tone='needs'|'working'|'failed'|'idle'|'unknown';

const host=window.agents;
let current:BoardView|null=null;
let previousConnection='';
let sending=false;

const byId=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;

// Every string from the server goes through textContent, never innerHTML.
function el<K extends keyof HTMLElementTagNameMap>(tag:K,className?:string,content?:string):HTMLElementTagNameMap[K]{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(content!==undefined)node.textContent=content;
  return node;
}

const MODES:Record<string,string>={'approval-required':'Supervised',auto:'Auto','auto-accept-edits':'Auto edits','full-access':'Full access'};
const CONNECTION:Record<string,{label:string;tone:'ok'|'busy'|'warn'|'off'}>={
  Live:{label:'Connected',tone:'ok'},
  Unpaired:{label:'Not connected',tone:'off'},
  Pairing:{label:'Pairing…',tone:'busy'},
  Connecting:{label:'Connecting…',tone:'busy'},
  Syncing:{label:'Syncing…',tone:'busy'},
  Backoff:{label:'Reconnecting…',tone:'warn'},
  AuthRejected:{label:'Pairing rejected',tone:'warn'},
  Incompatible:{label:'Incompatible server',tone:'warn'},
};
const PHASES:Record<string,string>={running:'Running',queued:'Queued',starting:'Starting',preparing:'Preparing',waiting:'Waiting',completed:'Done',failed:'Failed'};
const ACTIVE=['preparing','starting','running','queued'];
const GROUPS:{tone:Tone;title:string}[]=[
  {tone:'needs',title:'Needs you'},
  {tone:'working',title:'Working'},
  {tone:'failed',title:'Failed'},
  {tone:'idle',title:'Idle & finished'},
];
const KNOWN_PROVIDERS=['claude','codex','antigravity','muse'];

const capitalize=(value:string)=>value.charAt(0).toUpperCase()+value.slice(1);
const modeLabel=(mode:string)=>MODES[mode]??mode;
const phaseLabel=(phase:string)=>PHASES[phase]??capitalize(phase.replace(/[-_]+/g,' '));
const providerKey=(provider:string)=>{const key=provider.toLowerCase().split(/[^a-z]/)[0]??'';return KNOWN_PROVIDERS.includes(key)?key:'other';};

function toneOf(thread:ThreadView):Tone{
  if(thread.pending)return 'needs';
  if(thread.phase==='failed')return 'failed';
  if(ACTIVE.includes(thread.phase))return 'working';
  return 'idle';
}

async function act(value:unknown){
  try{await host.act(value);byId('error').textContent='';}
  catch{byId('error').textContent='Action failed. Check the connection and try again.';}
}

function badge(provider:string){
  const node=el('span','badge',provider);
  node.dataset.provider=providerKey(provider);
  return node;
}
function chip(label:string,tone:Tone){
  const node=el('span','chip',label);
  node.dataset.tone=tone;
  return node;
}
function openButton(id:string,variant:'primary'|'small'='primary'){
  const button=el('button',variant==='primary'?'btn btn-primary':'btn btn-small',current?.demo?'Demo thread (offline)':'Open in T3Code');
  button.type='button';
  button.onclick=()=>void act({tag:'OpenThread',threadId:id});
  return button;
}

// Exact request text stays visible, per the approval rules; decisions stay in T3Code.
function request(thread:ThreadView){
  const pending=thread.pending!;
  const box=el('article','request');
  box.append(
    el('h3',undefined,'Response needed'),
    el('p','who',`${thread.provider} · ${thread.project} · ${thread.title}`),
    el('p','meta subtle',`${modeLabel(thread.mode)} · ${pending.kind}`),
  );
  if(pending.text!==null){
    box.append(el('pre',undefined,pending.text));
    if(pending.reason)box.append(el('p','meta subtle',pending.reason));
  }else box.append(el('p',undefined,'Exact request details are unavailable here. Open the thread to review the full request.'));
  box.append(el('p','note','Respond in T3Code. Approving from here has not been verified for this provider.'));
  const actions=el('div','actions');
  actions.append(openButton(thread.id),el('span','spacer'));
  for(const label of ['Deny','Approve']){
    const button=el('button','btn',label);
    button.type='button';button.disabled=true;button.title='Respond in T3Code';
    actions.append(button);
  }
  box.append(actions);
  return box;
}

function threadCard(thread:ThreadView,live:boolean){
  const tone:Tone=live?toneOf(thread):'unknown';
  const card=el('article','thread');
  card.dataset.tone=tone;
  const head=el('div','thread-head');
  head.append(badge(thread.provider),el('h3',undefined,thread.title),chip(!live?'Status unavailable':thread.pending?'Needs you':phaseLabel(thread.phase),tone));
  card.append(head,el('p','meta',`${thread.project} · ${modeLabel(thread.mode)}`));
  if(thread.error)card.append(el('pre',undefined,thread.error));
  else if(thread.summary)card.append(el('p','summary',thread.summary));
  if(thread.pending&&!thread.pending.focused)card.append(request(thread));
  else if(thread.pending)card.append(el('p','note','Request shown at the top of the board.'));
  else{const actions=el('div','actions');actions.append(openButton(thread.id,'small'));card.append(actions);}
  return card;
}

function renderStats(view:BoardView,live:boolean){
  const stats=byId('summary');
  stats.replaceChildren();
  stats.hidden=!live;
  if(!live)return;
  const counts:Record<Tone,number>={needs:0,working:0,failed:0,idle:0,unknown:0};
  for(const thread of view.threads)counts[toneOf(thread)]++;
  for(const group of GROUPS){
    const tile=el('div','stat');
    tile.dataset.tone=group.tone;
    if(!counts[group.tone])tile.classList.add('zero');
    tile.append(el('strong',undefined,String(counts[group.tone])),el('span',undefined,group.title));
    stats.append(tile);
  }
}

function renderThreads(view:BoardView,live:boolean){
  const list=byId('threads');
  list.replaceChildren();
  if(!view.threads.length){
    list.append(el('p','empty',live?'No threads in this T3Code instance.':'Connect to T3Code to see your threads.'));
    return;
  }
  const sorted=[...view.threads].sort((a,b)=>a.title.localeCompare(b.title));
  if(!live){
    for(const thread of sorted)list.append(threadCard(thread,false));
    return;
  }
  for(const group of GROUPS){
    const members=sorted.filter(thread=>toneOf(thread)===group.tone);
    if(!members.length)continue;
    const section=el('div','group');
    const title=el('div','group-title');
    title.dataset.tone=group.tone;
    title.append(el('span',undefined,group.title),el('span','count',String(members.length)));
    section.append(title);
    for(const thread of members)section.append(threadCard(thread,true));
    list.append(section);
  }
}

function renderLimits(view:BoardView,live:boolean){
  byId('usage').hidden=view.connection==='Unpaired';
  const limits=byId('limits');
  limits.replaceChildren();
  const providers=[...new Set([...KNOWN_PROVIDERS,...view.limits.map(l=>l.provider),...view.threads.map(t=>t.provider)])];
  for(const provider of providers){
    const card=el('div','provider-card');
    card.append(badge(provider));
    const entries=live?view.limits.filter(l=>l.provider===provider):[];
    if(!entries.length)card.append(el('p','limit-value','Unavailable'));
    for(const entry of entries){
      const row=el('div','limit');
      row.append(el('span','limit-label',entry.label));
      if(entry.remaining===null)row.append(el('span','limit-value','Unavailable'));
      else{
        const percent=Math.max(0,Math.min(100,Math.round(entry.remaining)));
        const bar=el('progress',percent<=15?'low':percent<=40?'mid':'');
        bar.max=100;bar.value=percent;bar.setAttribute('aria-label',`${provider} ${entry.label} remaining`);
        row.append(bar,el('span','limit-value',`${percent}% remaining${entry.reset?` · resets ${entry.reset}`:''}`));
      }
      card.append(row);
    }
    limits.append(card);
  }
}

function render(view:BoardView){
  current=view;
  const live=view.connection==='Live';
  const connection=CONNECTION[view.connection]??{label:view.connection,tone:'off' as const};

  byId('notice').textContent=view.demo?'Offline demo · Synthetic events; no commands run.':'Monitoring only · Respond to requests in T3Code.';
  const status=byId('status');
  status.textContent=connection.label;status.dataset.tone=connection.tone;status.title=`Presence: ${view.presence}`;

  const warning=[view.warning,view.reason].filter(Boolean).join(' · ');
  byId('warning').textContent=warning;byId('warning').hidden=!warning;

  const quiet=byId<HTMLButtonElement>('quiet');
  quiet.textContent=view.quiet?'Quiet: on':'Quiet: off';quiet.setAttribute('aria-pressed',String(view.quiet));
  byId<HTMLButtonElement>('disconnect').hidden=view.connection==='Unpaired';

  if(view.server&&document.activeElement!==byId('address'))byId<HTMLInputElement>('address').value=view.server;
  byId('connection-summary').textContent=live?`Connected to ${view.server??'T3Code'}`:view.connection==='Unpaired'?'Connect to T3Code':`T3Code connection · ${connection.label}`;
  const details=byId<HTMLDetailsElement>('connection');
  if(['Unpaired','AuthRejected','Incompatible'].includes(view.connection))details.open=true;
  else if(live&&previousConnection!=='Live')details.open=false;
  previousConnection=view.connection;

  renderStats(view,live);
  const focused=view.threads.find(t=>t.pending?.focused);
  const approval=byId('approval');
  approval.replaceChildren();approval.hidden=!focused;
  if(focused)approval.append(request(focused));
  renderThreads(view,live);
  renderLimits(view,live);
  document.body.dataset.ready='true';
}

byId('quiet').onclick=()=>{if(current)void act({tag:'Quiet',quiet:!current.quiet});};
byId('disconnect').onclick=()=>void act({tag:'Disconnect'});
byId('pair').onsubmit=async event=>{
  event.preventDefault();
  if(sending)return;
  sending=true;
  const connect=byId<HTMLButtonElement>('connect'),credentialInput=byId<HTMLInputElement>('credential');
  connect.disabled=true;
  const credential=credentialInput.value;
  credentialInput.value='';
  try{await act({tag:'Pair',baseUrl:byId<HTMLInputElement>('address').value,credential});}
  finally{sending=false;connect.disabled=false;}
};
host.onView(render);
void host.view().then(render).catch(()=>{byId('error').textContent='Agent board unavailable. Restart Capri to retry.';});
