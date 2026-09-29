// Original jackhammer worker for "Die ewige Baustelle": eleven 12x15 frames used by PresslufterSprite.
// Frames: 0-1 idle, 2-5 run, 6-8 attack (hammer bounce), 9-10 collapse.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const width=256, height=16, fw=12, fh=15, pixels=Buffer.alloc(width*height*4);
const palette={outline:'1e1f29',helmet:'f2c230',helmetLight:'fbe58a',skin:'d9a07a',vest:'ff7a1f',stripe:'e8f0f2',
  shirt:'4a5a7a',pants:'36405a',boot:'5a3b25',steel:'9aa4ae',steelDark:'5d666f',dust:'c9b393',hose:'2c2c2c'};
function pixel(x,y,color){
  const rgb=palette[color].match(/../g).map(v=>parseInt(v,16)),i=(y*width+x)*4;
  pixels[i]=rgb[0];pixels[i+1]=rgb[1];pixels[i+2]=rgb[2];pixels[i+3]=255;
}
function frame(n){
  const ox=n*fw;
  function box(x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    if(xx<0||xx>=fw||yy<0||yy>=fh)throw new Error('Frame overflow '+n);pixel(ox+xx,yy,c);
  }}
  if(n>=9){
    box(0,11,11,3,'outline');box(1,12,3,1,'vest');box(4,12,4,1,'pants');box(8,11,3,2,'helmet');
    box(2,9,1,2,'steel');box(1,9,3,1,'steelDark');
    if(n===9){box(5,8,1,1,'dust');box(9,8,1,1,'dust');}else{box(0,8,1,1,'dust');box(11,10,1,1,'dust');}
    return;
  }
  const bob=(n===3||n===5)?1:0, hit=n===7?1:0, lift=n===6?1:0;
  const stride=(n===2||n===4)?1:0;
  // boots and legs
  box(2+stride,11,3,3,'outline');box(3+stride,11,1,2,'pants');box(2+stride,13,3,1,'boot');
  box(6-stride,11,3,3,'outline');box(7-stride,11,1,2,'pants');box(6-stride,13,3,1,'boot');
  // body with safety vest
  box(1,5+bob,8,7-bob,'outline');box(2,6+bob,6,5-bob,'vest');box(2,8+bob,6,1,'stripe');box(4,6+bob,2,2,'shirt');
  // head with helmet
  box(2,0+bob,6,6,'outline');box(3,2+bob,4,3,'skin');box(2,0+bob,6,2,'helmet');box(3,0+bob,2,1,'helmetLight');
  box(4,3+bob,1,1,'outline');box(6,3+bob,1,1,'outline');
  // jackhammer in front, handles at chest height
  const hy=5+bob-lift+hit;
  box(8,hy,4,2,'outline');box(9,hy,2,1,'steel');
  box(9,hy+2,2,Math.max(1,13-(hy+2)-hit),'steelDark');box(9,hy+2,1,Math.max(1,11-(hy+2)),'steel');
  box(8,6+bob,1,3,'hose');
  if(n===7||n===8){box(8,14-0,1,1,'dust');box(11,13,1,1,'dust');if(n===7)box(7,12,1,1,'dust');}
  if(n===1)box(4,1,1,1,'helmetLight');
}
for(let i=0;i<11;i++)frame(i);
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([len,name,data,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
const output=path.join(__dirname,'../core/src/main/assets/sprites/presslufter.png');
fs.writeFileSync(output,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Generated ${output} (${width}x${height}, eleven ${fw}x${fh} frames)`);
