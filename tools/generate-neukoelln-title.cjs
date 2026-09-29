// Original, deterministic pixel artwork. No external image or font dependencies.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const width = 480, height = 157;
const pixels = Buffer.alloc(width * height * 4);
const font = {
  N:['10001','11001','10101','10011','10001','10001','10001'],
  E:['11111','10000','10000','11110','10000','10000','11111'],
  U:['10001','10001','10001','10001','10001','10001','01110'],
  K:['10001','10010','10100','11000','10100','10010','10001'],
  O:['01110','10001','10001','10001','10001','10001','01110'],
  L:['10000','10000','10000','10000','10000','10000','11111'],
  P:['11110','10001','10001','11110','10000','10000','10000'],
  I:['11111','00100','00100','00100','00100','00100','11111'],
  X:['10001','10001','01010','00100','01010','10001','10001'],
  D:['11110','10001','10001','10001','10001','10001','11110'],
  G:['01110','10001','10000','10111','10001','10001','01110'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'],
};
function rect(x,y,w,h,color) {
  const c = color.match(/../g).map(v=>parseInt(v,16));
  for(let py=y;py<y+h;py++) for(let px=x;px<x+w;px++) {
    if(px<0||px>=width||py<0||py>=height) throw new Error('Pixel outside atlas');
    const i=(py*width+px)*4;
    pixels[i]=c[0];pixels[i+1]=c[1];pixels[i+2]=c[2];pixels[i+3]=255;
  }
}
function text(str,x,y,scale,color) {
  [...str].forEach((ch,n)=>font[ch].forEach((row,j)=>[...row].forEach((v,i)=>{
    if(v==='1') rect(x+(n*6+i)*scale,y+j*scale,scale,scale,color);
  })));
}
function title(ox,oy,w,h,scale,glow=false) {
  const ink=glow?'839e71':'25252f', wall=glow?'80956c':'55576c';
  const light=glow?'c0f49c':'ffe58b', mint=glow?'d2ffb0':'83cfac';
  const roofY=h===100?55:25;
  for(let n=0;n<7;n++) {
    const bx=ox+7+n*Math.floor((w-14)/7), bw=Math.floor((w-14)/7)-2;
    const by=oy+roofY+(n%3)*5;
    rect(bx,by,bw,h-(by-oy)-8,ink);
    rect(bx+1,by+3,bw-2,h-(by-oy)-12,wall);
    for(let yy=by+7;yy<oy+h-16;yy+=9) for(let xx=bx+3;xx<bx+bw-3;xx+=6)
      rect(xx,yy,2,3,(n+xx+yy)%3===0?light:ink);
  }
  rect(ox+5,oy+h-9,w-10,3,ink);
  rect(ox+9,oy+h-6,w-18,1,mint);
  const tx=ox+Math.floor((w-(8*6-1)*scale)/2), ty=oy+(h===100?12:7);
  text('NEUKOLLN',tx+1,ty+2,scale,ink);
  text('NEUKOLLN',tx,ty,scale,light);
  // Umlaut over O, drawn explicitly to keep the tiny bitmap font unambiguous.
  rect(tx+25*scale,ty-3*scale,scale,scale,light);
  rect(tx+27*scale,ty-3*scale,scale,scale,light);
  const sy=ty+scale*7+6;
  rect(ox+Math.floor(w/2)-39,sy-2,78,11,ink);
  text('PIXEL DUNGEON',ox+Math.floor(w/2)-35,sy,1,mint);
  if(h===100) {
    rect(ox+62,oy+75,15,14,ink);rect(ox+63,oy+76,13,11,'457cad');
    text('U',ox+67,oy+78,1,'fff4dc');
  }
}
title(0,0,139,100,2);
title(139,0,139,100,2,true);
// Landscape scale 2 leaves room for the umlaut within the fixed sprite frame.
title(0,100,240,57,2);
title(240,100,240,57,2,true);
function crc32(data) {
  let crc=0xffffffff;
  for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
function chunk(type,data) {
  const name=Buffer.from(type),len=Buffer.alloc(4),crc=Buffer.alloc(4);
  len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));
  return Buffer.concat([len,name,data,crc]);
}
const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);
header[8]=8;header[9]=6;
const rows=Buffer.alloc(height*(width*4+1));
for(let y=0;y<height;y++) pixels.copy(rows,y*(width*4+1)+1,y*width*4,(y+1)*width*4);
const output=path.join(__dirname,'../core/src/main/assets/interfaces/neukoelln-title.png');
fs.writeFileSync(output,Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]));
console.log(`Generated ${output} (${width}x${height}, RGBA)`);
