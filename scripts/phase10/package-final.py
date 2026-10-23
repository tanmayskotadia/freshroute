"""Package the current source, Phase 9 deliverables and Phase 10 handover."""
import hashlib, importlib.util, json, zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[2]
out=root/'output/phase-10';out.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('verifier',Path(__file__).with_name('verify-package.py'))
verifier=importlib.util.module_from_spec(spec);spec.loader.exec_module(verifier)
files=[]
for directory in ['src','server','infrastructure','scripts','tests','docs','public']:
    files.extend(p for p in (root/directory).rglob('*') if p.is_file() and p.name!='cloud-config.json' and '__pycache__' not in p.parts)
files.extend(root/n for n in ['README.md','FRESHROUTE_BUILD_BLUEPRINT.md','FRESHROUTE_IMPLEMENTATION_ROADMAP.md','package.json','package-lock.json','tsconfig.json','tsconfig.server.json','vite.config.ts','index.html','cdk.json','.gitignore'])
deliverables=[p for p in (root/'output/phase-9').iterdir() if p.is_file() and p.suffix!='.zip' and not p.name.startswith('.')]
manifest={};archive=out/'FreshRoute-Final-Submission.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    z.writestr('START_HERE.txt','FreshRoute final submission\n\nRead source/docs/phase-10/HANDOVER.md for current status and remaining operational items.\nStart the app with Node 24: npm.cmd ci, npm.cmd run dev.\nReport, slides, viva cards and captioned overview are in deliverables/.\nThe final release review preserves the three import DLQ messages and records pending email confirmation, CloudFront verification and browser/human checks.\nSee source/docs/phase-9/DEMO_SCRIPT.md for the seven-minute demonstration.\nVerify this archive using scripts/phase10/verify-package.py.\n')
    for p in sorted(set(files)):
        name='source/'+p.relative_to(root).as_posix();data=p.read_bytes();z.writestr(name,data);manifest[name]=hashlib.sha256(data).hexdigest()
    for p in deliverables:
        name='deliverables/'+p.name;data=p.read_bytes();z.writestr(name,data);manifest[name]=hashlib.sha256(data).hexdigest()
    z.writestr('SHA256_MANIFEST.json',json.dumps(manifest,indent=2))
result=verifier.verify_package(archive)
result.update({'archive':archive.name,'archiveBytes':archive.stat().st_size,'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest()})
(out/'PACKAGE_VERIFICATION.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,indent=2))
