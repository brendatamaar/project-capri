import {expect,test} from 'vitest';
import fc from 'fast-check';
import {mapPose} from '../motion/pose-map';
import {autonomousClips, isFaceOnlyClip, sampleClip} from '../motion/clip';
// @ts-expect-error Retained exposure-sheet module stays JavaScript.
import {ACTS} from '../../renderer/js/acting.js';
import {samplePlayfulMotion,sampleIdleLife} from '../motion/playful';
import {CLIPS} from '../../renderer/overlay/motion/clips';

test('raising an arm raises it, and a wave changes the raised arm',()=>{
 fc.assert(fc.property(fc.double({min:0.01,max:1,noNaN:true}),raise=>{
  expect(mapPose({armLRaise:raise}).armL).toBeGreaterThan(0);
  expect(mapPose({armRRaise:raise}).armR).toBeGreaterThan(0);
 }));
 expect(mapPose({armRRaise:0.8,armRWave:0.5}).armR).toBeGreaterThan(mapPose({armRRaise:0.8,armRWave:-0.5}).armR);
 expect(mapPose({headPitch:0.4}).head).not.toBe(0);
 expect(mapPose({headYaw:0.4}).head).not.toBe(0);
});

test('all clips settle to neutral and enter without a float discontinuity',()=>{
 for(const clip of CLIPS){
  expect(mapPose(sampleClip(clip,0,42))).toEqual(mapPose({}));
  expect(mapPose(sampleClip(clip,clip.duration,42))).toEqual(mapPose({}));
  const first=mapPose(sampleClip(clip,0.000001,42));
  for(const value of Object.values(first))expect(Math.abs(value)).toBeLessThan(0.001);
 }
});

test('every clip stays finite and bounded throughout playback at 30 and 60 fps',()=>{
 for(const clip of CLIPS)for(const fps of [30,60]){
  let previous=mapPose({});
  for(let frame=0;frame<=Math.ceil(clip.duration*fps);frame++){
   const pose=mapPose(sampleClip(clip,frame/fps,17));
   for(const value of Object.values(pose))expect(Number.isFinite(value)).toBe(true);
   expect(Math.abs(pose.head)).toBeLessThanOrEqual(0.5);
   expect(Math.abs(pose.armL)).toBeLessThanOrEqual(2.5);
   expect(Math.abs(pose.armR)).toBeLessThanOrEqual(2.5);
   expect(Math.abs(pose.bob-previous.bob)).toBeLessThan(3);
   previous=pose;
  }
 }
});

test('a full clip raise clears horizontal and gaze turns the head without a face',()=>{
 expect(mapPose({armLRaise:1}).armL).toBeGreaterThanOrEqual(2.3);
 expect(mapPose({armRRaise:1}).armR).toBeGreaterThanOrEqual(2.3);
 expect(mapPose({armRRaise:1}).armR-0.85).toBeGreaterThan(1.4); // over the -0.85 rest angle: overhead, not a T-pose
 expect(mapPose({gazeX:1}).head).toBeGreaterThan(0.05);
 expect(mapPose({gazeX:-1}).head).toBeLessThan(-0.05);
});

test('autonomous clips are idle-tagged and visible on the current pack',()=>{
 const blink=CLIPS.find(clip=>clip.name==='slow_blink')!;
 expect(isFaceOnlyClip(blink)).toBe(true);
 expect(isFaceOnlyClip(CLIPS.find(clip=>clip.name==='wave_big')!)).toBe(false);
 for(const hasFace of [false,true]) for(const clip of autonomousClips(CLIPS,hasFace)) expect(clip.tags).toContain('idle');
 expect(autonomousClips(CLIPS,false)).not.toContain(blink);
 expect(autonomousClips(CLIPS,true)).toContain(blink);
 expect(autonomousClips(CLIPS,true).map(clip=>clip.name)).not.toContain('wave_big');
 expect(autonomousClips(CLIPS,true).map(clip=>clip.name)).not.toContain('giggle');
});

test('giggle bounces the head with the body instead of vibrating in place',()=>{
 const clip=CLIPS.find(candidate=>candidate.name==='giggle')!;
 let previous=mapPose({}), maxStep=0, peakHead=0;
 for(let frame=0;frame<=Math.ceil(clip.duration*60);frame++){
  const pose=mapPose(sampleClip(clip,frame/60,42));
  maxStep=Math.max(maxStep,Math.abs(pose.bob-previous.bob)); peakHead=Math.max(peakHead,Math.abs(pose.head)); previous=pose;
 }
 expect(maxStep).toBeLessThan(0.4);
 expect(peakHead).toBeGreaterThan(0.02);
});

test('arm-heavy sheets settle back to rest before they cut to the stance',()=>{
 for(const name of ['victory','stretch','alarm']) expect(Object.keys(ACTS[name].keys.at(-1)[1]),name).toHaveLength(0);
});

test('playful offsets are bounded, deterministic and disabled exactly',()=>{
 fc.assert(fc.property(fc.double({min:0,max:1e9,noNaN:true}),fc.double({min:0,max:1,noNaN:true}),fc.double({min:0,max:1,noNaN:true}),(now,dance,chaos)=>{
  const pose=samplePlayfulMotion(now,dance,chaos);
  expect(pose).toEqual(samplePlayfulMotion(now,dance,chaos));
  expect(Math.abs(pose.head)).toBeLessThanOrEqual(0.3);
  expect(Math.abs(pose.armL)).toBeLessThanOrEqual(0.6);
  expect(Math.abs(pose.armR)).toBeLessThanOrEqual(0.6);
  expect(Math.abs(pose.mane)).toBeLessThanOrEqual(0.15);
  expect(Math.abs(pose.elbowL)).toBeLessThanOrEqual(1.9);
  expect(Math.abs(pose.elbowR)).toBeLessThanOrEqual(1.7);
  expect(Math.abs(pose.bob)).toBeLessThanOrEqual(4);
  expect(samplePlayfulMotion(now,0,0)).toEqual({head:0,armL:0,armR:0,waist:0,hipX:0,crouch:0,elbowL:0,elbowR:0,mane:0,bob:0,tilt:0});
 }));
});

test('idle life is bounded, stepped on threes, and exactly nothing at zero weight',()=>{
 fc.assert(fc.property(fc.double({min:0,max:1e9,noNaN:true}),fc.double({min:-5,max:5,noNaN:true}),fc.double({min:-1,max:3,noNaN:true}),(now,look,weight)=>{
  const pose=sampleIdleLife(now,look,weight);
  expect(Math.abs(pose.head)).toBeLessThanOrEqual(0.07);
  expect(Math.abs(pose.bob)).toBeLessThanOrEqual(0.9);
  expect(Math.abs(pose.sy-1)).toBeLessThanOrEqual(0.004);
  expect(sampleIdleLife(now,look,0)).toEqual({head:0,hair:0,tilt:0,bob:0,waist:0,hipX:0,sy:1});
 }));
 expect(sampleIdleLife(1001,0.2,1)).toEqual(sampleIdleLife(1040,0.2,1));
});
