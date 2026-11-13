import { BrowserWindow } from 'electron';
import path from 'node:path';

// A sandboxed gallery with no preload: it has no route to settings, agents, tokens or the OS.
export function createShowcase(options: { smoke?: boolean } = {}) {
  let window: BrowserWindow | undefined;
  return function show(): BrowserWindow {
    if (window && !window.isDestroyed()) { window.show(); window.focus(); return window; }
    const created = new BrowserWindow({
      width: 1360, height: 860, minWidth: 880, minHeight: 620, title: 'Capri Showcase', backgroundColor: '#0c0b12', autoHideMenuBar: true, show: !options.smoke,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, offscreen: Boolean(options.smoke) },
    });
    window = created;
    created.setMenu(null);
    created.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    created.webContents.on('will-navigate', event => event.preventDefault());
    void created.loadFile(path.join(__dirname, '../renderer/showcase/index.html'), options.smoke ? { query: { smoke: 'true' } } : undefined);
    return created;
  };
}
