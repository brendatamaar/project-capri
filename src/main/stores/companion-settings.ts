import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { settingsSchema } from '../../shared/overlay';
import type { Settings } from '../../core/companion';
export async function readSettings(directory: string): Promise<Settings> {
  try { return settingsSchema.parse(JSON.parse(await readFile(path.join(directory, 'companion.json'), 'utf8'))); }
  catch { return settingsSchema.parse({}); }
}
export async function writeSettings(directory: string, settings: Settings) {
  const parsed = settingsSchema.parse(settings);
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, 'companion.json');
  await writeFile(`${target}.tmp`, JSON.stringify(parsed, null, 2));
  await rename(`${target}.tmp`, target);
}
