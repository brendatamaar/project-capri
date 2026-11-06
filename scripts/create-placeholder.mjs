// Original code-drawn artwork: Pip, a brass lantern robot. No reference inputs.
// Kept reproducible so the committed PNG has reviewable provenance.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
const width = 240, height = 420;
const colors = { ink: [26, 49, 57], teal: [63, 173, 167], light: [167, 231, 215], brass: [218, 168, 75], glass: [35, 82, 95], white: [255, 239, 194] };
const shapes = [];
const box = (x, y, w, h, color) => shapes.push({ hit: (px, py) => px >= x && px < x + w && py >= y && py < y + h, color: colors[color] });
const circle = (x, y, r, color) => shapes.push({ hit: (px, py) => (px-x)**2 + (py-y)**2 <= r*r, color: colors[color] });
// Off-centre antenna and a round lantern head; no mane, mask, horns, or human face.
box(99, 43, 6, 29, 'brass'); circle(102, 41, 8, 'teal');
circle(118, 111, 45, 'ink'); circle(118, 111, 40, 'teal');
circle(118, 111, 30, 'brass'); circle(118, 111, 25, 'glass');
circle(118, 111, 14, 'light'); circle(114, 106, 5, 'white');
box(108, 147, 20, 14, 'ink'); box(112, 149, 12, 12, 'brass');
// Squat tank body and one reaching arm, placed in mochi-v1's deformation regions.
box(95, 162, 48, 72, 'ink'); box(100, 168, 38, 59, 'teal');
box(108, 180, 22, 32, 'brass'); box(113, 184, 12, 23, 'glass');
circle(119, 196, 4, 'white');
circle(98, 172, 9, 'brass'); box(82, 171, 14, 24, 'ink');
box(43, 189, 48, 13, 'ink'); box(44, 192, 44, 7, 'teal');
circle(39, 199, 12, 'brass'); circle(37, 198, 5, 'glass');
circle(139, 175, 9, 'brass'); box(140, 182, 11, 41, 'ink');
box(143, 185, 5, 32, 'teal'); circle(145, 224, 9, 'brass');
// Telescoping legs align with HIP=232 and KNEE=305; short round boots reach y=418.
for (const x of [106, 142]) {
  box(x-6, 232, 12, 69, 'ink'); box(x-3, 236, 6, 64, 'brass');
  circle(x, 305, 10, 'teal'); box(x-5, 313, 10, 83, 'ink');
  box(x-2, 317, 4, 71, 'brass'); box(x-13, 396, 28, 21, 'ink');
  box(x-9, 399, 21, 12, 'teal');
}
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
const header=Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height,4); header[8]=8;header[9]=6;
mkdirSync('art/placeholder',{recursive:true});
writeFileSync('art/placeholder/sprite.png',Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
// Original square app icon, cropped from Pip's own generated lantern head.
const iconSize=256,iconRaw=Buffer.alloc((iconSize*4+1)*iconSize);
for(let y=0;y<iconSize;y++)for(let x=0;x<iconSize;x++) {
  const sx=Math.min(width-1,Math.floor(70+x*96/iconSize)),sy=Math.min(height-1,Math.floor(63+y*96/iconSize));
  raw.copy(iconRaw,y*(iconSize*4+1)+1+x*4,sy*(width*4+1)+1+sx*4,sy*(width*4+1)+1+sx*4+4);
}
const iconHeader=Buffer.from(header);iconHeader.writeUInt32BE(iconSize);iconHeader.writeUInt32BE(iconSize,4);
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',iconHeader),chunk('IDAT',deflateSync(iconRaw)),chunk('IEND',Buffer.alloc(0))]);
const ico=Buffer.alloc(22);ico.writeUInt16LE(1,2);ico.writeUInt16LE(1,4);ico.writeUInt16LE(1,10);ico.writeUInt16LE(32,12);ico.writeUInt32LE(png.length,14);ico.writeUInt32LE(22,18);
writeFileSync('art/placeholder/pip.ico',Buffer.concat([ico,png]));
