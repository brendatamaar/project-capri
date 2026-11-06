import { expect,test } from 'vitest';
import fc from 'fast-check';
import { CLIPS } from '../../renderer/overlay/motion/clips';
import { NEUTRAL } from '../../renderer/overlay/motion/params';
import { sampleClip } from '../motion/clip';
import { mapPose,ZERO_POSE } from '../motion/pose-map';
import { mixPose,clipWeight } from '../motion/mixer';
import { stepMotion,type MotionState } from '../motion/scheduler';
test('sampleIsDeterministic',()=>fc.assert(fc.property(fc.integer(),fc.double({min:0,max:3,noNaN:true}),(seed,time)=>{
  for(const clip of CLIPS)expect(sampleClip(clip,time,seed)).toEqual(sampleClip(clip,time,seed));
})));
test('clipEndsNeutral and neutralMapsToNeutral',()=>{
  for(const clip of CLIPS)for(const t of [0,clip.duration,clip.duration+1])expect(mapPose(sampleClip(clip,t,42))).toEqual(ZERO_POSE);
  expect(mapPose({})).toEqual(ZERO_POSE);
  expect(mapPose(NEUTRAL)).toEqual(ZERO_POSE);
});
test('outputsStayClamped',()=>fc.assert(fc.property(fc.double({noNaN:true}),value=>{
  const pose=mapPose({headRoll:value,bodyY:value,glitch:value,lean:value,armSpread:value});
  expect(Math.abs(pose.head)).toBeLessThanOrEqual(0.5);expect(Math.abs(pose.bob)).toBeLessThanOrEqual(12);
  expect(Math.abs(pose.tilt)).toBeLessThanOrEqual(12);expect(pose.glitch).toBeLessThanOrEqual(0.25);
})));
test('signatureActsWin and weightsStayBounded',()=>fc.assert(fc.property(fc.double({noNaN:true}),weight=>{
  const base={...ZERO_POSE,head:0.4},clip={...ZERO_POSE,head:0.5};
  expect(mixPose(base,clip,weight,true)).toBe(base);
  expect(clipWeight(weight)).toBeGreaterThanOrEqual(0);expect(clipWeight(weight)).toBeLessThanOrEqual(1);
})));
const candidates=[{name:'subtle',duration:2,subtle:true},{name:'large',duration:2,subtle:false}];
test('quiet scheduler only chooses subtle clips and avoids recent choices',()=>{
  const initial:MotionState={tag:'Waiting',nextAt:0,recent:[]};
  const result=stepMotion(initial,{tag:'Pulse',now:0,runId:1,choice:0.99,eligible:true,quiet:true,candidates});
  expect(result.state.tag==='Playing'&&result.state.name).toBe('subtle');
  const next=stepMotion({tag:'Waiting',nextAt:0,recent:['subtle']},{tag:'Pulse',now:0,runId:2,choice:0,eligible:true,quiet:false,candidates});
  expect(next.state.tag==='Playing'&&next.state.name).toBe('large');
});
test('stale clip results ignored and signature start requests a bounded fade',()=>{
  const state:MotionState={tag:'Playing',name:'large',runId:7,startedAt:0,endsAt:2000,recent:['large']};
  expect(stepMotion(state,{tag:'Ended',runId:6,now:10}).state).toBe(state);
  const fade=stepMotion(state,{tag:'Stop',now:10});
  expect(fade.state.tag).toBe('Fading');expect(fade.commands).toEqual([{tag:'ScheduleEnd',runId:7,afterMs:120}]);
});
test('ineligible inputs never start clips',()=>fc.assert(fc.property(fc.double({min:0,max:1,noNaN:true}),choice=>{
  expect(stepMotion({tag:'Waiting',nextAt:0,recent:[]},{tag:'Pulse',now:100,runId:1,choice,eligible:false,quiet:false,candidates}).state.tag).toBe('Waiting');
})));
test('ten virtual minutes retain variety without repeating the recent three clips',()=>{
  let state:MotionState={tag:'Waiting',nextAt:0,recent:[]};const selected:string[]=[];
  const available=CLIPS.map(clip=>({name:clip.name,duration:clip.duration,subtle:clip.tags.includes('subtle')}));
  for(let now=0;now<600000;now+=1000) {
    const prior=state;
    state=stepMotion(state,{tag:'Pulse',now,runId:now+1,choice:(now*0.618033)%1,eligible:true,quiet:false,candidates:available}).state;
    if(prior.tag==='Waiting'&&state.tag==='Playing') { expect(prior.recent).not.toContain(state.name);selected.push(state.name); }
  }
  expect(new Set(selected).size).toBeGreaterThan(5);
});
