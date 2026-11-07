import {funService} from '../fun/service';import {funUi,type FunView} from '../../shared/fun';import {nativeControl} from '../assistant/native';import {z} from 'zod';
import {describeScreen} from '../media/vision';
import {mediaService} from '../media/service';
import {app,globalShortcut,nativeImage,desktopCapturer,screen,BrowserWindow,dialog,ipcMain,Notification,safeStorage,shell,type IpcMainInvokeEvent} from 'electron';
import path from 'node:path';import {randomUUID} from 'node:crypto';
import {assistantUi,type AssistantView} from '../../shared/assistant';import {loopbackOrigin} from '../../shared/agent';
import {assistantData} from '../assistant/data';import {providerStore,mediaStore} from '../assistant/config';import {fileSearch} from '../assistant/files';import {actionExecutor,type Targets} from '../assistant/actions';import {assistantService} from '../assistant/service';import {loadAssistantContext,type AssistantContext} from '../assistant/context';import {pairOperations,type OperationCredential} from '../t3/operations';
import {stepReminders,type ReminderState} from '../../core/assistant/reminders';
import type {createCompanion} from './overlay';import type {createAgentPanel} from './agent-panel';
export async function createAssistantPanel(companion:Awaited<ReturnType<typeof createCompanion>>,board?:Awaited<ReturnType<typeof createAgentPanel>>,smoke=false){
 const panel=new BrowserWindow({width:820,height:880,minWidth:480,minHeight:480,show:false,title:'Capri · Assistant',backgroundColor:'#0c0b0f',webPreferences:{preload:path.join(__dirname,'../preload/assistant.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,offscreen:smoke,partition:'capri-assistant'}});
 panel.setMenu(null);panel.webContents.setWindowOpenHandler(()=>({action:'deny'}));panel.webContents.on('will-navigate',event=>event.preventDefault());
 const directory=path.join(app.getPath('userData'),'assistant');const data=await assistantData(directory);
 let context:AssistantContext=await loadAssistantContext(directory,path.join(app.getAppPath(),'assistant/defaults'));
 let auth:OperationCredential|null=null,pairEpoch=0,closing=false,contextWarning='';
 const alerts:string[]=[];let reminders:ReminderState={tag:'Reminders',runId:randomUUID(),items:data.reminders()};
 const files=fileSearch(file=>shell.showItemInFolder(file));
 const targets=():Targets=>{const state=board?.agent.state();return {live:state?.connection.tag==='Live',server:state&&'baseUrl' in state.connection?state.connection.baseUrl:null,projects:state?[...state.projects]:[],threads:state?state.threads.map(t=>({id:t.id,title:t.title,provider:t.provider,projectId:t.projectId,runId:t.runId,phase:t.phase,mode:t.mode})):[]};};
 const blocked=()=>{const s=companion.state();return s.tag!=='Active'||s.fullscreen||s.settings.paused||s.settings.stowed||Boolean(board?.agent.state().focus);};
 let fun:Awaited<ReturnType<typeof funService>>|undefined;let stopReady=false;let music:FunView['music']=null,musicBusy=false;let musicController:AbortController|null=null;let musicEpoch=0;
 let media:ReturnType<typeof mediaService>|undefined;
 const render=()=>{if(!panel.isDestroyed()){panel.webContents.send('assistant:view',view());if(media)panel.webContents.send('media:view',media.view());if(fun){fun.sync();panel.webContents.send('fun:view',funView());}}};
 const executor=actionExecutor({jobStopReady:()=>stopReady,data,files,targets,auth:()=>auth,point:(runId,x,y,label)=>companion.agent({tag:'assistantPoint',runId,x,y,label}),remindersChanged:()=>{reminders=stepReminders(reminders,{tag:'Loaded',runId:reminders.runId,items:data.reminders()}).state;render();}});
 const service=assistantService({store:providerStore(app.getPath('userData'),{
  isEncryptionAvailable:()=>!smoke&&safeStorage.isEncryptionAvailable()&&(process.platform==='win32'||process.platform==='darwin'||safeStorage.getSelectedStorageBackend()!=='basic_text'),encryptString:v=>safeStorage.encryptString(v),decryptString:v=>safeStorage.decryptString(v),
 }),context:async()=>{context=await loadAssistantContext(directory,path.join(app.getAppPath(),'assistant/defaults'));return context;},execute:executor.execute,policy:executor.policy,save:data.saveExchange,audit:data.audit,cancelPoint:()=>companion.agent({tag:'assistantStop'}),render});
 const funSettings=()=>{const s=companion.state();if(s.tag!=='Active')return {bond:false,jealousy:false,checkins:false,cursorRide:false,miniPlayer:false,dance:false,clones:false,chaos:false};const {bond,jealousy,checkins,cursorRide,miniPlayer,dance,clones,chaos}=s.settings;return {bond,jealousy,checkins,cursorRide,miniPlayer,dance,clones,chaos};};
 const funEligibility=()=>{const s=companion.state();return {eligible:!blocked()&&service.state().phase==='Idle',quiet:s.tag!=='Active'||s.settings.quiet};};
 function funView():FunView{return {...fun!.view(),settings:funSettings(),jobStopReady:stopReady,targets:executor.jobTargets(),music};}
 fun=await funService({directory:app.getPath('userData'),emit:event=>companion.agent(event),render,settings:funSettings,eligibility:funEligibility});
 const unfun=companion.onFun(value=>{if(value.tag==='Pulse')fun!.pulse(value.eligible,value.reduced);else fun!.event(value.tag);});
 if(!smoke&&process.platform==='win32')stopReady=globalShortcut.register('Control+Alt+Escape',()=>{++pairEpoch;media?.stop();fun?.stop();service.dispatch({tag:'Stop'});});
 let lastProvider:string|null=null;
 const refreshFun=()=>{fun?.sync();const current=board?.agent.state().threads.find(t=>t.phase==='running')?.provider??null;if(current&&lastProvider&&current!==lastProvider)fun?.event('Rival');lastProvider=current;
  if(!funEligibility().eligible){++musicEpoch;musicController?.abort();music=null;companion.agent({tag:'musicPlaying',playing:false});}
 };
 const funTimer=setInterval(()=>fun?.event('Tick'),60000);
 const musicTimer=setInterval(()=>{const flags=funSettings();if(smoke||process.platform!=='win32'||musicBusy||!funEligibility().eligible||(!flags.miniPlayer&&!flags.dance)){if(!flags.miniPlayer&&!flags.dance){music=null;companion.agent({tag:'musicPlaying',playing:false});}return;}
  musicBusy=true;const current=++musicEpoch,controller=new AbortController();musicController=controller;void nativeControl({op:'music',operation:'status'},controller.signal).then(value=>{if(current!==musicEpoch||controller.signal.aborted)return;music=z.object({title:z.string().max(1000),artist:z.string().max(1000),playing:z.boolean()}).strict().parse(value);companion.agent({tag:'musicPlaying',playing:music.playing});render();}).catch(()=>{if(current===musicEpoch){music=null;companion.agent({tag:'musicPlaying',playing:false});render();}}).finally(()=>{musicBusy=false;});
 },5000);
 const mediaStorage=mediaStore(app.getPath('userData'),{isEncryptionAvailable:()=>!smoke&&safeStorage.isEncryptionAvailable()&&(process.platform==='win32'||process.platform==='darwin'||safeStorage.getSelectedStorageBackend()!=='basic_text'),encryptString:v=>safeStorage.encryptString(v),decryptString:v=>safeStorage.decryptString(v)});
 media=mediaService({render,analyze:(image,signal)=>describeScreen(service.settings().config,service.settings().key,image,signal),level:level=>companion.agent({tag:'audioLevel',level}),event:e=>panel.webContents.send('media:event',e),text:()=>[...service.state().messages].reverse().find(m=>m.role==='assistant')?.text??'',quiet:()=>{const s=companion.state();return s.tag!=='Active'||s.settings.quiet;},save:mediaStorage.save,displays:()=>screen.getAllDisplays().map(d=>({id:String(d.id),label:d.label||`Display ${d.id}`})),capture:async(id,signal)=>{signal.throwIfAborted();if(smoke)return nativeImage.createFromPath(path.join(app.getAppPath(),'art/placeholder/sprite.png')).toDataURL();const selected=screen.getAllDisplays().find(d=>String(d.id)===id);if(!selected)throw Error('Select a display');const sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:1280,height:720},fetchWindowIcons:false});signal.throwIfAborted();const source=sources.find(s=>s.display_id===id);if(!source||source.thumbnail.isEmpty())throw Error('Capture unavailable');return source.thumbnail.toDataURL();}});
 const savedMedia=await mediaStorage.load();media.load(savedMedia.config,savedMedia.key);
 const session=panel.webContents.session;
 const allowMic=(contents:Electron.WebContents|null)=>contents===panel.webContents&&panel.isVisible()&&!blocked()&&media?.state().phase==='Recording';
 session.setPermissionCheckHandler((contents,permission,_origin,details)=>permission==='media'&&allowMic(contents)&&details.mediaType==='audio');
 session.setPermissionRequestHandler((contents,permission,callback,details)=>callback(permission==='media'&&allowMic(contents)&&'mediaTypes' in details&&details.mediaTypes?.length===1&&details.mediaTypes[0]==='audio'));
 session.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!['file:','blob:','data:'].includes(new URL(details.url).protocol)}));
 function view():AssistantView{
  const s=service.state(),t=targets();return {phase:s.phase,runId:s.runId,messages:s.messages,draft:s.draft,pending:s.pending,pendingDescription:s.pending?executor.describe(s.pending):'',canApprove:s.phase==='AwaitingDecision'&&s.visible&&!s.blocked,reminderAlerts:[...alerts],result:s.result,warning:[service.warning(),contextWarning].filter(Boolean).join(' '),config:service.settings().config,hasKey:Boolean(service.settings().key),context:Object.entries(context).map(([name,doc])=>({name,source:doc.source,reason:doc.reason})),searchFolder:files.root(),operationsPaired:Boolean(auth),reminders:[...reminders.items],targets:{projects:t.projects,threads:t.threads}};
 }
 function ui(){const visible=panel.isVisible(),isBlocked=blocked(),s=service.state();media?.ui(visible&&!isBlocked);if(companion.state().tag==='Active'&&(companion.state() as {settings:{quiet:boolean}}).settings.quiet&&media?.state().phase==='Speaking')media.stop();if(s.visible!==visible||s.blocked!==isBlocked)service.dispatch({tag:'Ui',visible,blocked:isBlocked});else render();if(isBlocked&&panel.isVisible())panel.hide();}
 const own=(event:IpcMainInvokeEvent)=>!panel.isDestroyed()&&event.sender===panel.webContents&&event.senderFrame===panel.webContents.mainFrame;
 ipcMain.handle('fun:view',event=>{if(!own(event))throw Error('Untrusted sender');return funView();});
 ipcMain.handle('fun:act',async(event,value:unknown)=>{if(!own(event))throw Error('Untrusted sender');const parsed=funUi.safeParse(value);if(!parsed.success)throw Error('Invalid fun action');const a=parsed.data;if(a.tag==='StopFun'){fun!.stop();companion.dispatch({tag:'SettingsChanged',patch:{bond:false,jealousy:false,checkins:false,cursorRide:false,miniPlayer:false,dance:false,clones:false,chaos:false}});return;}ui();if(!panel.isVisible()||blocked())throw Error('Fun controls unavailable');switch(a.tag){case 'Configure':companion.dispatch({tag:'SettingsChanged',patch:a.settings});fun!.sync();return;case 'ResetBond':fun!.reset();return;case 'Signal':fun!.event(a.kind);return;case 'Music':service.submit('/music '+a.operation);return;default:{const exhaustive:never=a;return exhaustive;}}});
 ipcMain.handle('media:view',event=>{if(!own(event))throw Error('Untrusted sender');return media!.view();});
 ipcMain.handle('media:act',async(event,value:unknown)=>{if(!own(event))throw Error('Untrusted sender');ui();await media!.act(value);});
 ipcMain.handle('assistant:view',event=>{if(!own(event))throw Error('Untrusted sender');return view();});
 ipcMain.handle('assistant:act',async(event,value:unknown)=>{
  if(!own(event))throw Error('Untrusted sender');const parsed=assistantUi.safeParse(value);if(!parsed.success)throw Error('Invalid assistant action');const action=parsed.data;ui();
  // Stop remains available when hidden; every other action needs a visible unblocked panel.
  if(action.tag==='Stop'){fun?.stop();media?.stop();++pairEpoch;service.dispatch({tag:'Stop'});return;}
  if(!service.state().visible||service.state().blocked)throw Error('Assistant is hidden or blocked');
  switch(action.tag){
   case 'Send':fun?.event('Click');if(/^\/chaos$/i.test(action.text.trim())){fun?.event('Insult');return;}if(/^(sorry|my bad)[.!]?$/i.test(action.text.trim()))fun?.event('Apology');service.submit(action.text);return;
   case 'Decide':service.dispatch(action);return;
   case 'Configure':await service.configure({config:action.config,key:action.key});return;
   case 'ForgetProvider':await service.forget();return;
   case 'ClearTranscript':service.dispatch({tag:'Clear'});data.clear();return;
   case 'ChooseSearchFolder':{
    service.dispatch({tag:'Stop'});const result=await dialog.showOpenDialog(panel,{title:'Choose the only folder Capri may search',properties:['openDirectory']});if(!result.canceled&&result.filePaths.length===1)await files.choose(result.filePaths[0]);render();return;
   }
   case 'PairOperations':{
    service.dispatch({tag:'Stop'});const current=++pairEpoch,origin=loopbackOrigin.parse(action.baseUrl);if(targets().server!==origin||!targets().live)throw Error('Pair the monitoring connection first');
    const result=await pairOperations(origin,action.credential);if(current===pairEpoch&&panel.isVisible()&&!blocked())auth=result;render();return;
   }
   case 'ForgetOperations':++pairEpoch;auth=null;service.dispatch({tag:'Stop'});render();return;
   default:{const exhaustive:never=action;return exhaustive;}
  }
 });
 panel.on('show',ui);panel.on('hide',()=>{++pairEpoch;ui();});panel.on('close',event=>{if(!closing){event.preventDefault();panel.hide();}});
 const unsubscribe=companion.subscribe(()=>{ui();refreshFun();}),unboard=board?.subscribe(()=>{ui();refreshFun();});
 const mediaTimer=setInterval(()=>media?.tick(),30000);
 const reminderTimer=setInterval(()=>{
  const next=stepReminders(reminders,{tag:'Tick',runId:reminders.runId,now:Date.now()});reminders=next.state;
  for(const command of next.commands){try{data.finishReminder(command.reminder.id);alerts.push(command.reminder.text);if(alerts.length>10)alerts.shift();if(!smoke&&Notification.isSupported())new Notification({title:'Capri reminder',body:command.reminder.text,silent:true}).show();}catch{contextWarning='A reminder could not be delivered; restart to retry saved reminders.';}}
  if(next.commands.length)render();
 },1000);
 app.once('before-quit',()=>{closing=true;++pairEpoch;auth=null;unfun();fun?.close();clearInterval(funTimer);clearInterval(musicTimer);musicController?.abort();globalShortcut.unregister('Control+Alt+Escape');ipcMain.removeHandler('fun:view');ipcMain.removeHandler('fun:act');unsubscribe();unboard?.();clearInterval(reminderTimer);clearInterval(mediaTimer);media?.stop();ipcMain.removeHandler('media:view');ipcMain.removeHandler('media:act');service.stop();data.close();ipcMain.removeHandler('assistant:view');ipcMain.removeHandler('assistant:act');});
 await service.start();await panel.loadFile(path.join(__dirname,'../renderer/assistant/index.html'));ui();
 return {panel,service,view,show:()=>{if(!blocked()){panel.show();panel.focus();}}};
}
