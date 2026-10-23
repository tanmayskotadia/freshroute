// Local Mermaid renderer. Every request outside the local asset server is blocked.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const dist=path.join(root,'tmp/presentation-v2/mermaid-local/node_modules/mermaid/dist');
const runtime='C:/Users/SURESH D KOTADIA/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const {chromium}=await import(pathToFileURL(runtime+'/node/node_modules/playwright/index.mjs').href);
const server=http.createServer(async(req,res)=>{
  try {
    if(req.url==='/') {res.setHeader('Content-Type','text/html');res.end('<html><body style="margin:0"><script type="module">import mermaid from "/mermaid.esm.min.mjs";window.mermaid=mermaid;</script></body></html>');return;}
    const target=path.resolve(dist,'.'+decodeURIComponent(req.url.split('?')[0]));
    if(!target.startsWith(dist+path.sep)) {res.writeHead(403);res.end();return;}
    res.setHeader('Content-Type','application/javascript');res.end(await fs.readFile(target));
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-background-networking','--disable-component-update','--no-first-run']});
const page=await browser.newPage({viewport:{width:2000,height:1400}});
await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
try {
  await page.goto(origin);await page.waitForFunction(()=>!!window.mermaid);
  const layouts={};
  for(const file of (await fs.readdir('docs/presentation-v2/mermaid')).filter(f=>f.endsWith('.mmd'))) {
    const code=await fs.readFile(path.join(root,'docs/presentation-v2/mermaid',file),'utf8');
    const labels={};for(const match of code.matchAll(/\b(\w+)[\[{]"([^"]+)"[\]}]/g))labels[match[1]]=match[2].replace(/<br\s*\/?\s*>/g,'\n');
    const result=await page.evaluate(async({code,labels})=>{
      mermaid.initialize({startOnLoad:false});
      const {svg}=await mermaid.render('diagram',code);document.body.innerHTML=svg;
      const doc=document.querySelector('svg');
      const xy=(el,x,y)=>{const m=doc.getCTM().inverse().multiply(el.getCTM());return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};};
      const box=el=>{const b=el.getBBox(),p=xy(el,b.x,b.y),q=xy(el,b.x+b.width,b.y+b.height);return{x:p.x,y:p.y,w:q.x-p.x,h:q.y-p.y};};
      const nodes=[...doc.querySelectorAll('g.node')].map(g=>{
        const shape=g.querySelector('rect,polygon,path,ellipse,circle'),style=getComputedStyle(shape),id=g.id.replace(/^flowchart-/,'').replace(/-\d+$/,'');
        return {...box(shape),id,label:labels[id]||g.textContent,geometry:shape.tagName==='polygon'?'diamond':'roundRect',fill:style.fill,stroke:style.stroke,color:g.classList.contains('accent')?'#112019':'#F0F4E9'};
      });
      const edges=[...doc.querySelectorAll('path.flowchart-link')].map(p=>{
        const length=p.getTotalLength(),n=Math.max(2,Math.ceil(length/8));
        const points=Array.from({length:n+1},(_,i)=>{const q=p.getPointAtLength(length*i/n);return xy(p,q.x,q.y);});
        return{points};
      });
      const edgeLabels=[...doc.querySelectorAll('.edgeLabels > .edgeLabel')].map(g=>({...box(g),label:g.textContent.trim().replace('beforedispatch','before dispatch')}));
      const v=doc.viewBox.baseVal;
      return {svg,layout:{width:v.width,height:v.height,minX:v.x,minY:v.y,nodes,edges,edgeLabels}};
    },{code,labels});
    const name=file.replace('.mmd','');
    await fs.writeFile(path.join(root,'tmp/presentation-v2/diagrams',name+'.svg'),result.svg);
    layouts[name]=result.layout;
    console.log(JSON.stringify({diagram:name,nodes:result.layout.nodes.length,size:[result.layout.width,result.layout.height]}));
  }
  await fs.writeFile(path.join(root,'tmp/presentation-v2/layouts.json'),JSON.stringify(layouts,null,2));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
