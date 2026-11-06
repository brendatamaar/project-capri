import { expect, test } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readSettings, writeSettings } from '../../src/main/stores/companion-settings';
import { patchSchema, desktopSchema } from '../../src/shared/overlay';
test('settings round trip and missing storage uses defaults', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'capri-settings-'));
  try {
    const defaults = await readSettings(root);
    expect(defaults).toMatchObject({ scale: 0.6, quiet: false, stowed: false, motion: 'auto', fps: 60,possess:false,zap:false,satellite:false });
    const changed = { ...defaults, quiet: true, scale: 0.9 };
    await writeSettings(root, changed);
    expect(await readSettings(root)).toEqual(changed);
    expect(JSON.parse(await readFile(path.join(root, 'companion.json'), 'utf8'))).toEqual(changed);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('renderer cannot add agent settings, invalid scales, or privileged keys', () => {
  for (const value of [{ apiKeys: {} }, { scale: 0 }, { quiet: 'yes' }, { scale: Infinity }, { stowed: 1 }]) expect(patchSchema.safeParse(value).success).toBe(false);
});
test('partial updates contain only supplied fields, without applying stored-setting defaults',()=>{
  expect(patchSchema.parse({quiet:true})).toEqual({quiet:true});
  expect(patchSchema.parse({zap:true})).toEqual({zap:true});
  expect(patchSchema.parse({})).toEqual({});
});
test('desktop frames are parsed before renderer/core use', () => {
  expect(desktopSchema.safeParse({ fg: 0, fullscreen: false, wins: [] }).success).toBe(true);
  expect(desktopSchema.safeParse({ fg: 0, fullscreen: true, wins: [{ id: 1, x: 0, y: 0, w: -1, h: 100, max: false }] }).success).toBe(false);
});
