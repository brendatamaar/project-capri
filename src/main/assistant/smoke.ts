import {app} from 'electron';import {readFile} from 'node:fs/promises';import path from 'node:path';
import {createAssistantPanel} from '../windows/assistant-panel';import type {createCompanion} from '../windows/overlay';
export async function assistantSmoke(companion:Awaited<ReturnType<typeof createCompanion>>){
 const run=async(contents:Electron.WebContents,script:string)=>{const result=await contents.executeJavaScript(`(async()=>{try{return {ok:true,value:await (${script})};}catch(error){return {ok:false,message:String(error.message)};}})()`);if(!result.ok)throw Error('Assistant smoke: '+result.message);return result.value;};
 const assistant=await createAssistantPanel(companion,undefined,true);assistant.show();
 await run(assistant.panel.webContents,`new Promise(resolve=>{const check=()=>document.body.dataset.ready==='true'?resolve(true):setTimeout(check,25);check();})`);
 await run(assistant.panel.webContents,`(async()=>{
  const host=window.assistant;
  await host.act({tag:'Send',text:'/remember Likes <img src=x onerror="window.injected=true">'});
  const view=await host.view();if(view.phase!=='AwaitingDecision'||!view.canApprove)throw Error('No confirmation card');
  if(document.querySelector('#exact img')||window.injected||!document.querySelector('#exact').textContent.includes('<img'))throw Error('Exact text/XSS failed');
  let rejected=false;try{await host.act({tag:'Execute',action:{tag:'Remember',text:'bypass'}});}catch{rejected=true;}if(!rejected)throw Error('Execution IPC bypass');
  await host.act({tag:'Decide',runId:view.runId+1,approve:true});if((await host.view()).phase!=='AwaitingDecision')throw Error('Stale approval accepted');
 })()`);
 assistant.panel.hide();if(assistant.view().pending)throw Error('Hide retained proposal');
 const memory=path.join(app.getPath('userData'),'assistant','MEMORY.md');
 try{await readFile(memory);throw Error('Unapproved memory written');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 assistant.show();
 await run(assistant.panel.webContents,`(async()=>{
  const host=window.assistant;await host.act({tag:'Send',text:'/remember Prefers concise summaries.'});let view=await host.view();await host.act({tag:'Decide',runId:view.runId,approve:true});
  await new Promise(resolve=>{const check=async()=>{if((await host.view()).phase==='Idle')resolve(true);else setTimeout(check,25);};check();});
  await host.act({tag:'Configure',config:{kind:'compatible',baseUrl:'http://127.0.0.1:1234/v1',model:'fixture',cloudConsent:false,smallContext:true},key:'fixture-provider-key-never-expose'});
  view=await host.view();if(JSON.stringify(view).includes('fixture-provider-key-never-expose')||!view.hasKey)throw Error('Provider secret leaked');
  await host.act({tag:'ForgetProvider'});await host.act({tag:'Send',text:'/point 0.5 0.4 Guide fixture'});
 })()`);
 if(!(await readFile(memory,'utf8')).includes('Prefers concise summaries.'))throw Error('Approved memory not saved');
 await run(companion.window.webContents,`new Promise(resolve=>{const check=()=>document.body.dataset.ready==='true'?resolve(true):setTimeout(check,25);check();})`);
 await run(companion.window.webContents,`(()=>{const {capri,receive}=window.__companionTest;receive({tag:'hidden',hidden:false});capri.setHidden(false);capri.busy=false;capri.stowed=false;capri.endAct(false);void capri.perform('victory');window.signatureFixture=capri.act;window.guideCalls=0;window.savedPointAt=capri.pointAt;capri.pointAt=async()=>{window.guideCalls++;return true;};})()`);
 await run(assistant.panel.webContents,`(async()=>{const host=window.assistant;const view=await host.view();await host.act({tag:'Decide',runId:view.runId,approve:true});await new Promise(resolve=>{const check=async()=>{if((await host.view()).phase==='Idle')resolve(true);else setTimeout(check,25);};check();});})()`);
 await run(companion.window.webContents,`(()=>{const {capri,processAgentReaction}=window.__companionTest;processAgentReaction();if(window.guideCalls||capri.act!==window.signatureFixture)throw Error('Guide interrupted signature');capri.endAct(false);capri.busy=false;processAgentReaction();if(window.guideCalls!==1)throw Error('Guide missing');capri.pointAt=window.savedPointAt;if(window.assistant)throw Error('Assistant bridge leaked to overlay');})()`);
 await run(companion.window.webContents,`(async()=>{const {capri}=window.__companionTest;const teleport=capri.teleport,stance=capri.stance;let current=true;capri.teleport=async()=>{current=false;};capri.stance='sit';try{const result=await capri.pointAt({x:100,y:100,w:1,h:1},{label:'cancel fixture',isCurrent:()=>current});if(result!==false||capri.pointing)throw Error('Cancelled teleport created a late guide');}finally{capri.teleport=teleport;capri.stance=stance;}})()`);
 await run(assistant.panel.webContents,`(async()=>{
 const media=window.media;let v=await media.view();if(v.config.mode!=='typed'||v.watching||v.image)throw Error('Media defaults');
 let rejected=false;try{await media.act({tag:'Audio',runId:1,samples:[Infinity]});}catch{rejected=true;}if(!rejected)throw Error('Bad audio accepted');
 await media.act({tag:'Configure',config:{...v.config,mode:'local'},key:'fixture-media-secret'});v=await media.view();if(JSON.stringify(v).includes('fixture-media-secret'))throw Error('Media secret leaked');
 await media.act({tag:'Look'});await new Promise(resolve=>{const check=async()=>{if((await media.view()).phase==='Idle')resolve(true);else setTimeout(check,25);};check();});v=await media.view();if(!v.image.startsWith('data:image/png'))throw Error('Capture preview missing');
 await media.act({tag:'Watch',enabled:true});await media.act({tag:'Stop'});v=await media.view();if(v.watching||v.phase!=='Idle')throw Error('Stop retained watching');
 await media.act({tag:'Configure',config:{...v.config,mode:'typed'},key:''});
 })()`);
 assistant.panel.hide();assistant.show();
 await run(assistant.panel.webContents,`(async()=>{const v=await window.media.view();if(v.image||v.watching)throw Error('Hidden capture retained');})()`);
 console.log('MEDIA_SMOKE_OK:typed-defaults-parser-secrets-preview-watch-stop-hide');
 await run(assistant.panel.webContents,`(async()=>{const host=window.fun;const v=await host.view();if(Object.values(v.settings).some(Boolean))throw Error('Fun not opt-in');await host.act({tag:'Configure',settings:{...v.settings,bond:true,chaos:true,clones:true,cursorRide:true,dance:true}});})()`);
 await run(companion.window.webContents,`(()=>{const {capri,host}=window.__companionTest;capri.pointing=null;capri.endAct(false);capri.busy=false;capri.nextMove=Infinity;capri.nextTwitch=Infinity;capri.setMode('idle');capri.setStance('stand');capri.setHidden(false);capri.stowed=false;capri.dormant=false;capri.suspended=false;host.fun({tag:'Pulse',eligible:true,reduced:false});})()`);
 await run(companion.window.webContents,`new Promise((resolve,reject)=>{const until=performance.now()+4000;const check=()=>window.__companionTest.fun.inspect().clones===2?resolve(true):performance.now()>until?reject(Error('Fun eligibility did not arrive')):setTimeout(check,25);check();})`);
 await run(assistant.panel.webContents,`(async()=>{await window.fun.act({tag:'Signal',kind:'Insult'});if((await window.fun.view()).mood!=='playful')throw Error('Chaos signal missing');})()`);
 await run(companion.window.webContents,`new Promise((resolve,reject)=>{const until=performance.now()+2000;const check=()=>window.__companionTest.fun.inspect().chaos?resolve(true):performance.now()>until?reject(Error('Chaos event did not arrive')):setTimeout(check,25);check();})`);
 await run(companion.window.webContents,`(()=>{const {capri,fun,receive}=window.__companionTest;receive({tag:'musicPlaying',playing:true});capri.drawFrame();const v=fun.inspect();if(v.clones!==2||!v.chaos||!v.ride||!v.dance)throw Error('Fun flags not applied');if([...document.querySelectorAll('.fun-clone')].filter(c=>!c.hidden).length!==2)throw Error('Clones missing');if([...document.querySelectorAll('.fun-clone')].some(c=>getComputedStyle(c).pointerEvents!=='none'))throw Error('Clones intercept input');})()`);
 await run(companion.window.webContents,`(async()=>{const {fun,host,receive}=window.__companionTest;const settings=await host.settings();receive({tag:'settings',settings:{...settings,motion:'reduced'}});const v=fun.inspect();if(v.clones||v.ride||v.dance||v.chaos)throw Error('Reduced motion retained effects');receive({tag:'settings',settings});})()`);
 await run(assistant.panel.webContents,`(async()=>{await window.assistant.act({tag:'Send',text:'/remember Pending fixture blocks all fun'});if((await window.fun.view()).mood!=='calm')throw Error('Approval did not calm fun');})()`);
 await run(companion.window.webContents,`new Promise((resolve,reject)=>{const until=performance.now()+2000;const check=()=>window.__companionTest.fun.inspect().clones===0?resolve(true):performance.now()>until?reject(Error('Approval clearing did not arrive')):setTimeout(check,25);check();})`);
 await run(companion.window.webContents,`(()=>{const {fun}=window.__companionTest;if(fun.inspect().clones||fun.inspect().ride)throw Error('Pending approval allowed fun');if([...document.querySelectorAll('.fun-clone')].some(c=>!c.hidden))throw Error('Approval retained clones');if(window.fun)throw Error('Fun controls leaked into overlay');})()`);
 await run(assistant.panel.webContents,`(async()=>{await window.assistant.act({tag:'Stop'});await window.fun.act({tag:'StopFun'});if(Object.values((await window.fun.view()).settings).some(Boolean))throw Error('StopFun did not disable settings');})()`);
 console.log('FUN_SMOKE_OK:optin-clones-clickthrough-dance-ride-approval-stop');

 assistant.service.dispatch({tag:'Stop'});assistant.panel.hide();console.log('ASSISTANT_SMOKE_OK:offline-confirmation-xss-hide-memory-secrets-pointing');
}
