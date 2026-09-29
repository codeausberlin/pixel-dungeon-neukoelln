// Original deposit-bottle golem: eleven 16x15 frames used by PfandgolemSprite.
// Frames: 0-1 idle, 2-5 run (waddle), 6-8 attack (bottle swing), 9-10 collapse into shards.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const width=256, height=16, fw=16, fh=15, pixels=Buffer.alloc(width*height*4);
const palette={outline:'1d2a24',green:'3f8f4f',greenLight:'8fd18a',brown:'8a5a2b',brownLight:'c48a4a',
  clear:'bfe3e8',clearDark:'7fb3bd',cap:'d9463b',crate:'b8862f',crateDark:'6e4d1c',eye:'fff6c9',glint:'ffffff'};
function pixel(x,y,color){
  const rgb=palette[color].match(/../g).map(v=>parseInt(v,16)),i=(y*width+x)*4;
  pixels[i]=rgb[0];pixels[i+1]=rgb[1];pixels[i+2]=rgb[2];pixels[i+3]=255;
}
function frame(n){
  const ox=n*fw;
  function box(x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    if(xx<0||xx>=fw||yy<0||yy>=fh)throw new Error('Frame overflow '+n);pixel(ox+xx,yy,c);
  }}
  // A bottle: outline body with neck and cap.
  function bottle(x,y,h,body,light){box(x,y+2,3,h-2,'outline');box(x+1,y+3,1,h-4,body);
    box(x+1,y,1,2,'outline');box(x+1,y,1,1,'cap');if(light)box(x+1,y+3,1,1,light);}
  if(n>=9){
    // Collapsed crate and scattered shards.
    box(3,11,10,4,'crateDark');box(4,12,8,2,'crate');
    const shards=n===9?[[1,9],[6,8],[12,9],[14,12],[0,13],[9,7]]:[[0,10],[3,8],[13,8],[15,13],[1,14],[10,6]];
    const cols=['green','brown','clear','greenLight','clearDark','brownLight'];
    shards.forEach(([x,y],i)=>box(x,y,1,1,cols[i]));
    if(n===10){box(7,10,1,1,'glint');}
    return;
  }
  const bob=(n===3||n===5)?1:0, swing=n===7?1:0;
  // Legs are two beer crates, torso a crate full of bottles, head a big green bottle.
  const step=n===2||n===4?1:0;
  box(3,12-step,4,3,'crateDark');box(4,13-step,2,1,'crate');
  box(9,12-(1-step)*(n>=2&&n<=5?1:0),4,3,'crateDark');box(10,13,2,1,'crate');
  box(2,6+bob,12,6,'outline');box(3,7+bob,10,4,'crate');box(3,9+bob,10,1,'crateDark');
  bottle(3,3+bob,5,'green','greenLight');bottle(6,4+bob,4,'brown','brownLight');bottle(10,3+bob,5,'clear','glint');
  // Head bottle with eyes.
  box(6,0+bob,4,4,'outline');box(7,1+bob,2,2,'green');box(7,1+bob,1,1,'eye');box(8,1+bob,1,1,'eye');
  // Arms: bottles held at the sides.
  if(n>=6&&n<=8){box(13,2+swing*2,2,5,'outline');box(13,3+swing*2,1,3,'brown');box(13,2+swing*2,1,1,'cap');
    if(n===7){box(15,4,1,1,'glint');box(15,7,1,1,'glint');}}
  else{box(0,7+bob,2,4,'outline');box(1,8+bob,1,2,'green');box(14,7+bob,2,4,'outline');box(14,8+bob,1,2,'clear');}
  if(n===1)box(11,4,1,1,'glint');
}
for(let i=0;i<11;i++)frame(i);
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([len,name,data,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
const output=path.join(__dirname,'../core/src/main/assets/sprites/pfandgolem.png');
fs.writeFileSync(output,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Generated ${output} (${width}x${height}, eleven ${fw}x${fh} frames)`);
