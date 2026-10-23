// Offline release checks. No credentials, network calls or business-data mutations.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const checks=[];
function check(name,predicate){checks.push({name,pass:!!predicate});}
const root=process.cwd(), dist=path.join(root,'dist');
const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map(m=>m[1]);
check('Entry point references production assets',assets.length>=2);
for(const asset of assets){
  const target=path.resolve(dist,'.'+asset);
  check('Asset stays inside dist: '+path.basename(asset),target.startsWith(dist+path.sep));
  check('Referenced asset exists: '+path.basename(asset),fs.existsSync(target)&&fs.statSync(target).size>0);
}
check('HTML mounts the React application',html.includes('id="root"'));
const configPath=path.join(dist,'cloud-config.json');
check('Deployment config exists',fs.existsSync(configPath));
if(fs.existsSync(configPath)){
  const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
  for(const field of ['apiUrl','websiteUrl','authDomain'])check('HTTPS config: '+field,new URL(config[field]).protocol==='https:');
  check('Deployment region is Mumbai',config.region==='ap-south-1');
  check('No credential fields in public config',!Object.keys(config).some(k=>/secret|password|token|apikey/i.test(k)));
}
const live=JSON.parse(fs.readFileSync('docs/phase-10/CLOUD_CHECKS.json','utf8')).return_value;
check('AWS identity matches deployed account',live.account==='118462784511');
const health=JSON.parse(live.health.payload);
for(const [name,value] of Object.entries(health))check('Fresh cloud health: '+name,value===true);
check('All retained stacks have completed deployment',live.stacks.length===3&&live.stacks.every(s=>s.status==='UPDATE_COMPLETE'||s.status==='CREATE_COMPLETE'));
check('Captured AWS health is less than 24 hours old',Number.isFinite(Date.parse(live.checkedAtUtc))&&Math.abs(Date.now()-Date.parse(live.checkedAtUtc))<86400000);
check('Verification Lambda completed without error',!live.health.functionError);
const published=JSON.parse(fs.readFileSync('docs/phase-10/DEPLOYED_FILES.json','utf8')).return_value;
for(const file of published.files){
  const target=path.resolve(dist,file.key);
  const safe=target.startsWith(dist+path.sep);
  check('Published bytes match local release: '+file.key,safe&&fs.existsSync(target)&&fs.statSync(target).size===file.bytes&&crypto.createHash('md5').update(fs.readFileSync(target)).digest('hex')===file.etag?.replaceAll('"',''));
}
const bytes=assets.map(a=>({file:a,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dist,a.slice(1)))).digest('hex')}));
const result={checkedAtUtc:new Date().toISOString(),pass:checks.every(c=>c.pass),checks,assets:bytes,scope:'Offline release-file checks plus captured Phase 10 AWS health evidence. Browser visual checks are separate.'};
fs.writeFileSync('docs/phase-10/LOCAL_RELEASE_CHECKS.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pass:result.pass,checks:checks.length}));
if(!result.pass)process.exitCode=1;
