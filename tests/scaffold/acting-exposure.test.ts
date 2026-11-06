import { expect, test } from 'vitest';
// @ts-expect-error Retained exposure-sheet module stays JavaScript.
import { Player, ACTS } from '../../src/renderer/js/acting.js';
test('signature sheets keep identical exposures at 30 and 60 render fps', () => {
  for (const name of ['victory', 'stand', 'grabbed']) {
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
