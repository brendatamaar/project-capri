import type {MediaHost,MediaView,MediaConfig} from '../../shared/media';
declare global{interface Window{media:MediaHost}}
const host=window.media,$=(id:string)=>document.getElementById(id)!;
let held=false;
let generation=0,stream:MediaStream|null=null,context:AudioContext|null=null,source:AudioBufferSourceNode|null=null,timer:ReturnType<typeof setTimeout>|undefined,view:MediaView|null=null,edited=false;
async function act(value:unknown){try{await host.act(value);}catch{$('media-warning').textContent='Media request rejected or unavailable.';}}
function stop(){++generation;clearTimeout(timer);source?.stop();source=null;stream?.getTracks().forEach(t=>t.stop());stream=null;void context?.close().catch(()=>{});context=null;$('audio-level').style.width='0%';}
function render(v:MediaView){view=v;$('media-status').textContent=`${v.phase==='Recording'?'● MICROPHONE ON · ':''}${v.phase}${v.watching?' · SCREEN WATCHING ON (30s)':''}`;$('media-warning').textContent=v.warning;$('media-review').textContent=v.review;const img=$('screen-image') as HTMLImageElement;img.hidden=!v.image;if(v.image)img.src=v.image;else img.removeAttribute('src');
 if(!edited){for(const [key,value] of Object.entries(v.config)){const el=document.getElementById('media-'+key) as HTMLInputElement|HTMLSelectElement|null;if(el){if(el instanceof HTMLInputElement&&el.type==='checkbox')el.checked=Boolean(value);else el.value=String(value);}}const select=$('media-display') as HTMLSelectElement;select.replaceChildren(...v.displays.map(d=>{const o=document.createElement('option');o.value=d.id;o.textContent=d.label;return o;}));select.value=v.config.display;}
 ($('watch') as HTMLInputElement).checked=v.watching;
}
host.onView(render);void host.view().then(render);
host.onEvent(async e=>{
 if(e.tag==='Cancel'){stop();return;}stop();const epoch=generation;
 if(e.tag==='Record'){
  try{const captured=await navigator.mediaDevices.getUserMedia({audio:true,video:false});if(epoch!==generation){captured.getTracks().forEach(t=>t.stop());return;}stream=captured;
   const ctx=new AudioContext({sampleRate:16000});context=ctx;await ctx.resume();if(epoch!==generation)return;const input=ctx.createMediaStreamSource(captured),processor=ctx.createScriptProcessor(4096,1,1),mute=ctx.createGain();mute.gain.value=0;input.connect(processor);processor.connect(mute);mute.connect(ctx.destination);const values:number[]=[];
   const finish=()=>{if(epoch!==generation)return;stop();void act(values.length?{tag:'Audio',runId:e.runId,samples:values}:{tag:'Stop'});};
   processor.onaudioprocess=event=>{if(epoch!==generation)return;const channel=event.inputBuffer.getChannelData(0);for(let i=0;i<channel.length;i++){values.push(Math.round(Math.max(-1,Math.min(1,channel[i]))*32767));if(values.length===16000*(e.wake?4:30)){finish();break;}}};
   $('ptt-stop').onclick=finish;if(!e.wake&&!held){finish();return;}timer=setTimeout(finish,e.wake?4500:30500);
  }catch{if(epoch===generation){stop();await act({tag:'Stop'});$('media-warning').textContent='Microphone unavailable. Check OS microphone permission.';}}
 }else{
  try{const ctx=new AudioContext();context=ctx;const buffer=await ctx.decodeAudioData(new Uint8Array(e.audio).buffer);if(epoch!==generation)return;const player=ctx.createBufferSource(),analyser=ctx.createAnalyser();source=player;player.buffer=buffer;player.connect(analyser);analyser.connect(ctx.destination);await ctx.resume();if(epoch!==generation)return;player.start();const samples=new Float32Array(analyser.fftSize);let last=0;
   const frame=()=>{if(epoch!==generation)return;analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length),level=Math.min(1,rms*5);$('audio-level').style.width=`${level*100}%`;if(performance.now()-last>100){last=performance.now();void act({tag:'Level',runId:e.runId,level});}requestAnimationFrame(frame);};frame();player.onended=()=>{if(epoch===generation){stop();void act({tag:'Ended',runId:e.runId});}};
  }catch{if(epoch===generation){stop();void act({tag:'Stop'});$('media-warning').textContent='Audio playback unavailable.';}}
 }
});
$('media-settings').addEventListener('input',()=>{edited=true;});
$('media-settings').onsubmit=async event=>{event.preventDefault();const config={} as Record<string,unknown>;for(const key of ['mode','tts','stt','voice','ttsModel','sttModel','consent','wake','phrase','display']){const el=$('media-'+key) as HTMLInputElement;config[key]=el.type==='checkbox'?el.checked:el.value;}const key=($('media-key') as HTMLInputElement).value;($('media-key') as HTMLInputElement).value='';await act({tag:'Configure',config:config as MediaConfig,key});edited=false;render(await host.view());};
$('ptt').onpointerdown=event=>{held=true;($('ptt') as HTMLElement).setPointerCapture(event.pointerId);void act({tag:'Listen'});};$('ptt').onpointerup=()=>{held=false;if(!view?.config.wake)$('ptt-stop').click();};$('ptt').onpointercancel=()=>void act({tag:'Stop'});$('ptt').onkeydown=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();held=true;void act({tag:'Listen'});}};$('ptt').onkeyup=e=>{held=false;if((e.key===' '||e.key==='Enter')&&!view?.config.wake)$('ptt-stop').click();};
$('media-stop').onclick=()=>void act({tag:'Stop'});$('speak').onclick=()=>void act({tag:'Speak'});$('analyze').onclick=()=>void act({tag:'Analyze'});$('look').onclick=()=>void act({tag:'Look'});$('watch').onchange=()=>void act({tag:'Watch',enabled:($('watch') as HTMLInputElement).checked});
$('use-transcript').onclick=()=>{if(view?.review&&!view.image)($('message') as HTMLTextAreaElement).value=view.review;};
window.addEventListener('blur',()=>{if(view?.phase==='Recording')void act({tag:'Stop'});});window.addEventListener('beforeunload',stop);
