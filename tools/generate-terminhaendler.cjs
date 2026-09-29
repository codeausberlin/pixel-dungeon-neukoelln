// Original appointment reseller for "Das Amt ohne Termin": eleven 12x15 frames used by TerminhaendlerSprite.
// Frames: 0-1 idle (phone glow), 2-5 run, 6-8 attack (slaps a waiting ticket), 9-10 collapse.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const width=256, height=16, fw=12, fh=15, pixels=Buffer.alloc(width*height*4);
const palette={outline:'22202e',hood:'5b6b8c',hoodLight:'8699bd',skin:'e8b98f',pants:'3a3a4a',shoe:'d8d8d8',
  phone:'2b2b35',screen:'7fe3ff',ticket:'f4f1de',ticketRed:'d9463b',cap:'c84b3a',paper:'ffffff'};
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
    box(1,11,10,3,'outline');box(2,12,4,1,'hood');box(6,12,3,1,'pants');box(9,11,2,2,'skin');
    box(3,9,2,2,'ticket');box(4,9,1,1,'ticketRed');
    if(n===9){box(7,8,2,2,'ticket');box(8,6,1,1,'paper');}else{box(0,9,1,1,'paper');box(10,8,1,1,'paper');}
    return;
  }
  const bob=(n===3||n===5)?1:0, arm=n===7?2:n===8?1:0;
  // legs
  const stride=(n===2||n===4)?1:0;
  box(3+stride,11,2,3,'outline');box(4+stride,11,1,2,'pants');box(3+stride,13,2,1,'shoe');
  box(7-stride,11,2,3,'outline');box(7-stride,11,1,2,'pants');box(7-stride,13,2,1,'shoe');
  // hoodie body
  box(2,5+bob,8,7-bob,'outline');box(3,6+bob,6,5-bob,'hood');box(3,6+bob,2,4-bob,'hoodLight');
  // head with cap
  box(3,0+bob,6,6,'outline');box(4,2+bob,4,3,'skin');box(3,0+bob,6,2,'cap');box(8,1+bob,2,1,'cap');
  box(5,3+bob,1,1,'outline');box(7,3+bob,1,1,'outline');
  // phone in hand
  if(n<6){box(8,7+bob,3,4,'outline');box(9,8+bob,1,2,n===1?'paper':'screen');}
  else{
    box(8+Math.min(arm,1),6-arm,3,2,'outline');box(9+Math.min(arm,1),6-arm,2,1,'skin');
    box(9,3-Math.min(arm,1),3,3,'ticket');box(10,4-Math.min(arm,1),1,1,'ticketRed');
    if(n===7){box(11,8,1,1,'paper');}
  }
}
for(let i=0;i<11;i++)frame(i);
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([len,name,data,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
const output=path.join(__dirname,'../core/src/main/assets/sprites/terminhaendler.png');
fs.writeFileSync(output,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Generated ${output} (${width}x${height}, eleven ${fw}x${fh} frames)`);
