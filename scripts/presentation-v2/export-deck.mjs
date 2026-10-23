import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildDeck} from './build-deck.mjs';
const root=process.cwd();
const runtime='C:/Users/SURESH D KOTADIA/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const skill='C:/Users/SURESH D KOTADIA/.codex/plugins/cache/openai-primary-runtime/presentations/26.1020.11127/skills/presentations';
process.env.RUNTIME_NODE_MODULES=runtime+'/node/node_modules';
const {Presentation,PresentationFile}=await import(pathToFileURL(runtime+'/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs').href);
const coverOnly=process.argv.includes('--cover');
const p=Presentation.create({slideSize:{width:1600,height:900}});
await buildDeck(p,{coverOnly});
await fs.mkdir(root+'/tmp/presentation-v2/slides',{recursive:true});
for(let i=0;i<p.slides.items.length;i++) {
 const png=await p.export({slide:p.slides.items[i],format:'png',scale:1});
 await fs.writeFile(root+'/tmp/presentation-v2/slides/'+String(i+1).padStart(2,'0')+'.png',new Uint8Array(await png.arrayBuffer()));
}
if(coverOnly){console.log('Cover rendered');process.exit(0);}
const candidatePath=root+'/tmp/presentation-v2/candidate.pptx';
await (await PresentationFile.exportPptx(p)).save(candidatePath);
if(process.argv.includes('--draft')){console.log('Eight slides rendered and draft exported');process.exit(0);}
const {finalizePresentation}=await import(pathToFileURL(skill+'/container_tools/artifact_tool_utils.mjs').href);
const result=await finalizePresentation({workspaceDir:root,candidatePath,finalPath:root+'/output/presentation-v2/FreshRoute-Architecture-8-Slides-Revised.pptx',pythonExecutable:runtime+'/python/python.exe',integrityValidatorPath:skill+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:skill+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','15240000,8572500','--validate-bullet-geometry','--validate-heading-fit'],fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,explicitTotalSlideCount:8,receiptPath:root+'/tmp/presentation-v2/revised-validation.json'});
console.log(JSON.stringify({slides:p.slides.items.length,result}));
