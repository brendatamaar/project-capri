import { expect, test } from 'vitest';
import fc from 'fast-check';
import { targetFrameRate, type Activity } from '../frame-policy';
import { spring } from '../motion/spring';
const activities = fc.constantFrom<Activity>('moving','working','idle','asleep');
test('hiddenRendersNothing', () => fc.assert(fc.property(activities, fc.constantFrom<30|60>(30,60), (activity, setting) => {
  expect(targetFrameRate(activity,true,setting)).toBe(0);
})));
test('neverExceedsSetting', () => fc.assert(fc.property(activities,fc.boolean(),fc.constantFrom<30|60>(30,60),(activity,hidden,setting)=>{
  expect(targetFrameRate(activity,hidden,setting)).toBeLessThanOrEqual(setting);
})));
test('idle and asleep budgets stay independent of movement settings',()=>{
  for(const setting of [30,60] as const) {
    expect(targetFrameRate('idle',false,setting)).toBe(15);
    expect(targetFrameRate('asleep',false,setting)).toBe(6);
    expect(targetFrameRate('moving',false,setting)).toBe(setting);
  }
});
test('spring is stable, converges, and agrees at 30 and 60fps',()=>fc.assert(fc.property(fc.double({min:-100,max:100,noNaN:true}),target=>{
  const advance=(fps:number)=>{let state={value:0,velocity:0};for(let n=0;n<fps*3;n++)state=spring(state,target,1/fps);return state;};
  const a=advance(30),b=advance(60);expect(a.value).toBeCloseTo(b.value,8);expect(a.value).toBeCloseTo(target,4);
})));
