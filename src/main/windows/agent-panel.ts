import {app,BrowserWindow,ipcMain,safeStorage,shell,type IpcMainInvokeEvent} from 'electron';
import path from 'node:path';
import {createAgent} from '../agent/interpreter';
import {secureStore,auditLog,memoryAudit,scheduler} from '../agent/stores';
import {t3Client} from '../t3/client';
import {parseDetail} from '../t3/parsers';
import {panelAction} from '../../shared/agent';
import type {Detail} from '../../core/agent/model';
import type {AgentRpc,SecureStore} from '../agent/ports';
import type {createCompanion} from './overlay';
export async function createAgentPanel(companion:Awaited<ReturnType<typeof createCompanion>>,test?:{rpc:AgentRpc;store:SecureStore;parseDetail:(value:unknown,threadId:string,requestId:string)=>Detail|null}) {
 const panel=new BrowserWindow({width:790,height:800,minWidth:480,minHeight:400,show:false,backgroundColor:'#0c0b0f',title:'Capri · Agent board',webPreferences:{preload:path.join(__dirname,'../preload/panel.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
 panel.setMenu(null);panel.setAlwaysOnTop(true,'screen-saver');panel.webContents.setWindowOpenHandler(()=>({action:'deny'}));panel.webContents.on('will-navigate',event=>event.preventDefault());
 const observers=new Set<()=>void>();
 let closing=false,lastFocus:string|null=null,deferredFocus=false;
 const overlayUi=()=>{const s=companion.state();return {visible:panel.isVisible(),hidden:s.tag!=='Active'||s.fullscreen||s.settings.paused,quiet:s.tag==='Active'&&s.settings.quiet};};
 const ui=()=>agent.dispatch({tag:'Ui',...overlayUi()});
 const show=()=>{if(!overlayUi().hidden){panel.show();panel.focus();}};
 const agent=createAgent({store:test?.store??secureStore(app.getPath('userData'),{
  isEncryptionAvailable:()=>safeStorage.isEncryptionAvailable()&&(process.platform==='win32'||process.platform==='darwin'||safeStorage.getSelectedStorageBackend()!=='basic_text'),
  encryptString:value=>safeStorage.encryptString(value),decryptString:value=>safeStorage.decryptString(value),
 }),audit:test?memoryAudit():auditLog(app.getPath('userData')),scheduler:scheduler(),rpc:test?.rpc??t3Client(url=>shell.openExternal(url)),parseDetail:test?.parseDetail??parseDetail,random:Math.random,
 panel:{render:state=>{
  for(const observer of observers)observer();
  if(!panel.isDestroyed())panel.webContents.send('agent:view',{...agent.view(),demo:Boolean(test)});
  if(state.focus!==lastFocus){lastFocus=state.focus;deferredFocus=Boolean(state.focus);}
  if(deferredFocus&&state.focus&&!overlayUi().hidden){deferredFocus=false;show();}
 }},character:{presence:state=>{
  const pending=state.threads.find(t=>t.pending?.id===state.focus);
  const working=state.threads.find(t=>['running','starting','preparing','queued'].includes(t.phase));
  const bounds=panel.getBounds(),overlay=companion.window.getBounds();
  companion.agent({tag:'agent',active:state.connection.tag!=='Unpaired',card:panel.isVisible()?{x:bounds.x-overlay.x,y:bounds.y-overlay.y,w:bounds.width,h:Math.min(400,bounds.height)}:undefined,presence:agent.view().presence,caption:pending?`${pending.provider} needs you · Open agent board`:working?`${working.provider} · ${(working.summary??working.title).slice(0,180)}`:state.connection.tag==='Unpaired'?'':state.connection.tag==='Live'?'Agents idle':'Agent status unavailable'});
 },reaction:command=>companion.agent({tag:'agentReaction',kind:command.kind})}});
 const own=(event:IpcMainInvokeEvent)=>!panel.isDestroyed()&&event.sender===panel.webContents&&event.senderFrame===panel.webContents.mainFrame;
 ipcMain.handle('agent:view',event=>{if(!own(event))throw new Error('Untrusted sender');return {...agent.view(),demo:Boolean(test)};});
 ipcMain.handle('agent:act',(event,value:unknown)=>{
  if(!own(event))throw new Error('Untrusted sender');const parsed=panelAction.safeParse(value);if(!parsed.success)throw new Error('Invalid agent action');const action=parsed.data;
  if(action.tag==='Quiet'){companion.dispatch({tag:'SettingsChanged',patch:{quiet:action.quiet}});return;}
  if(action.tag==='Pair')agent.dispatch(action);
  else if(action.tag==='Disconnect')agent.dispatch(action);
  else agent.open(action.threadId);
 });
 panel.on('close',event=>{if(!closing){event.preventDefault();panel.hide();}});panel.on('show',ui);panel.on('hide',ui);
 const stop=companion.subscribe(()=>{const prefs=overlayUi();if(prefs.hidden)panel.hide();ui();});
 app.once('before-quit',()=>{closing=true;stop();agent.stop();ipcMain.removeHandler('agent:view');ipcMain.removeHandler('agent:act');});
 await panel.loadFile(path.join(__dirname,'../renderer/panel/index.html'));
 await agent.start();ui();
 return {show,panel,agent,subscribe:(fn:()=>void)=>{observers.add(fn);return()=>{observers.delete(fn);};}};
}
