import { expect, test } from 'vitest';
// @ts-expect-error Retained exposure-sheet module stays JavaScript.
import { Player, ACTS, NEUTRAL } from '../../src/renderer/js/acting.js';
test('signature sheets keep identical exposures at 30 and 60 render fps', () => {
  for (const name of Object.keys(ACTS)) {
    const act=ACTS[name], fps=act.fps || 12;
    const sheet=new Player(name,{at:0});
    let frame=0;
    for(let index=0;index<act.keys.length;index++) {
      const [hold]=act.keys[index];
      const start=frame*1000/fps;
      for(const renderFps of [30,60]) {
        const nextRender=Math.ceil((start+0.01)*renderFps/1000)*1000/renderFps;
        if(nextRender<(frame+hold)*1000/fps) expect(sheet.sample(nextRender).index).toBe(index);
      }
      frame+=hold;
    }
  }
});

test('resting fallback and every standing drawing keep arms lowered',()=>{
  expect(NEUTRAL.armL).toBeLessThan(-0.7);
  expect(NEUTRAL.armR).toBeLessThan(-0.7);
  const player=new Player('stand',{at:0});
  for(const [,pose] of ACTS.stand.keys){
    const resolved=player.resolve(pose,1);
    expect(resolved.armL).toBeLessThan(-0.7);
    expect(resolved.armR).toBeLessThan(-0.7);
  }
  // the other standing cycles: no arm above its rest drawing, and at most one hand on a hip
  for(const name of ['standHip','standLoose'])for(const [,pose] of ACTS[name].keys){
    expect(Math.max(pose.armL,pose.armR),name).toBeLessThan(-0.4);
    expect(Math.min(pose.armL,pose.armR),name).toBeLessThan(-0.7);
  }
});
test('the standing float eases: it holds longest at the top and bottom and never jumps between drawings',()=>{
  for(const name of ['stand','standHip','standLoose']){
    const keys=ACTS[name].keys as any[], bobs=keys.map(([,pose])=>pose.bob), holds=keys.map(([hold])=>hold);
    for(let i=0;i<keys.length;i++)expect(Math.abs(bobs[i]-bobs[(i+1)%keys.length]),name).toBeLessThanOrEqual(2);
    const longest=Math.max(...holds), low=Math.min(...bobs), high=Math.max(...bobs);
    for(let i=0;i<keys.length;i++)if(holds[i]===longest)expect([low,high],name).toContain(bobs[i]);
    expect(keys.every(([,pose])=>pose.waist!==undefined&&pose.hipX!==undefined&&pose.crouch!==undefined),name).toBe(true);
  }
  // slower than before: one float takes two seconds or more
  expect(ACTS.stand.keys.reduce((n:number,[hold]:any)=>n+hold,0)/12).toBeGreaterThanOrEqual(2);
});
test('partial peeks stay upright: a small lean only, arms as drawn, and her cycle waves',()=>{
  for(const name of ['peekHalf','peekBust']){
    expect(ACTS[name].loop&&ACTS[name].directional,name).toBe(true);
    for(const [,pose] of ACTS[name].keys as any){
      expect(Math.abs(pose.tilt??0),name).toBeLessThanOrEqual(10);
      expect(pose.longL??1,name).toBeGreaterThan(0.5);
      expect(pose.longR??1,name).toBeGreaterThan(0.5);
    }
    expect((ACTS[name].keys as any[]).some(([,pose])=>pose.reach>1),name).toBe(true);
  }
  // sinking behind the floor line goes down, never up out of it
  expect(Math.max(...(ACTS.peekBust.keys as any[]).map(([,pose])=>pose.bob??0))).toBeGreaterThan(20);
  expect(Math.min(...(ACTS.peekBust.keys as any[]).map(([,pose])=>pose.bob??0))).toBeGreaterThanOrEqual(-6);
});

