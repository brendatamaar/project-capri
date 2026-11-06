import { spawn } from 'node:child_process';
import readline from 'node:readline';
import path from 'node:path';
import { screen, type BrowserWindow } from 'electron';
import { desktopSchema, type Desktop } from '../../shared/overlay';
export function watchWindows(window: BrowserWindow, receive: (snapshot: Desktop) => void, failed: () => void) {
  const handle = window.getNativeWindowHandle();
  const own = handle.length >= 8 ? handle.readBigUInt64LE() : BigInt(handle.readUInt32LE());
  const script = path.join(__dirname, 'read-only.ps1').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
  const child = spawn('powershell.exe', ['-STA','-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, String(own), String(process.pid)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stopped = false;
  let last:Desktop|undefined;
  const publish=()=>{
    if(stopped||!last||window.isDestroyed())return;
    const origin=window.getBounds();
    receive({...last,wins:last.wins.map(win=>{const dip=screen.screenToDipRect(null,{x:win.x,y:win.y,width:win.w,height:win.h});return {...win,x:dip.x-origin.x,y:dip.y-origin.y,w:dip.width,h:dip.height};})});
  };
  window.on('move',publish);
  const lines = readline.createInterface({ input: child.stdout });
  lines.on('line', line => {
    if (stopped || window.isDestroyed() || line.length > 100000) return;
    try {
      const result = desktopSchema.safeParse(JSON.parse(line));
      if (!result.success) return;
      last=result.data;publish();
    } catch { /* Outside data is never forwarded before successful parsing. */ }
  });
  child.stderr.resume();
  child.on('error', () => { if (!stopped) failed(); });
  child.on('exit', () => { if (!stopped) failed(); });
  return () => { stopped = true;window.removeListener('move',publish); lines.close(); child.kill(); };
}
