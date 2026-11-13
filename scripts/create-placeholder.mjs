// Original code-drawn artwork: Pip, a brass lantern robot. No reference inputs.
// Kept reproducible so the committed PNGs have reviewable provenance.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
const width = 240, height = 420;
const colors = { ink: [26, 49, 57], teal: [63, 173, 167], light: [167, 231, 215], brass: [218, 168, 75], glass: [35, 82, 95], white: [255, 239, 194] };
const box = (list, x, y, w, h, color) => list.push({ hit: (px, py) => px >= x && px < x + w && py >= y && py < y + h, color: colors[color] });
const circle = (list, x, y, r, color) => list.push({ hit: (px, py) => (px-x)**2 + (py-y)**2 <= r*r, color: colors[color] });
function frontShapes() {
  const shapes = [];
  // Off-centre antenna and a round lantern head; no mane, mask, horns, or human face.
  box(shapes, 99, 43, 6, 29, 'brass'); circle(shapes, 102, 41, 8, 'teal');
  circle(shapes, 118, 111, 45, 'ink'); circle(shapes, 118, 111, 40, 'teal');
  circle(shapes, 118, 111, 30, 'brass'); circle(shapes, 118, 111, 25, 'glass');
  circle(shapes, 118, 111, 14, 'light'); circle(shapes, 114, 106, 5, 'white');
  box(shapes, 108, 147, 20, 14, 'ink'); box(shapes, 112, 149, 12, 12, 'brass');
  // Squat tank body and one reaching arm, placed in mochi-v1's deformation regions.
  box(shapes, 95, 162, 48, 72, 'ink'); box(shapes, 100, 168, 38, 59, 'teal');
  box(shapes, 108, 180, 22, 32, 'brass'); box(shapes, 113, 184, 12, 23, 'glass');
  circle(shapes, 119, 196, 4, 'white');
  circle(shapes, 98, 172, 9, 'brass'); box(shapes, 82, 171, 14, 24, 'ink');
  box(shapes, 43, 189, 48, 13, 'ink'); box(shapes, 44, 192, 44, 7, 'teal');
  circle(shapes, 39, 199, 12, 'brass'); circle(shapes, 37, 198, 5, 'glass');
  circle(shapes, 139, 175, 9, 'brass'); box(shapes, 140, 182, 11, 41, 'ink');
  box(shapes, 143, 185, 5, 32, 'teal'); circle(shapes, 145, 224, 9, 'brass');
  // Telescoping legs align with HIP=232 and KNEE=305; short round boots reach y=418.
  for (const x of [106, 142]) {
    box(shapes, x-6, 232, 12, 69, 'ink'); box(shapes, x-3, 236, 6, 64, 'brass');
    circle(shapes, x, 305, 10, 'teal'); box(shapes, x-5, 313, 10, 83, 'ink');
    box(shapes, x-2, 317, 4, 71, 'brass'); box(shapes, x-13, 396, 28, 21, 'ink');
    box(shapes, x-9, 399, 21, 12, 'teal');
  }
  return shapes;
}
function sideShapes() {
  // Profile facing left: the round head reads the same from the side, the tank is narrow,
  // and the legs overlap with the feet pointing left. No arms: the renderer reuses the
  // front reaching arm from the same arm zone (see compositeArm below).
  const shapes = [];
  box(shapes, 115, 43, 6, 29, 'brass'); circle(shapes, 118, 41, 8, 'teal');
  circle(shapes, 118, 111, 45, 'ink'); circle(shapes, 118, 111, 40, 'teal');
  circle(shapes, 118, 111, 30, 'brass'); circle(shapes, 118, 111, 25, 'glass');
  circle(shapes, 118, 111, 14, 'light'); circle(shapes, 114, 106, 5, 'white');
  box(shapes, 108, 147, 20, 14, 'ink'); box(shapes, 112, 149, 12, 12, 'brass');
  box(shapes, 102, 162, 34, 72, 'ink'); box(shapes, 107, 168, 24, 59, 'teal');
  box(shapes, 110, 180, 18, 32, 'brass'); box(shapes, 114, 184, 10, 23, 'glass');
  circle(shapes, 119, 196, 4, 'white');
  circle(shapes, 104, 172, 8, 'brass');
  for (const x of [112, 126]) {
    box(shapes, x-6, 232, 12, 69, 'ink'); box(shapes, x-3, 236, 6, 64, 'brass');
    circle(shapes, x, 305, 10, 'teal'); box(shapes, x-5, 313, 10, 83, 'ink');
    box(shapes, x-2, 317, 4, 71, 'brass'); box(shapes, x-20, 396, 30, 21, 'ink');
    box(shapes, x-17, 399, 24, 12, 'teal');
  }
  return shapes;
}
function backShapes() {
  // From behind: the lantern glass is dark, the reaching arm is omitted (composited back
  // from the front texture), and the far-side hanging arm stays where it is.
  const shapes = [];
  box(shapes, 99, 43, 6, 29, 'brass'); circle(shapes, 102, 41, 8, 'teal');
  circle(shapes, 118, 111, 45, 'ink'); circle(shapes, 118, 111, 40, 'teal');
  circle(shapes, 118, 111, 30, 'brass'); circle(shapes, 118, 111, 25, 'ink');
  circle(shapes, 118, 111, 8, 'brass');
  box(shapes, 108, 147, 20, 14, 'ink'); box(shapes, 112, 149, 12, 12, 'brass');
  box(shapes, 95, 162, 48, 72, 'ink'); box(shapes, 100, 168, 38, 59, 'teal');
  box(shapes, 108, 180, 22, 32, 'brass'); box(shapes, 113, 184, 12, 23, 'ink');
  circle(shapes, 139, 175, 9, 'brass'); box(shapes, 140, 182, 11, 41, 'ink');
  box(shapes, 143, 185, 5, 32, 'teal'); circle(shapes, 145, 224, 9, 'brass');
  for (const x of [106, 142]) {
    box(shapes, x-6, 232, 12, 69, 'ink'); box(shapes, x-3, 236, 6, 64, 'brass');
    circle(shapes, x, 305, 10, 'teal'); box(shapes, x-5, 313, 10, 83, 'ink');
    box(shapes, x-2, 317, 4, 71, 'brass'); box(shapes, x-13, 396, 28, 21, 'ink');
    box(shapes, x-9, 399, 21, 12, 'teal');
  }
  return shapes;
}
function render(shapes) {
  const raw = Buffer.alloc((width*4+1)*height);
  // Four subpixel samples per pixel give crisp antialiasing and transparent edges.
  for (let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const samples=[];
    for(const dx of [0.25,0.75]) for(const dy of [0.25,0.75]) {
      let color=null;
      for(const shape of shapes) if(shape.hit(x+dx,y+dy)) color=shape.color;
      if(color) samples.push(color);
    }
    const at=y*(width*4+1)+1+x*4;
    if(samples.length) {
      for(let c=0;c<3;c++) raw[at+c]=Math.round(samples.reduce((sum,color)=>sum+color[c],0)/samples.length);
      raw[at+3]=Math.round(samples.length/4*255);
    }
  }
  return raw;
}
// The shader draws both arms from the front texture's arm zone (see armL in sprite.js),
// so each side view carries the front arm pixels there, exactly as the private-pack builder does.
function armL(x, y) {
  if (x > 101 || y > 234) return false;
  const top = 159 + (98 - x) * 0.5;
  const bot = x < 50 ? 234 : 178 + (98 - x) * 0.62;
  return y >= top && y <= bot;
}
function compositeArm(view, front) {
  for (let y=0;y<height;y++) for(let x=0;x<width;x++) {
    if (!armL(x, y)) continue;
    const at=y*(width*4+1)+1+x*4;
    front.copy(view, at, at, at+4);
  }
}
function crc32(bytes) {
  let crc=0xffffffff;
  for(const byte of bytes) { crc^=byte; for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0); }
  return (crc^0xffffffff)>>>0;
}
function chunk(name,data) {
  const type=Buffer.from(name), size=Buffer.alloc(4), checksum=Buffer.alloc(4);
  size.writeUInt32BE(data.length); checksum.writeUInt32BE(crc32(Buffer.concat([type,data])));
  return Buffer.concat([size,type,data,checksum]);
}
function png(raw) {
  const header=Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height,4); header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