const bent=(pose:any)=>['elbows','elbow','elbowL','elbowR','elbowOff'].some(key=>pose[key]);
test('arms bend: resting elbows are soft and elbows stay inside the joint limit',()=>{
  expect(NEUTRAL.elbowL).toBeLessThan(0);
  expect(NEUTRAL.elbowR).toBeLessThan(0);
  for(const [name,act] of Object.entries<any>(ACTS))for(const [,pose] of act.keys)for(const key of ['elbows','elbow','elbowL','elbowR','elbowOff'])
    if(pose[key]!==undefined)expect(Math.abs(pose[key]),name).toBeLessThanOrEqual(2.8);
});
test('every sheet that moves an arm bends one somewhere, apart from arms deliberately straight',()=>{
  const straight=new Set(['pointing','lounge','peek']);
  for(const [name,act] of Object.entries<any>(ACTS)){
    const moves=act.keys.some(([,pose]:any)=>['arms','armL','armR','reach','off'].some(key=>pose[key]!==undefined));
    if(moves&&!straight.has(name))expect(act.keys.some(([,pose]:any)=>bent(pose)),name).toBe(true);
  }
});
test('a reach is straight unless drawn bent, and elbows land on the arm the act means',()=>{
  const right=new Player('point',{at:0,dir:1});
  expect(right.resolve({reach:1},1)).toMatchObject({armR:1,elbowR:0});
  expect(right.resolve({reach:-0.5,elbow:1.7},1)).toMatchObject({armR:-0.5,elbowR:1.7});
  expect(right.resolve({reach:1},-1)).toMatchObject({armL:1,elbowL:0});
  expect(right.resolve({reach:0.3,off:1.2,elbowOff:2},1)).toMatchObject({armR:0.3,armL:1.2,elbowL:2});
  const resolved=right.resolve({arms:1,elbows:0.5},1);
  expect(resolved).toMatchObject({armL:1,armR:1,elbowL:0.5,elbowR:0.5});
  for(const key of ['arms','elbows','elbow','off','elbowOff','reach'])expect(resolved).not.toHaveProperty(key);
});

test('the body is not a plank: standing bends at the waist and shifts its hips, and mirroring follows her',()=>{
  expect(ACTS.stand.keys.every(([,pose]:any)=>pose.waist!==undefined&&pose.hipX!==undefined&&pose.crouch!==undefined)).toBe(true);
  const away=new Player('curious',{at:0,dir:-1});
  expect(away.resolve({waist:0.2,hipX:5},1)).toMatchObject({waist:-0.2,hipX:-5});
  const plain=new Player('hop',{at:0});
  expect(plain.resolve({waist:0.2,hipX:5},-1)).toMatchObject({waist:-0.2,hipX:-5});
  expect(plain.resolve({waist:0.2,hipX:5},1)).toMatchObject({waist:0.2,hipX:5});
});
test('rotation acts only name views the renderer knows, and the stance underneath stays front',()=>{
  const known = new Set(['front', 'side', 'quarter', 'back']);
  for (const [name, act] of Object.entries<any>(ACTS)) for (const [,pose] of act.keys as any) {
    if (pose.view !== undefined) expect(known.has(pose.view), `${name}:${pose.view}`).toBe(true);
  }
  expect(ACTS.turn.keys.some(([,pose]:any)=>pose.view==='side')).toBe(true);
  expect(ACTS.turn.keys.some(([,pose]:any)=>pose.view==='quarter')).toBe(true);
  expect(ACTS.spin.keys.some(([,pose]:any)=>pose.view==='back')).toBe(true);
  const player = new Player('turn', { at: 0 });
  expect(player.resolve({ view: 'side' }, 1)).toMatchObject({ view: 'side' });
  expect(player.resolve({}, 1)).not.toHaveProperty('view');
});
test('peeking keeps only her head in view: her body is turned away and her arms are put away',()=>{
  for(const [,pose] of ACTS.peek.keys as any){
    expect(Math.abs(pose.tilt)).toBeGreaterThan(45);
    expect(pose.head).toBeLessThan(-0.5);
    expect(pose.longL).toBeLessThan(0.05);
    expect(pose.longR).toBeLessThan(0.05);
  }
});
test('sheets with a real crouch or a lean use the body, and limits stay sane',()=>{
  for(const name of ['hop','land','victory','touchdown','crouch','bow','drained','huff','glare','shimmy','tantrum','backflip']){
    expect(ACTS[name].keys.some(([,pose]:any)=>pose.crouch||pose.waist||pose.hipX||pose.thighL),name).toBeTruthy();
  }
  for(const [name,act] of Object.entries<any>(ACTS))for(const [,pose] of act.keys){
    if(pose.waist!==undefined)expect(Math.abs(pose.waist),name).toBeLessThanOrEqual(0.75);
    if(pose.crouch!==undefined)expect(pose.crouch,name).toBeLessThanOrEqual(62);
    if(pose.hipX!==undefined)expect(Math.abs(pose.hipX),name).toBeLessThanOrEqual(22);
  }
});
