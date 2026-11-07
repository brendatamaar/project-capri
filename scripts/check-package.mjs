import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),asar=require('@electron/asar');
const archive='release/win-unpacked/resources/app.asar';
const entries=asar.listPackage(archive).map(file=>file.replaceAll('\\','/'));
const forbidden=entries.filter(file=>/\/(art\/private|reference|assets\/capri)(\/|$)|\/(\.env(?:\.|$)|companion\.json$|config\.json$|t3-connection\.bin$|approval-audit\.jsonl$|[^/]+\.credential$|[^/]+\.(pem|key|pfx)$)/i.test(file));
if(forbidden.length)throw new Error(`Prohibited package paths: ${forbidden.join(', ')}`);
for(const file of ['manifest.json','sprite.png','pip.ico']) {
  const relative=path.join('art','placeholder',file);
  if(!asar.extractFile(archive,relative).equals(readFileSync(relative)))throw new Error(`Packaged placeholder mismatch: ${file}`);
}
for(const file of ['LICENSE','THIRD_PARTY_NOTICES.md','licenses/T3Code-MIT.txt','licenses/TheAgencyMGE-MIT.txt'])asar.extractFile(archive,path.normalize(file));
const helper=path.join('release/win-unpacked/resources/app.asar.unpacked/dist/main/read-only.ps1');
if(!readFileSync(helper).equals(readFileSync('src/main/windows/read-only.ps1')))throw new Error('Packaged watcher mismatch');
console.log('PACKAGE_OK: original placeholder, notices, and read-only helper; no private art or local secrets.');

for(const file of ['dist/preload/panel.cjs','dist/renderer/panel/index.html','dist/renderer/panel/panel.js','dist/renderer/panel/style.css'])asar.extractFile(archive,path.normalize(file));
const panel=asar.extractFile(archive,path.normalize('dist/renderer/panel/index.html')).toString();
if(!panel.includes("default-src 'none'")||!panel.includes("script-src 'self'"))throw new Error('Packaged panel CSP missing');
console.log('PACKAGE_AGENT_OK: board/preload present; no connection secrets or audit data bundled.');
for (const name of ['SOUL','USER','MEMORY']) {
  const relative = path.join('assistant','defaults',`${name}.md`);
  if (!asar.extractFile(archive,relative).equals(readFileSync(relative))) throw new Error(`Bundled context mismatch: ${name}`);
}
if (entries.some(file => /\/(?:SOUL|USER|MEMORY)\.md$/.test(file) && !file.startsWith('/assistant/defaults/'))) throw new Error('Personal assistant context bundled');
console.log('PACKAGE_CONTEXT_OK: bundled defaults only.');
for(const file of ['dist/preload/assistant.cjs','dist/renderer/assistant/index.html','dist/renderer/assistant/assistant.js','dist/renderer/assistant/style.css'])asar.extractFile(archive,path.normalize(file));
const assistant=asar.extractFile(archive,path.normalize('dist/renderer/assistant/index.html')).toString();
if(!assistant.includes("default-src 'none'")||!assistant.includes("script-src 'self'"))throw new Error('Assistant CSP missing');
const controls=path.join('release/win-unpacked/resources/app.asar.unpacked/dist/main/assistant-controls.ps1');
if(!readFileSync(controls).equals(readFileSync('src/main/assistant/assistant-controls.ps1')))throw new Error('Native controls mismatch');
if(entries.some(file=>/\/(assistant-provider\.bin|assistant\.sqlite(?:-wal|-shm)?|notes)(?:\/|$)/i.test(file)))throw new Error('Personal assistant data bundled');
console.log('PACKAGE_ASSISTANT_OK: isolated UI, fixed native helper and no personal data.');
