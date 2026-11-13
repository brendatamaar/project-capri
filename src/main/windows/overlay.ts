import {overlayFun} from '../../shared/fun';
import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, globalShortcut, screen, protocol, powerMonitor, shell, type IpcMainInvokeEvent, type IpcMainEvent, type MenuItemConstructorOptions } from 'electron';
import os from 'node:os';
import path from 'node:path';
import { readFile, readdir, realpath, mkdir } from 'node:fs/promises';
import { initialCompanion, step, type Input, type Command, type State } from '../../core/companion';
import { actionSchema, patchSchema, type Desktop, type OverlayEvent } from '../../shared/overlay';
import { readSettings, writeSettings } from '../stores/companion-settings';
import { watchWindows } from './watch';
import type { ArtDescriptor } from '../../shared/art';

export async function createCompanion(smoke: boolean,art:ArtDescriptor,openBoard?:()=>void,openAssistant?:()=>void,openShowcase?:()=>void) {
  const funListeners=new Set<(value:ReturnType<typeof overlayFun.parse>)=>void>();
  const listeners=new Set<()=>void>();
  let state: State = initialCompanion(await readSettings(app.getPath('userData')));
  const selected = () => screen.getAllDisplays().find(display=>state.tag==='Active'&&display.id===state.settings.displayId)??screen.getPrimaryDisplay();
  const display = selected();
  const window = new BrowserWindow({ ...display.workArea, transparent: true, backgroundColor: '#00000000', frame: false,
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    skipTaskbar: true, focusable: false, hasShadow: false, alwaysOnTop: true, show: false,
    webPreferences: { preload: path.join(__dirname, '../preload/overlay.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false,
      backgroundThrottling: false, offscreen: smoke, autoplayPolicy: 'no-user-gesture-required' } });
  window.setAlwaysOnTop(true, 'screen-saver');
  window.setIgnoreMouseEvents(true, { forward: true });
  let desktop: Desktop = { fg: 0, fullscreen: false, wins: [] };
  let tray: Tray | undefined;
  let saveTail = Promise.resolve();
  let storeFailed = false;
  let watcherFailed = false;
  let previousPaused = state.tag==='Active'&&state.settings.paused;
  let previousStartup=state.tag==='Active'&&state.settings.startWithWindows;
  const send = (event: OverlayEvent) => { if (!window.isDestroyed()) window.webContents.send('companion:event', event); };
  const menu = () => {
    if (state.tag !== 'Active') return;
    const settings = state.settings;
    const template: MenuItemConstructorOptions[] = [
      { label: 'Capri Companion', enabled: false },
      ...(openBoard?[{label:'Agent board',click:()=>openBoard()}]:[]),
      ...(openAssistant?[{label:'Assistant',click:()=>openAssistant()}]:[]),
      ...(openShowcase?[{label:'Showcase gallery...',click:()=>openShowcase()}]:[]),
      {label:`Art: ${art.name} (${art.source})`,enabled:false},
      ...(watcherFailed ? [{ label: 'Window tracking unavailable; restart to retry', enabled: false }] : []),
      ...(storeFailed ? [{ label: 'Settings could not be saved', enabled: false }] : []),
      { label: settings.stowed ? 'Bring out' : 'Put away', click: () => dispatch({ tag: 'SettingsChanged', patch: { stowed: !settings.stowed } }) },
      {label:'Pause all activity',type:'checkbox',checked:settings.paused,click:()=>dispatch({tag:'SettingsChanged',patch:{paused:!settings.paused}})},
      { label: 'Quiet', type: 'checkbox', checked: settings.quiet, click: () => dispatch({ tag: 'SettingsChanged', patch: { quiet: !settings.quiet } }) },
      { label: 'Size', submenu: [0.4, 0.6, 0.8, 1].map(scale => ({ label: `${Math.round(scale*100)}%`, type: 'radio', checked: settings.scale === scale, click: () => dispatch({ tag: 'SettingsChanged', patch: { scale } }) })) },
      { label: 'Motion', submenu: (['auto', 'full', 'reduced'] as const).map(motion => ({ label: motion, type: 'radio', checked: settings.motion === motion, click: () => dispatch({ tag: 'SettingsChanged', patch: { motion } }) })) },
      { label: 'Frame rate', submenu: ([30,60] as const).map(fps => ({ label: `${fps} fps`, type: 'radio', checked: settings.fps === fps, click: () => dispatch({ tag: 'SettingsChanged', patch: { fps } }) })) },
      {label:'Behaviors',submenu:([['wander','Wander'],['drag','Drag and throw'],['peek','Edge peeking'],['pet','Head pats'],['zap','Pointer zap (visual only)'],['satellite','Satellite'],['pcReactions','React to PC'],['possess','Window possession (visual only)'],['follow','Follow across monitors']] as const).map(([key,label])=>({label,type:'checkbox',checked:settings[key],click:()=>dispatch({tag:'SettingsChanged',patch:{[key]:!settings[key]}})}))},
      {label:'Antics',type:'checkbox',checked:settings.antics,click:()=>dispatch({tag:'SettingsChanged',patch:{antics:!settings.antics}})},
      {label:'Fun extras (opt-in)',submenu:([['bond','Bond progress'],['jealousy','Playful jealousy'],['checkins','Check-ins'],['cursorRide','Ride cursor'],['miniPlayer','Music mini player'],['dance','Dance with music'],['clones','Visual clones'],['chaos','Theatrical chaos']] as const).map(([key,label])=>({label,type:'checkbox',checked:settings[key],click:()=>dispatch({tag:'SettingsChanged',patch:{[key]:!settings[key]}})}))},
      {label:'Rest',submenu:(['corner','taskbar','floor'] as const).map(rest=>({label:rest,type:'radio',checked:settings.rest===rest,click:()=>dispatch({tag:'SettingsChanged',patch:{rest}})}))},
      {label:'Art pack (restart to apply)',submenu:(['auto','installed','development','placeholder'] as const).map(artPack=>({label:artPack,type:'radio',checked:settings.artPack===artPack,click:()=>dispatch({tag:'SettingsChanged',patch:{artPack}})}))},
      {label:'Start with Windows',type:'checkbox',enabled:app.isPackaged,checked:settings.startWithWindows,click:()=>dispatch({tag:'SettingsChanged',patch:{startWithWindows:!settings.startWithWindows}})},
      {label:'Restart to apply art pack',click:()=>{void saveTail.then(()=>{if(!storeFailed){app.relaunch();app.quit();}});}},
      {label:'Open custom sound folder',click:()=>{void mkdir(sounds,{recursive:true}).then(()=>shell.openPath(sounds));}},
      {label:'Monitor',submenu:screen.getAllDisplays().map((display,index)=>({label:`Display ${index+1} (${display.size.width}×${display.size.height})`,type:'radio',checked:selected().id===display.id,click:()=>send({tag:'screen',id:display.id})}))},
      ...(['teleport', 'sleep', 'wake','peek','lie','zap','satellite','showcase','sit-icon'] as const).map(action => ({ label: action[0].toUpperCase()+action.slice(1), enabled:!settings.paused&&(action!=='zap'||settings.zap)&&(action!=='satellite'||settings.satellite)&&(action!=='peek'||settings.peek), click: () => dispatch({ tag: 'ActionChosen', action }) })),
      { type: 'separator' }, { label: 'Quit', click: () => app.quit() },
    ];
    return Menu.buildFromTemplate(template);
  };
  const interpret = (command: Command) => {
    switch (command.tag) {
      case 'PersistSettings':
        saveTail = saveTail.then(async () => {await writeSettings(app.getPath('userData'), command.settings);storeFailed=false;}).catch(() => { storeFailed = true; rebuild(); }); return;
      case 'RenderSettings':
        if(previousStartup!==command.settings.startWithWindows&&app.isPackaged&&!smoke) { previousStartup=command.settings.startWithWindows;app.setLoginItemSettings({openAtLogin:previousStartup,path:process.execPath}); }
        if(previousPaused!==command.settings.paused) {
          previousPaused=command.settings.paused;
          if(previousPaused)void window.loadFile(path.join(__dirname,'../renderer/overlay/paused.html'));
          else void window.loadFile(path.join(__dirname,'../renderer/overlay/index.html'),{query:smoke?{smoke:'true'}:{}});
        }
        else send({ tag: 'settings', settings: command.settings });
        resize();rebuild(); return;
      case 'SetHidden':
        window.setIgnoreMouseEvents(true, { forward: true });
        if (command.hidden) window.hide(); else if (!smoke) window.showInactive();
        send({ tag: 'hidden', hidden: command.hidden }); return;
      case 'CharacterAction': send({ tag: 'action', action: command.action }); return;
    }
    const exhaustive: never = command; return exhaustive;
  };
  function dispatch(input: Input) { const result = step(state, input); state = result.state; result.commands.forEach(interpret);for(const fn of listeners)fn(); }
  function rebuild() { const context = menu(); if (context) tray?.setContextMenu(context); }
  const own = (event: IpcMainInvokeEvent | IpcMainEvent) => !window.isDestroyed() && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame;
  const invoke = (channel: string, fn: (value: unknown) => unknown) => ipcMain.handle(channel, (event, value: unknown) => {
    if (!own(event)) throw new Error('Untrusted sender'); return fn(value);
  });
  invoke('companion:settings', () => state.tag === 'Active' ? state.settings : null);
  invoke('companion:update', value => {const parsed=patchSchema.safeParse(value);if(!parsed.success)throw new Error('Invalid companion settings');dispatch({ tag: 'SettingsChanged', patch: parsed.data });});
  invoke('companion:desktop', () => desktop);
  invoke('companion:cursor', () => { const p = screen.getCursorScreenPoint(), b = window.getBounds(); return { x: p.x-b.x, y: p.y-b.y,display:screen.getDisplayNearestPoint(p).id,inside:p.x>=b.x&&p.x<b.x+b.width&&p.y>=b.y&&p.y<b.y+b.height }; });
  const screens=()=>({current:selected().id,origin:{x:window.getBounds().x,y:window.getBounds().y},floorGap:state.tag==='Active'&&state.settings.rest==='taskbar'?Math.max(0,window.getBounds().y+window.getBounds().height-selected().workArea.y-selected().workArea.height):0,list:screen.getAllDisplays().map(display=>({id:display.id,x:display.bounds.x,y:display.bounds.y,w:display.bounds.width,h:display.bounds.height}))});
  invoke('companion:screens',screens);
  invoke('companion:move-screen',value=>{
    if(typeof value!=='number'||!Number.isSafeInteger(value)||!screen.getAllDisplays().some(display=>display.id===value))throw new Error('Unknown display');
    dispatch({tag:'SettingsChanged',patch:{displayId:value}});return screens();
  });
  const sounds = path.join(app.getPath('userData'), 'sounds');
  const soundFiles = new Map<string, string>();
  await readdir(sounds).then(files => files.forEach(file => { if (/^[a-z][a-z-]*\.(wav|mp3|ogg|m4a)$/i.test(file)) soundFiles.set(file, path.join(sounds, file)); })).catch(() => {});
  invoke('companion:sounds', () => [...soundFiles.keys()].map(file => ({ name: path.parse(file).name, url: `sound://custom/${file}` })));
  protocol.handle('sound', async request => {
    const url = new URL(request.url), file = soundFiles.get(url.pathname.slice(1));
    if (url.host !== 'custom' || !file || url.search || url.hash) return new Response(null, { status: 404 });
    try {
      const root = await realpath(sounds), target = await realpath(file);
      if (path.dirname(target) !== root) return new Response(null, { status: 403 });
      return new Response(new Uint8Array(await readFile(target)), { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/octet-stream' } });
    } catch { return new Response(null, { status: 404 }); }
  });
  ipcMain.on('companion:interactive', (event, value: unknown) => {
    if (own(event) && typeof value === 'boolean') window.setIgnoreMouseEvents(state.tag !== 'Active' || state.fullscreen || state.settings.paused || !value, { forward: true });
  });
  ipcMain.on('companion:fun',(event,value:unknown)=>{if(!own(event))return;const parsed=overlayFun.safeParse(value);if(parsed.success)for(const listener of funListeners)listener(parsed.data);});
  ipcMain.on('companion:menu', event => { if (own(event)) menu()?.popup({ window }); });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  if (!smoke) {
    const icon = nativeImage.createFromBuffer(await readFile(path.join(app.getAppPath(), 'art/placeholder/sprite.png'))).crop({ x: 70, y: 65, width: 96, height: 96 }).resize({ width: 20, height: 20 });
    tray = new Tray(icon); tray.setToolTip('Capri Companion'); rebuild();
    tray.on('double-click', () => dispatch({ tag: 'SettingsChanged', patch: { stowed: false } }));
    globalShortcut.register('Control+Alt+C', () => { if (state.tag === 'Active') dispatch({ tag: 'SettingsChanged', patch: { stowed: !state.settings.stowed } }); });
    globalShortcut.register('Control+Alt+Q', () => { if (state.tag === 'Active') dispatch({ tag: 'SettingsChanged', patch: { quiet: !state.settings.quiet } }); });
  }
  const receive = (next: Desktop) => { desktop = next; dispatch({ tag: 'FullscreenChanged', fullscreen: next.fullscreen }); send({ tag: 'desktop', desktop: next }); };
  const stopWatch = !smoke && process.platform === 'win32' ? watchWindows(window, receive, () => { watcherFailed = true; receive({ fg: 0, fullscreen: false, wins: [] }); rebuild(); }) : () => {};
  function resize() {
    const display=selected(),rest=state.tag==='Active'?state.settings.rest:'corner';
    const area=rest!=='corner'?{...display.bounds,y:display.bounds.y+1,height:display.bounds.height-1}:display.workArea;
    window.setBounds(area);send({tag:'resize',width:area.width,height:area.height,floorGap:rest==='taskbar'?Math.max(0,area.y+area.height-display.workArea.y-display.workArea.height):0});
  }
  screen.on('display-metrics-changed', resize);
  screen.on('display-added',resize);screen.on('display-removed',resize);
  let priorCpu=os.cpus();
  const machineTimer=!smoke?setInterval(()=>{
    const current=os.cpus();let idle=0,total=0;
    current.forEach((cpu,index)=>{const before=priorCpu[index]?.times;if(!before)return;idle+=cpu.times.idle-before.idle;for(const key of Object.keys(cpu.times) as (keyof typeof cpu.times)[])total+=cpu.times[key]-before[key];});
    priorCpu=current;send({tag:'machine',cpu:total?Math.max(0,Math.min(100,(1-idle/total)*100)):0,battery:powerMonitor.isOnBatteryPower()});
  },5000):undefined;
  app.once('before-quit', () => { dispatch({ tag: 'Stop' }); stopWatch();if(machineTimer)clearInterval(machineTimer); tray?.destroy(); globalShortcut.unregisterAll(); screen.removeListener('display-metrics-changed', resize);screen.removeListener('display-added',resize);screen.removeListener('display-removed',resize); });
  window.once('ready-to-show', () => { resize();if (!smoke && state.tag === 'Active' && !state.fullscreen&&!state.settings.paused) window.showInactive(); });
  if(state.tag==='Active'&&state.settings.paused&&!smoke)await window.loadFile(path.join(__dirname,'../renderer/overlay/paused.html'));
  else await window.loadFile(path.join(__dirname, '../renderer/overlay/index.html'), { query: smoke ? { smoke: 'true' } : {} });
  return {onFun:(listener:(value:ReturnType<typeof overlayFun.parse>)=>void)=>{funListeners.add(listener);return()=>{funListeners.delete(listener);};}, window, dispatch, receive, state: () => state, saved: () => saveTail,agent:send,subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};} };
}
