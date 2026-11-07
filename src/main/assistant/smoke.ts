import {app} from 'electron';import {readFile} from 'node:fs/promises';import path from 'node:path';
import {createAssistantPanel} from '../windows/assistant-panel';import type {createCompanion} from '../windows/overlay';
export async function assistantSmoke(companion:Awaited<ReturnType<typeof createCompanion>>){
 const assistant=await createAssistantPanel(companion,undefined,true);assistant.show();
 await assistant.panel.webContents.executeJavaScript(`new Promise(resolve=>{const check=()=>document.body.dataset.ready==='true'?resolve(true):setTimeout(check,25);check();})`);
 await assistant.panel.webContents.executeJavaScript(`(async()=>{
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
 await assistant.panel.webContents.executeJavaScript(`(async()=>{
  const host=window.assistant;await host.act({tag:'Send',text:'/remember Prefers concise summaries.'});let view=await host.view();await host.act({tag:'Decide',runId:view.runId,approve:true});
  await new Promise(resolve=>{const check=async()=>{if((await host.view()).phase==='Idle')resolve(true);else setTimeout(check,25);};check();});
  await host.act({tag:'Configure',config:{kind:'compatible',baseUrl:'http://127.0.0.1:1234/v1',model:'fixture',cloudConsent:false,smallContext:true},key:'fixture-provider-key-never-expose'});
  view=await host.view();if(JSON.stringify(view).includes('fixture-provider-key-never-expose')||!view.hasKey)throw Error('Provider secret leaked');
  await host.act({tag:'ForgetProvider'});await host.act({tag:'Send',text:'/point 0.5 0.4 Guide fixture'});
 })()`);
 if(!(await readFile(memory,'utf8')).includes('Prefers concise summaries.'))throw Error('Approved memory not saved');
 await companion.window.webContents.executeJavaScript(`new Promise(resolve=>{const check=()=>document.body.dataset.ready==='true'?resolve(true):setTimeout(check,25);check();})`);
 await companion.window.webContents.executeJavaScript(`(()=>{const {capri,receive}=window.__companionTest;receive({tag:'hidden',hidden:false});capri.setHidden(false);capri.busy=false;capri.stowed=false;capri.endAct(false);void capri.perform('victory');window.signatureFixture=capri.act;window.guideCalls=0;window.savedPointAt=capri.pointAt;capri.pointAt=async()=>{window.guideCalls++;return true;};})()`);
 await assistant.panel.webContents.executeJavaScript(`(async()=>{const host=window.assistant;const view=await host.view();await host.act({tag:'Decide',runId:view.runId,approve:true});await new Promise(resolve=>{const check=async()=>{if((await host.view()).phase==='Idle')resolve(true);else setTimeout(check,25);};check();});})()`);
 await companion.window.webContents.executeJavaScript(`(()=>{const {capri,processAgentReaction}=window.__companionTest;processAgentReaction();if(window.guideCalls||capri.act!==window.signatureFixture)throw Error('Guide interrupted signature');capri.endAct(false);capri.busy=false;processAgentReaction();if(window.guideCalls!==1)throw Error('Guide missing');capri.pointAt=window.savedPointAt;if(window.assistant)throw Error('Assistant bridge leaked to overlay');})()`);
 await companion.window.webContents.executeJavaScript(`(async()=>{const {capri}=window.__companionTest;const teleport=capri.teleport,stance=capri.stance;let current=true;capri.teleport=async()=>{current=false;};capri.stance='sit';try{const result=await capri.pointAt({x:100,y:100,w:1,h:1},{label:'cancel fixture',isCurrent:()=>current});if(result!==false||capri.pointing)throw Error('Cancelled teleport created a late guide');}finally{capri.teleport=teleport;capri.stance=stance;}})()`);
 await assistant.panel.webContents.executeJavaScript(`(async()=>{
 const media=window.media;let v=await media.view();if(v.config.mode!=='typed'||v.watching||v.image)throw Error('Media defaults');
 let rejected=false;try{await media.act({tag:'Audio',runId:1,samples:[Infinity]});}catch{rejected=true;}if(!rejected)throw Error('Bad audio accepted');
 await media.act({tag:'Configure',config:{...v.config,mode:'local'},key:'fixture-media-secret'});v=await media.view();if(JSON.stringify(v).includes('fixture-media-secret'))throw Error('Media secret leaked');
 await media.act({tag:'Look'});await new Promise(resolve=>{const check=async()=>{if((await media.view()).phase==='Idle')resolve(true);else setTimeout(check,25);};check();});v=await media.view();if(!v.image.startsWith('data:image/png'))throw Error('Capture preview missing');
 await media.act({tag:'Watch',enabled:true});await media.act({tag:'Stop'});v=await media.view();if(v.watching||v.phase!=='Idle')throw Error('Stop retained watching');
 await media.act({tag:'Configure',config:{...v.config,mode:'typed'},key:''});
 })()`);
 assistant.panel.hide();assistant.show();
 await assistant.panel.webContents.executeJavaScript(`(async()=>{const v=await window.media.view();if(v.image||v.watching)throw Error('Hidden capture retained');})()`);
 console.log('MEDIA_SMOKE_OK:typed-defaults-parser-secrets-preview-watch-stop-hide');
 assistant.service.dispatch({tag:'Stop'});assistant.panel.hide();console.log('ASSISTANT_SMOKE_OK:offline-confirmation-xss-hide-memory-secrets-pointing');
}