mkdirSync('art/placeholder',{recursive:true});
const front = render(frontShapes());
writeFileSync('art/placeholder/sprite.png', png(front));
const side = render(sideShapes()); compositeArm(side, front);
writeFileSync('art/placeholder/side.png', png(side));
const back = render(backShapes()); compositeArm(back, front);
writeFileSync('art/placeholder/back.png', png(back));
// Original square app icon, cropped from Pip's own generated lantern head.
const iconSize=256,iconRaw=Buffer.alloc((iconSize*4+1)*iconSize);
for(let y=0;y<iconSize;y++)for(let x=0;x<iconSize;x++) {
  const sx=Math.min(width-1,Math.floor(70+x*96/iconSize)),sy=Math.min(height-1,Math.floor(63+y*96/iconSize));
  front.copy(iconRaw,y*(iconSize*4+1)+1+x*4,sy*(width*4+1)+1+sx*4,sy*(width*4+1)+1+sx*4+4);
}
const iconIHDR=Buffer.alloc(13); iconIHDR.writeUInt32BE(iconSize); iconIHDR.writeUInt32BE(iconSize,4); iconIHDR[8]=8;iconIHDR[9]=6;
const iconPng=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',iconIHDR),chunk('IDAT',deflateSync(iconRaw)),chunk('IEND',Buffer.alloc(0))]);
const ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(iconPng.length,14);ico.writeUInt32LE(22,18);
writeFileSync('art/placeholder/pip.ico',Buffer.concat([ico,iconPng]));
