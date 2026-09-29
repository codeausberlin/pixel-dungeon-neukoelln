// Original house-rules hydra for "Unter dem Rathaus": eleven 16x15 frames used by HausordnungsHydraSprite.
// A three-headed filing creature; each head wears a different official hat and holds a notice.
// Frames: 0-1 idle, 2-5 run, 6-8 attack (heads lunge), 9-10 collapse into loose paper.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const width=256, height=16, fw=16, fh=15, pixels=Buffer.alloc(width*height*4);
const palette={outline:'1a1622',body:'6b8f5a',bodyLight:'9cc27f',belly:'d8d0a8',eye:'fff27a',pupil:'1a1622',
  hatA:'3b4a8c',hatB:'8c2f39',hatC:'d6b24a',paper:'f4f1de',ink:'3d3d52',stamp:'d9463b',claw:'e8e2c8'};
function pixel(x,y,color){
  const rgb=palette[color].match(/../g).map(v=>parseInt(v,16)),i=(y*width+x)*4;
  pixels[i]=rgb[0];pixels[i+1]=rgb[1];pixels[i+2]=rgb[2];pixels[i+3]=255;
}
function frame(n){
  const ox=n*fw;
  function box(x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    if(xx<0||xx>=fw||yy<0||yy>=fh)throw new Error('Frame overflow '+n);pixel(ox+xx,yy,c);
  }}
  function head(x,y,hat){box(x,y+1,4,4,'outline');box(x+1,y+2,2,2,'body');box(x+1,y+2,1,1,'eye');
    box(x,y,4,2,'outline');box(x+1,y,2,1,hat);}
  if(n>=9){
    box(2,11,12,3,'outline');box(3,12,10,1,'body');box(4,12,4,1,'bodyLight');
    const papers=n===9?[[1,9],[6,7],[12,8],[14,11]]:[[0,11],[4,6],[10,5],[15,9]];
    papers.forEach(([x,y],i)=>{box(x,y,1,1,'paper');if(i%2)box(x,y,1,1,'stamp');});
    box(6,10,1,1,'eye');box(9,10,1,1,'eye');
    return;
  }
  const bob=(n===3||n===5)?1:0, lunge=n===7?1:0;
  const step=(n===2||n===4)?1:0;
  // body
  box(3,8+bob,10,6-bob,'outline');box(4,9+bob,8,4-bob,'body');box(6,10+bob,4,3-bob,'belly');
  box(4+step,13,2,2,'outline');box(10-step,13,2,2,'outline');box(4+step,14,2,1,'claw');box(10-step,14,2,1,'claw');
  // three necks and heads
  box(4,5+bob,2,4,'outline');box(7,4+bob,2,5,'outline');box(10,5+bob,2,4,'outline');
  box(4,6+bob,1,2,'body');box(7,5+bob,1,3,'bodyLight');box(10,6+bob,1,2,'body');
  head(1-lunge,2+bob,'hatA');head(6,0+bob+lunge,'hatB');head(11+lunge,2+bob,'hatC');
  // notice held in front
  if(n>=6){box(13,9,3,4,'outline');box(14,10,1,2,'paper');box(14,11,1,1,'stamp');}
  else{box(0,9+bob,3,4,'outline');box(1,10+bob,1,2,'paper');box(1,10+bob,1,1,n===1?'stamp':'ink');}
}
for(let i=0;i<11;i++)frame(i);
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([len,name,data,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
const output=path.join(__dirname,'../core/src/main/assets/sprites/hausordnungs-hydra.png');
fs.writeFileSync(output,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Generated ${output} (${width}x${height}, eleven ${fw}x${fh} frames)`);
