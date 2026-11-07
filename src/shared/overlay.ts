import { z } from 'zod';
import type { Settings, Action } from '../core/companion';
export const settingsSchema = z.object({
  scale: z.number().finite().min(0.3).max(1.2).default(0.6), quiet: z.boolean().default(false),
  stowed: z.boolean().default(false), motion: z.enum(['auto', 'full', 'reduced']).default('auto'),
  fps: z.union([z.literal(30), z.literal(60)]).default(60),
  paused:z.boolean().default(false),wander:z.boolean().default(true),drag:z.boolean().default(true),peek:z.boolean().default(true),pet:z.boolean().default(true),zap:z.boolean().default(false),satellite:z.boolean().default(false),pcReactions:z.boolean().default(false),possess:z.boolean().default(false),follow:z.boolean().default(true),
  rest:z.enum(['corner','taskbar','floor']).default('corner'),displayId:z.number().int().safe().nullable().default(null),
  artPack:z.enum(['auto','installed','development','placeholder']).default('auto'),startWithWindows:z.boolean().default(false),
}).strict();
// Strip defaults before making fields optional: a patch must never reset omitted preferences.
export const patchSchema = z.object(Object.fromEntries(Object.entries(settingsSchema.shape).map(([key,value])=>[key,value.removeDefault().optional()]))).strict() as z.ZodType<Partial<Settings>>;
export const actionSchema = z.enum(['teleport', 'sleep', 'wake','peek','lie','zap','satellite','showcase','sit-icon']);
export const frameSchema = z.object({ id: z.number().int().safe(), x: z.number().finite(), y: z.number().finite(), w: z.number().positive().finite(), h: z.number().positive().finite(), max: z.boolean(),kind:z.enum(['window','icon']).optional() }).strict();
export const desktopSchema = z.object({ fg: z.number().int().safe(), fullscreen: z.boolean(), wins: z.array(frameSchema).max(256),game:z.boolean().optional(),removableDevices:z.number().int().min(0).max(256).optional(),deviceRevision:z.number().int().safe().nonnegative().optional() }).strict();
export type Desktop = z.infer<typeof desktopSchema>;
export type Screens = {current:number;origin:{x:number;y:number};floorGap:number;list:{id:number;x:number;y:number;w:number;h:number}[]};
export type OverlayEvent = {tag:'assistantPoint';runId:number;x:number;y:number;label:string} | {tag:'assistantStop'} | {tag:'agent';active:boolean;presence:string;caption:string;card?:{x:number;y:number;w:number;h:number}} | {tag:'agentReaction';kind:'Done'|'Failed'|'NeedsYou'|'Working'} | { tag: 'settings'; settings: Settings } | { tag: 'hidden'; hidden: boolean } | { tag: 'action'; action: Action } | { tag: 'desktop'; desktop: Desktop } | { tag: 'resize'; width: number; height: number;floorGap:number } | {tag:'screen';id:number} | {tag:'machine';cpu:number;battery:boolean};
export interface OverlayHost {
  settings(): Promise<Settings>;
  update(patch: Partial<Settings>): Promise<void>;
  interactive(on: boolean): void;
  menu(): void;
  cursor(): Promise<{ x: number; y: number;display:number;inside:boolean }>;
  sounds(): Promise<{ name: string; url: string }[]>;
  desktop(): Promise<Desktop>;
  screens():Promise<Screens>;
  moveScreen(id:number):Promise<Screens>;
  onEvent(listener: (event: OverlayEvent) => void): () => void;
}
