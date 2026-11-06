import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
const require=createRequire(import.meta.url),asar=require('@electron/asar');
const archive='release/win-unpacked/resources/app.asar';
const entries=asar.listPackage(archive).map(file=>file.replaceAll('\\','/'));
const forbidden=entries.filter(file=>/\/(art\/private|reference|assets\/capri)(\/|$)|\/(\.env(?:\.|$)|companion\.json$|config\.json$|[^/]+\.(pem|key|pfx)$)/i.test(file));
if(forbidden.length)throw new Error(`Prohibited package paths: ${forbidden.join(', ')}`);
for(const file of ['manifest.json','sprite.png','pip.ico']) {
  const relative=path.join('art','placeholder',file);
  if(!asar.extractFile(archive,relative).equals(readFileSync(relative)))throw new Error(`Packaged placeholder mismatch: ${file}`);
}
for(const file of ['LICENSE','THIRD_PARTY_NOTICES.md','licenses/T3Code-MIT.txt','licenses/TheAgencyMGE-MIT.txt'])asar.extractFile(archive,path.normalize(file));
const helper=path.join('release/win-unpacked/resources/app.asar.unpacked/dist/main/read-only.ps1');
if(!readFileSync(helper).equals(readFileSync('src/main/windows/read-only.ps1')))throw new Error('Packaged watcher mismatch');
console.log('PACKAGE_OK: original placeholder, notices, and read-only helper; no private art or local secrets.');
