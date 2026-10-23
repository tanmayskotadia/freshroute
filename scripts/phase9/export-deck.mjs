import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildDeck} from './build-deck-session.js';
const root=process.cwd();
const runtime='C:/Users/SURESH D KOTADIA/.cache/codex-runtimes/codex-primary-runtime/dependencies';
process.env.RUNTIME_NODE_MODULES=runtime+'/node/node_modules';
const skill='C:/Users/SURESH D KOTADIA/.codex/plugins/cache/openai-primary-runtime/presentations/26.1020.11127/skills/presentations';
const {Presentation,PresentationFile}=await import(pathToFileURL(runtime+'/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs').href);
const presentation=Presentation.create({slideSize:{width:1280,height:720}});
await buildDeck({run:async callback=>callback({presentation})},{write:()=>{}});
const candidatePath=path.join(root,'tmp/phase-9/candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
for(let i=0;i<presentation.slides.items.length;i++) {
  const png=await presentation.export({slide:presentation.slides.items[i],format:'png',scale:1});
  await fs.writeFile(path.join(root,'tmp/phase-9/slides',String(i+1).padStart(2,'0')+'.png'),new Uint8Array(await png.arrayBuffer()));
}
const {finalizePresentation}=await import(pathToFileURL(skill+'/container_tools/artifact_tool_utils.mjs').href);
const result=await finalizePresentation({workspaceDir:root,candidatePath,finalPath:path.join(root,'output/phase-9/FreshRoute-Presentation.pptx'),pythonExecutable:runtime+'/python/python.exe',integrityValidatorPath:skill+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:skill+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,receiptPath:path.join(root,'tmp/phase-9/deck-validation.json')});
console.log(JSON.stringify({slides:presentation.slides.items.length,result}));
