// Original afterhour raver for "Die ewige Baustelle": eleven 12x15 frames used by TechnojuengerSprite.
// Frames: 0-1 idle (head nod), 2-5 run, 6-8 attack (arms up, bass drop), 9-10 collapse.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const width=256, height=16, fw=12, fh=15, pixels=Buffer.alloc(width*height*4);
const palette={outline:'121118',black:'2a2733',blackLight:'45404f',skin:'e3b68f',hair:'1c1a22',shade:'0b0b10',lens:'3a3f5c',
  neon:'5dff9c',neonPink:'ff5dc8',boot:'1b1a20',sole:'d8d4c8',stamp:'7a6bff'};
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
    box(0,11,11,3,'outline');box(1,12,6,1,'black');box(7,11,3,2,'skin');box(8,11,2,1,'shade');
    box(3,10,1,1,n===9?'neon':'neonPink');box(9,9,1,1,'neon');
    if(n===10){box(0,9,1,1,'neonPink');box(5,9,1,1,'neon');}
    return;
  }
  const nod=(n===1)?1:0, bob=(n===3||n===5)?1:0, up=n>=6&&n<=8;
  const stride=(n===2||n===4)?1:0;
  // boots
  box(3+stride,11,2,3,'outline');box(4+stride,11,1,2,'black');box(3+stride,13,2,1,'boot');box(3+stride,14,2,1,'sole');
  box(7-stride,11,2,3,'outline');box(7-stride,11,1,2,'black');box(7-stride,13,2,1,'boot');box(7-stride,14,2,1,'sole');
  // black mesh shirt
  box(2,5+bob,8,7-bob,'outline');box(3,6+bob,6,5-bob,'black');box(4,7+bob,1,1,'blackLight');box(6,8+bob,1,1,'blackLight');box(5,9+bob,1,1,'blackLight');
  // head with slicked hair and round sunglasses, nodding to the beat
  const hy=0+bob+nod;
  box(3,hy,6,6,'outline');box(4,hy+2,4,3,'skin');box(3,hy,6,2,'hair');
  box(4,hy+3,2,1,'shade');box(7,hy+3,1,1,'shade');box(6,hy+3,1,1,'lens');box(4,hy+2,4,1,'skin');
  // wrist stamp and glowstick
  if(!up){
    box(9,7+bob,2,3,'outline');box(9,8+bob,1,1,'skin');box(9,9+bob,1,1,'stamp');
    box(10,5+bob,1,3,n===0?'neon':'neonPink');
    box(1,7+bob,2,3,'outline');box(2,8+bob,1,1,'skin');
  }else{
    const lift=n===7?1:0;
    box(9,2-lift,2,4,'outline');box(9,3-lift,1,2,'skin');box(10,0,1,2,'neon');
    box(1,2-lift,2,4,'outline');box(2,3-lift,1,2,'skin');box(1,0,1,2,'neonPink');
    if(n===7){box(0,6,1,1,'neon');box(11,6,1,1,'neonPink');box(0,9,1,1,'neonPink');box(11,9,1,1,'neon');}
  }
}
for(let i=0;i<11;i++)frame(i);
function crc32(data){let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([len,name,data,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
const output=path.join(__dirname,'../core/src/main/assets/sprites/technojuenger.png');
fs.writeFileSync(output,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Generated ${output} (${width}x${height}, eleven ${fw}x${fh} frames)`);
