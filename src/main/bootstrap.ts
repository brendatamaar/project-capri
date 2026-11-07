// M1 art preview: the imported upstream entry point is intentionally not loaded.
import { app, BrowserWindow, session, protocol, nativeImage } from 'electron';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { loadArtPack, serveArt } from './art';
import { createCompanion } from './windows/overlay';
import { createAgentPanel } from './windows/agent-panel';
import { readSettings } from './stores/companion-settings';
import {loadAssistantContext, type AssistantContext} from './assistant/context';

// Validate bundled/local context before creating windows; assistant turns refresh it.
let assistantContext: AssistantContext | undefined;

const smoke = process.argv.includes('--smoke');
app.setName('Capri Companion');
// Smoke runs never touch an installed Capri profile.
if (smoke) app.setPath('userData', path.join(app.getPath('temp'), `capri-art-smoke-profile-${process.pid}`));
protocol.registerSchemesAsPrivileged([
  { scheme: 'art', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
  { scheme: 'sound', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

app.whenReady().then(async () => {
  if (smoke) console.log('ART_SMOKE_STAGE:ready');
  const testRoot = smoke ? process.argv.find(arg => arg.startsWith('--smoke-art-root='))?.slice('--smoke-art-root='.length) : undefined;
  assistantContext = await loadAssistantContext(
    path.join(app.getPath('userData'), 'assistant'),
    path.join(app.getAppPath(), 'assistant/defaults'),
  );
  if (smoke && Object.values(assistantContext).some(document => document.source !== 'default')) throw new Error('Smoke context isolation failed');
  if (smoke) console.log('ASSISTANT_CONTEXT_OK:bundled-defaults');
  const startupSettings=await readSettings(app.getPath('userData'));
  const pack = await loadArtPack({
    installed: path.join(testRoot ?? path.join(app.getPath('appData'), 'Capri'), 'art'),
    development: path.join(testRoot ?? app.getAppPath(), testRoot ? 'development' : 'art/private'),
    placeholder: path.join(app.getAppPath(), 'art/placeholder'),
  }, bytes => {
    const image = nativeImage.createFromBuffer(bytes);
    return image.isEmpty() ? null : image.getSize();
  },startupSettings.artPack);
  if (smoke) console.log('ART_SMOKE_STAGE:pack-loaded');
  protocol.handle('art', async request => {
    if (smoke) console.log('ART_SMOKE_STAGE:protocol-request');
    const response = await serveArt(pack, request.url);
    if (smoke) console.log(`ART_SMOKE_STAGE:protocol-response-${response.status}`);
    response.headers.set('Access-Control-Allow-Origin', '*');
    return response;
  });
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !details.url.startsWith('file:') && !details.url.startsWith('art://pack/') && !details.url.startsWith('sound://custom/') });
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  if ((!smoke && !process.argv.includes('--art-preview')) || process.argv.includes('--smoke-overlay')) {
    let openBoard:undefined|(()=>void),openAssistant:undefined|(()=>void);
    const companion = await createCompanion(smoke,pack.descriptor,smoke?undefined:()=>openBoard?.(),smoke?undefined:()=>openAssistant?.());
    if(!smoke){const demo=process.argv.includes('--agent-demo')?await (await import('./t3/demo')).demoConnection():undefined;const board=await createAgentPanel(companion,demo);openBoard=board.show;if(demo)board.show();const {createAssistantPanel}=await import('./windows/assistant-panel');const assistant=await createAssistantPanel(companion,board);openAssistant=assistant.show;}
    if(smoke&&process.argv.includes('--smoke-assistant')){const {assistantSmoke}=await import('./assistant/smoke');await assistantSmoke(companion);app.quit();return;}
    if(smoke&&process.argv.includes('--smoke-agent')){const {agentSmoke}=await import('./agent/smoke');await agentSmoke(companion);app.quit();return;}
    if (smoke) {
      const { window } = companion;
      window.webContents.on('console-message', details => console.log('OVERLAY_RENDERER:', details.message));
      await window.webContents.executeJavaScript(`new Promise((resolve,reject) => {
        const check=()=>document.body.dataset.ready==='true'?resolve(true):document.body.dataset.ready==='failed'?reject(new Error('Overlay failed')):setTimeout(check,25);check();
      })`);
      const result = await window.webContents.executeJavaScript(`(async()=>{
        const {capri,hit,host}=window.__companionTest;
        const head=capri.screenPoint(118,111);
        if(!hit(head.x,head.y)||hit(2,2)) throw new Error('Pixel hit-test failed');
        if('chatSend' in host || 'pcDo' in host || 'installHooks' in host) throw new Error('Privileged bridge leaked');
        let rejected=false;try{await host.update({scale:99})}catch{rejected=true}if(!rejected)throw new Error('Invalid settings accepted');
        await host.update({quiet:true});
        await host.update({fps:30,zap:true});
        await host.update({quiet:true});
        const preserved=await host.settings();if(preserved.fps!==30||!preserved.zap)throw new Error('Partial settings reset preferences');
        await host.update({fps:60,zap:false});
        for(const fps of [30,60]) {
          capri.frameSetting=fps; capri.busy=true;
          if(Math.abs(capri.interval()-1000/fps)>0.001) throw new Error('Frame setting ignored');
          capri.busy=false;
        }
        capri.setHidden(true); if(capri.loopHandle!==null) throw new Error('Hidden loop not paused');
        capri.setHidden(false);
        const screens=await host.screens();
        await host.moveScreen(screens.current);
        let unknown=false;try{await host.moveScreen(999999999)}catch{unknown=true}if(!unknown)throw new Error('Unknown screen accepted');
        if(capri.zap(0,0)!==false)throw new Error('Disabled zap ran');
        if(!capri.canSit({id:-1,x:300,y:300,w:80,h:60,max:false,kind:'icon'}))throw new Error('Icon seating unavailable');
        return {visible:true};
      })()`);
      if(pack.descriptor.faceAnchor) {
        const faceReady=await window.webContents.executeJavaScript(`Boolean(document.querySelector('[data-live-face]'))`);
        if(!faceReady)throw new Error('Optional live face not created');
        console.log('M4_FACE_OK:optional-original-face');
      }
      companion.receive({ fg: 0, fullscreen: true, wins: [] });
      if (companion.state().tag !== 'Active') throw new Error('Unexpected stopped state');
      await window.webContents.executeJavaScript(`new Promise(resolve=>{
        const check=()=>window.__companionTest.capri.hidden?resolve(true):setTimeout(check,25);check();
      })`);
      companion.receive({ fg: 0, fullscreen: false, wins: [] });
      const pausedPage=new Promise<void>(resolve=>window.webContents.once('did-finish-load',()=>resolve()));
      companion.dispatch({tag:'SettingsChanged',patch:{paused:true}});
      await pausedPage;
      if(!window.webContents.getURL().endsWith('/paused.html'))throw new Error('Pause did not destroy active document');
      const resumedPage=new Promise<void>(resolve=>window.webContents.once('did-finish-load',()=>resolve()));
      companion.dispatch({tag:'SettingsChanged',patch:{paused:false}});
      await resumedPage;
      await window.webContents.executeJavaScript(`new Promise((resolve,reject)=>{
        const check=()=>document.body.dataset.ready==='true'?resolve(true):document.body.dataset.ready==='failed'?reject(new Error('Resume failed')):setTimeout(check,25);check();
      })`);
      await companion.saved();
      console.log('M2_SMOKE_OK:overlay-hit-ipc-fullscreen-settings');
      app.quit();
    }
    return;
  }
  const window = new BrowserWindow({
    width: 700, height: 520, show: !smoke,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  if (smoke) console.log('ART_SMOKE_STAGE:window-created');
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  if (smoke) window.webContents.on('console-message', details => console.log('ART_SMOKE_RENDERER:', details.message));
  window.webContents.on('will-navigate', event => event.preventDefault());
  await window.loadFile(path.join(__dirname, '../renderer/art-preview/index.html'));
  if (smoke) console.log('ART_SMOKE_STAGE:page-loaded');
  if (smoke) {
    const result = await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
      const check = () => {
        if (document.body.dataset.ready === 'true') resolve({ source: document.body.dataset.source, optional: document.body.dataset.optional });
        else if (document.body.dataset.ready === 'failed') reject(new Error('Art preview failed'));
        else setTimeout(check, 25);
      };
      check();
    })`);
    if (testRoot) {
      // Author a tiny original WebP fixture through Chromium, never from reference art.
      const webp: string = await window.webContents.executeJavaScript(`(() => {
        const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2;
        const context = canvas.getContext('2d'); context.fillStyle = '#3fada7'; context.fillRect(0, 0, 2, 2);
        return canvas.toDataURL('image/webp');
      })()`);
      if (!webp.startsWith('data:image/webp;base64,')) throw new Error('WebP fixture could not be encoded');
      await writeFile(path.join(testRoot, 'optional.webp'), Buffer.from(webp.split(',')[1], 'base64'));
    }
    console.log(`M1_SMOKE_OK:${result.source}:sprite-rendered:optional-${result.optional}`);
    app.quit();
  }
}).catch(error => { console.error(error); app.exit(1); });
app.on('window-all-closed', () => app.quit());
