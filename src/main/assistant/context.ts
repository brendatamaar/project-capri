import {constants} from 'node:fs';
import {lstat, open, readFile} from 'node:fs/promises';
import path from 'node:path';

export const MAX_CONTEXT_BYTES = 64 * 1024;
export const CONTEXT_FILES = ['SOUL', 'USER', 'MEMORY'] as const;
export type ContextDocument = Readonly<{
  tag:'ContextDocument'; text:string; source:'local'|'default';
  reason:null|'missing'|'invalid'|'unavailable';
}>;
export type AssistantContext = Readonly<Record<typeof CONTEXT_FILES[number], ContextDocument>>;

/** Text only: parsing does not interpret Markdown or grant permissions. */
export function parseContext(bytes: Uint8Array): string {
  if (bytes.byteLength > MAX_CONTEXT_BYTES) throw new Error('Invalid context document');
  const text = new TextDecoder('utf-8', {fatal:true, ignoreBOM:true}).decode(bytes);
  if (text.includes('\0')) throw new Error('Invalid context document');
  return text;
}

type ReadResult = {tag:'Loaded'; text:string} | {tag:'Fallback'; reason:'missing'|'invalid'|'unavailable'};
async function readDocument(directory:string, name:typeof CONTEXT_FILES[number], bundled=false):Promise<ReadResult> {
  try {
    const root = await lstat(directory);
    if (!root.isDirectory() || root.isSymbolicLink()) return {tag:'Fallback', reason:'invalid'};
    const filename = path.join(directory, `${name}.md`);
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_CONTEXT_BYTES) return {tag:'Fallback', reason:'invalid'};
    // Electron ASAR stats are virtual; an opened handle refers to an extracted file.
    // Only trusted bundled defaults use archive-aware readFile, with size checks
    // both before reading and in parseContext. Personal files retain handle checks.
    if (bundled) {
      try {return {tag:'Loaded', text:parseContext(await readFile(filename))};}
      catch {return {tag:'Fallback', reason:'invalid'};}
    }
    const handle = await open(filename, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
    try {
      const opened = await handle.stat();
      if (!opened.isFile() || opened.size > MAX_CONTEXT_BYTES || opened.ino !== info.ino || opened.dev !== info.dev) return {tag:'Fallback', reason:'invalid'};
      const bytes = Buffer.alloc(MAX_CONTEXT_BYTES + 1);
      let count = 0;
      while (count < bytes.length) {
        const result = await handle.read(bytes, count, bytes.length - count, count);
        if (result.bytesRead === 0) break;
        count += result.bytesRead;
      }
      try {return {tag:'Loaded', text:parseContext(bytes.subarray(0, count))};}
      catch {return {tag:'Fallback', reason:'invalid'};}
    } finally {await handle.close();}
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {tag:'Fallback', reason:code === 'ENOENT' ? 'missing' : code === 'ELOOP' ? 'invalid' : 'unavailable'};
  }
}

/** Read-only startup snapshot. Personal documents never leave the main process. */
export async function loadAssistantContext(localDirectory:string, defaultsDirectory:string):Promise<AssistantContext> {
  const entries = await Promise.all(CONTEXT_FILES.map(async name => {
    const local = await readDocument(localDirectory, name);
    if (local.tag === 'Loaded') return [name, Object.freeze({tag:'ContextDocument', text:local.text, source:'local', reason:null})] as const;
    const fallback = await readDocument(defaultsDirectory, name, true);
    if (fallback.tag !== 'Loaded') throw new Error('Bundled assistant context unavailable');
    return [name, Object.freeze({tag:'ContextDocument', text:fallback.text, source:'default', reason:local.reason})] as const;
  }));
  return Object.freeze(Object.fromEntries(entries)) as AssistantContext;
}
