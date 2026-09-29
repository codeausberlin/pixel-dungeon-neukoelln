// Original rental e-scooter enemy: eleven 16x15 frames used by EScooterSprite.
// Frames: 0-1 idle, 2-5 run, 6-8 attack (bell and lunge), 9-10 tipped over.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const width=256, height=16, fw=16, fh=15, pixels=Buffer.alloc(width*height*4);
const palette={outline:'1f2433',deck:'2fae8f',deckLight:'7ee0c0',stem:'9aa7b4',grip:'3a3f4f',
  wheel:'2a2d38',hub:'c9d2da',light:'fff2a8',eye:'ffffff',pupil:'1f2433',warn:'f2c14e',spark:'ffffff',dust:'b8a58c'};
function pixel(x,y,color){
  const rgb=palette[color].match(/../g).map(v=>parseInt(v,16)),i=(y*width+x)*4;
  pixels[i]=rgb[0];pixels[i+1]=rgb[1];pixels[i+2]=rgb[2];pixels[i+3]=255;
}
function frame(n){
  const ox=n*fw;
  function box(x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    if(xx<0||xx>=fw||yy<0||yy>=fh)throw new Error('Frame overflow '+n);pixel(ox+xx,yy,c);
  }}
  function wheel(x,y,spin){box(x,y,3,3,'outline');box(x+1,y+1,1,1,spin?'hub':'wheel');
    box(x+(spin?0:2),y+(spin?0:2),1,1,'wheel');}
  if(n>=9){
    // Lying on its side: deck vertical-ish, wheels up, little dust cloud.
    box(2,10,12,3,'outline');box(3,11,10,1,'deck');box(3,11,4,1,'deckLight');
    box(12,7,2,4,'stem');box(1,8,3,3,'outline');box(2,9,1,1,'hub');
    box(12,4,3,3,'outline');box(13,5,1,1,n===9?'light':'grip');
    box(6,8,1,1,'eye');box(8,8,1,1,'eye');
    if(n===9){box(0,6,1,1,'dust');box(4,5,1,1,'dust');box(9,6,1,1,'dust');}
    else{box(1,5,1,1,'dust');box(15,9,1,1,'dust');}
    return;
  }
  const lunge=n===7?2:n===8?1:0, bob=(n===3||n===5)?1:0;
  const x0=lunge;
  // Deck and wheels
  box(x0+1,11-bob,12,2,'outline');box(x0+2,11-bob,10,1,'deck');box(x0+2,11-bob,4,1,'deckLight');
  wheel(x0+1,12-bob,n%2===0);wheel(x0+10,12-bob,n%2!==0);
  // Stem with a little face on the display
  box(x0+10,3-bob,3,8,'outline');box(x0+11,4-bob,1,7,'stem');
  box(x0+8,4-bob,5,4,'outline');box(x0+9,5-bob,3,2,'deck');
  box(x0+9,5-bob,1,1,'eye');box(x0+11,5-bob,1,1,'eye');
  box(x0+9,6-bob,1,1,'pupil');box(x0+11,6-bob,1,1,'pupil');
  // Handlebar and headlight
  box(x0+7,1-bob+1,7,1,'outline');box(x0+7,2-bob,2,1,'grip');box(x0+13,2-bob,1,1,'grip');
  box(x0+13,5-bob,1,1,'light');
  if(n>=6&&n<=7){box(x0+13,5-bob,1,1,'warn');box(Math.min(15,x0+14),4,1,1,'warn');box(x0+6,0,1,1,'warn');box(x0+4,1,1,1,'warn');}
  if(n===7){box(0,9,1,1,'dust');box(0,12,1,1,'dust');}
  if(n===1){box(x0+13,5,1,1,'deckLight');}
}
for(let i=0;i<11;i++)frame(i);
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([len,name,data,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
const output=path.join(__dirname,'../core/src/main/assets/sprites/escooter.png');
fs.writeFileSync(output,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Generated ${output} (${width}x${height}, eleven ${fw}x${fh} frames)`);
