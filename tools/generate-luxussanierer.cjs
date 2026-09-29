// Original luxury developer for "Das Renditequartier": eleven 12x15 frames used by LuxussaniererSprite.
// Frames: 0-1 idle (checks watch), 2-5 run, 6-8 attack (blueprint swing), 9-10 collapse.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const width=256, height=16, fw=12, fh=15, pixels=Buffer.alloc(width*height*4);
const palette={outline:'1b1c26',helmet:'f4f4f0',helmetShade:'c9ccd1',skin:'efc6a0',suit:'2f3f5c',suitLight:'4c6390',
  shirt:'f4f4f0',tie:'c9a227',shoe:'111111',paper:'a8d8f0',paperLine:'3d6fa8',gold:'f2d06b',teeth:'ffffff'};
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
    box(0,11,11,3,'outline');box(1,12,5,1,'suit');box(6,12,2,1,'shirt');box(8,11,3,2,'helmet');
    box(3,9,4,2,'paper');box(4,9,2,1,'paperLine');
    if(n===10){box(1,8,1,1,'gold');box(10,9,1,1,'gold');}
    return;
  }
  const bob=(n===3||n===5)?1:0, swing=n===7?2:n===8?1:0;
  const stride=(n===2||n===4)?1:0;
  // legs
  box(3+stride,11,2,3,'outline');box(4+stride,11,1,2,'suit');box(3+stride,13,2,1,'shoe');
  box(7-stride,11,2,3,'outline');box(7-stride,11,1,2,'suit');box(7-stride,13,2,1,'shoe');
  // suit jacket with shirt and gold tie
  box(2,5+bob,8,7-bob,'outline');box(3,6+bob,6,5-bob,'suit');box(3,6+bob,1,4-bob,'suitLight');
  box(5,6+bob,2,3,'shirt');box(5,7+bob,1,2,'tie');
  // head with white developer helmet and a big smile
  box(3,0+bob,6,6,'outline');box(4,2+bob,4,3,'skin');box(3,0+bob,6,2,'helmet');box(7,0+bob,2,1,'helmetShade');
  box(5,3+bob,1,1,'outline');box(7,3+bob,1,1,'outline');
  // rolled blueprint in hand
  if(n<6){box(9,6+bob,2,6,'outline');box(9,7+bob,1,4,'paper');if(n===1)box(1,8,1,1,'gold');}
  else{box(8,5-swing,4,2,'outline');box(9,5-swing,3,1,'paper');box(10,5-swing,1,1,'paperLine');
    if(n===7){box(11,8,1,1,'paper');box(11,10,1,1,'paperLine');}}
}
for(let i=0;i<11;i++)frame(i);
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([len,name,data,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
const output=path.join(__dirname,'../core/src/main/assets/sprites/luxussanierer.png');
fs.writeFileSync(output,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Generated ${output} (${width}x${height}, eleven ${fw}x${fh} frames)`);
