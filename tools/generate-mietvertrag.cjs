// The win item is the last unlimited Berlin rental lease instead of the Amulet of Yendor.
// Draws the 16x16 icon into sprites/items.png (ItemSpriteSheet.AMULET, cell 13,3) and the
// 32x32 image for the victory scene (sprites/amulet.png). The rest of items.png is untouched;
// the original atlas is always read from git so repeated runs give the same file.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');

function crc32(d){let c=0xffffffff;for(const b of d){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(t,d){const n=Buffer.from(t),l=Buffer.alloc(4),c=Buffer.alloc(4);l.writeUInt32BE(d.length);c.writeUInt32BE(crc32(Buffer.concat([n,d])));return Buffer.concat([l,n,d,c]);}
function encode(w,h,px){const hd=Buffer.alloc(13);hd.writeUInt32BE(w);hd.writeUInt32BE(h,4);hd[8]=8;hd[9]=6;
  const rows=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++)px.copy(rows,y*(w*4+1)+1,y*w*4,(y+1)*w*4);
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',hd),chunk('IDAT',zlib.deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);}
// Decoder for 8-bit RGBA PNGs with all five filter types.
function decodeRGBA(buf){let p=8,W,H,ct,idat=[];
  while(p<buf.length){const len=buf.readUInt32BE(p),t=buf.toString('ascii',p+4,p+8),d=buf.subarray(p+8,p+8+len);
    if(t==='IHDR'){W=d.readUInt32BE(0);H=d.readUInt32BE(4);ct=d[9];if(d[8]!==8||ct!==6)throw new Error('expected 8-bit RGBA');}
    if(t==='IDAT')idat.push(d);p+=12+len;}
  const raw=zlib.inflateSync(Buffer.concat(idat)),bpp=4,stride=W*bpp,out=Buffer.alloc(H*stride);
  for(let y=0;y<H;y++){const f=raw[y*(stride+1)],src=raw.subarray(y*(stride+1)+1,(y+1)*(stride+1));
    for(let x=0;x<stride;x++){const a=x>=bpp?out[y*stride+x-bpp]:0,b=y>0?out[(y-1)*stride+x]:0,c=(x>=bpp&&y>0)?out[(y-1)*stride+x-bpp]:0;
      let v=src[x];if(f===1)v+=a;else if(f===2)v+=b;else if(f===3)v+=(a+b)>>1;
      else if(f===4){const pp=a+b-c,pa=Math.abs(pp-a),pb=Math.abs(pp-b),pc=Math.abs(pp-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?b:c);}
      out[y*stride+x]=v&255;}}
  return {W,H,px:out};}

const pal={outline:'3b2f2a',paper:'f3e9c6',paperShade:'d8c99a',fold:'bfae7c',ink:'5b5670',stamp:'d9463b',stampLight:'ef7a66',
  seal:'e0b23c',sealDark:'a07818',sign:'2f3a6b'};
function painter(px,W,ox,oy){return function(x,y,w,h,c){const rgb=pal[c].match(/../g).map(v=>parseInt(v,16));
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=((oy+yy)*W+ox+xx)*4;px[i]=rgb[0];px[i+1]=rgb[1];px[i+2]=rgb[2];px[i+3]=255;}};}

// 16x16 icon: a sheet with a folded corner, text lines, red "unbefristet" stamp and a signature.
function icon(box){
  box(2,1,11,14,'outline');box(3,2,9,12,'paper');box(3,13,9,1,'paperShade');
  box(10,1,3,3,'outline');box(10,2,2,2,'fold');box(12,1,1,1,'outline');
  box(4,3,5,1,'ink');box(4,5,7,1,'ink');box(4,7,6,1,'ink');box(4,9,3,1,'ink');
  box(8,9,3,3,'stamp');box(9,10,1,1,'stampLight');
  box(4,11,1,1,'sign');box(5,12,1,1,'sign');box(6,11,1,1,'sign');
}
// 32x32 scene image: the same lease, larger, with a golden seal ribbon.
function big(box){
  box(5,2,21,28,'outline');box(6,3,19,26,'paper');box(6,27,19,2,'paperShade');
  box(20,2,6,6,'outline');box(21,3,4,4,'fold');box(24,2,2,1,'outline');box(25,3,1,1,'outline');
  box(8,5,9,2,'ink');                       // heading "MIETVERTRAG"
  for(const [y,w] of [[9,15],[11,13],[13,15],[15,11],[17,14]])box(8,y,w,1,'ink');
  box(8,19,6,1,'ink');                      // "unbefristet"
  box(16,19,7,7,'stamp');box(17,20,5,5,'stampLight');box(18,21,3,3,'stamp');
  box(8,23,1,1,'sign');box(9,24,1,1,'sign');box(10,23,1,1,'sign');box(11,24,2,1,'sign');box(13,23,1,1,'sign');
  box(3,21,5,5,'outline');box(4,22,3,3,'seal');box(5,23,1,1,'sealDark');box(4,26,1,3,'stamp');box(6,26,1,3,'stamp');
}

const itemsRel='core/src/main/assets/sprites/items.png';
const orig=execFileSync('git',['-C',root,'show','e87a4a7:'+itemsRel]);
const items=decodeRGBA(orig);
const ox=13*16, oy=3*16;
for(let y=0;y<16;y++)for(let x=0;x<16;x++)items.px.fill(0,((oy+y)*items.W+ox+x)*4,((oy+y)*items.W+ox+x)*4+4);
icon(painter(items.px,items.W,ox,oy));
fs.writeFileSync(path.join(root,itemsRel),encode(items.W,items.H,items.px));

const bigPx=Buffer.alloc(32*32*4);
big(painter(bigPx,32,0,0));
fs.writeFileSync(path.join(root,'core/src/main/assets/sprites/amulet.png'),encode(32,32,bigPx));
console.log('Generated lease icon in items.png (cell 13,3) and sprites/amulet.png (32x32)');
