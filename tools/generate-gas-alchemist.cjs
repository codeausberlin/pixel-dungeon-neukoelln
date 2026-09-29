// Original fictional rolling alchemist, with GnollSprite-compatible animation frames.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const width=256, height=64, pixels=Buffer.alloc(width*height*4);
const palette={outline:'292d3d',steel:'a7b6c2',coat:'815e93',light:'b698c2',skin:'eac29a',
  glass:'70d8bd',tank:'72a667',gas:'bbef84',shoe:'645161',white:'edf1d5'};
function pixel(x,y,color){
  const rgb=palette[color].match(/../g).map(v=>parseInt(v,16)),i=(y*width+x)*4;
  pixels[i]=rgb[0];pixels[i+1]=rgb[1];pixels[i+2]=rgb[2];pixels[i+3]=255;
}
function frame(n){
  const ox=n*12;
  function box(x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
    if(xx<0||xx>=12||yy<0||yy>=15)throw new Error('Frame overflow');pixel(ox+xx,yy,c);
  }}
  function wheel(x,y,spin){box(x+1,y,2,1,'outline');box(x,y+1,4,2,'outline');box(x+1,y+3,2,1,'outline');
    box(x+1,y+1,2,2,'steel');box(x+(spin?2:1),y+1,1,1,'outline');}
  if(n>=9){
    box(1,11,9,2,'outline');box(3,10,5,2,'coat');box(7,9,3,3,'skin');
    box(8,9,2,1,'glass');box(1,9,2,3,'tank');wheel(3,11,n===9);
    if(n===9){box(1,6,2,1,'gas');box(3,4,1,1,'gas');}
    return;
  }
  const bob=(n===5||n===7)?1:0,lean=n===8?1:0;
  // A wheelchair frame, two visible wheels and a strapped-on leaking tank.
  box(2,8,1,5,'steel');box(3,11,7,1,'steel');box(9,9,1,4,'steel');
  box(1,4+bob,3,7-bob,'outline');box(2,5+bob,2,5-bob,'tank');box(2,3+bob,1,2,'steel');
  box(4,6+bob,5,5-bob,'outline');box(5,7+bob,3,4-bob,'coat');box(5,7+bob,1,3-bob,'light');
  box(5+lean,1+bob,4,5,'outline');box(6+lean,2+bob,3,3,'skin');
  box(5+lean,0+bob,3,2,'steel');box(7+lean,2+bob,3,1,'glass');
  box(9+lean,3+bob,1,1,'outline');box(6+lean,5+bob,2,1,'white');
  box(7,10,3,2,'coat');box(9,11,2,1,'shoe');
  wheel(3,11,n%2===0);wheel(8,11,n%2!==0);
  if(n===2||n===3){box(8,7,3,1,'skin');box(10,5,1,3,'steel');
    box(10,n===2?3:1,2,2,'gas');box(8,n===2?2:0,1,1,'gas');}
  else if(n===1||n===7){box(1,1,1,1,'gas');box(0,3,1,1,'gas');}
}
for(let i=0;i<11;i++)frame(i);
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([len,name,data,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
const output=path.join(__dirname,'../core/src/main/assets/sprites/gas-alchemist.png');
fs.writeFileSync(output,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Generated ${output} (${width}x${height}, eleven 12x15 frames)`);
