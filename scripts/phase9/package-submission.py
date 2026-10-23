"""Create a captioned Motion JPEG overview and a source/evidence submission ZIP."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import io, struct, json, zipfile, hashlib

root=Path(__file__).resolve().parents[2]; out=root/'output/phase-9'
def chunk(kind,data): return kind+struct.pack('<I',len(data))+data+(b'\0' if len(data)%2 else b'')
def group(kind,data): return chunk(b'LIST',kind+data)
captions=[
 'FreshRoute: decision support for delayed perishable shipments. This is an architecture overview, not a live app recording.',
 'Compare continuation, cooling and rerouting using entered temperature, route, cost and capacity assumptions.',
 'The original fictional seed has 500 kg of tomatoes and a three-hour delay. Model outputs are not measured spoilage.',
 'Hard constraints run before ranking. Frozen inputs and results preserve the reasoning behind a saved analysis.',
 'The retained AWS application connects authenticated APIs, DynamoDB, Step Functions, queues and background workers.',
 'Four private buckets separate web assets, import data, owner-bound reports and audit evidence.',
 'AI explains calculated facts and prepares drafts. The operator reviews actions; AI cannot reserve capacity.',
 'Current versions and atomic capacity checks protect reservations. Background jobs generate private reports.',
 'Compute, network, security, recovery and SQL migration experiments were verified, then their five stacks were deleted.',
 'The syllabus matrix covers all eight modules and distinguishes deployed services, deleted labs and studies.',
 'USD 200 is a planning ceiling. CloudFront verification, email delivery and live browser visual QA remain limitations.',
 'Reproduce the calculation, review the decision, inspect the evidence. Use the seven-minute guide for the full demonstration.'
]
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
frames=[]
for i,caption in enumerate(captions,1):
    im=Image.open(root/f'tmp/phase-9/slides/{i:02}.png').convert('RGB').resize((1280,720))
    d=ImageDraw.Draw(im); d.rectangle((0,644,1280,720),fill='#193f32')
    words=caption.split(); lines=[]; line=''
    for word in words:
        trial=(line+' '+word).strip()
        if d.textlength(trial,font=font)>1180: lines.append(line);line=word
        else: line=trial
    lines.append(line)
    for y,txt in enumerate(lines): d.text((48,651+y*27),txt,font=font,fill='#fffef8')
    b=io.BytesIO();im.save(b,format='JPEG',quality=88);frames.extend([b.getvalue()]*15)
    if i in [1,5,12]: im.save(root/f'tmp/phase-9/video-frame-{i:02}.png')
fps=2; w=1280;h=720;count=len(frames);maxlen=max(map(len,frames))
avih=struct.pack('<14I',500000,maxlen*fps,0,16,count,0,1,maxlen,w,h,0,0,0,0)
strh=struct.pack('<4s4sIHHIIIIIIIIhhhh',b'vids',b'MJPG',0,0,0,0,1,fps,0,count,maxlen,0xffffffff,0,0,0,w,h)
strf=struct.pack('<IiiHH4sIiiII',40,w,h,1,24,b'MJPG',w*h*3,0,0,0,0)
header=group(b'hdrl',chunk(b'avih',avih)+group(b'strl',chunk(b'strh',strh)+chunk(b'strf',strf)))
movi=b'';index=b'';offset=4
for frame in frames:
    part=chunk(b'00dc',frame);index+=struct.pack('<4sIII',b'00dc',16,offset,len(frame));movi+=part;offset+=len(part)
avi=b'AVI '+header+group(b'movi',movi)+chunk(b'idx1',index)
(out/'FreshRoute-Overview.avi').write_bytes(b'RIFF'+struct.pack('<I',len(avi))+avi)
def timestamp(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
(out/'FreshRoute-Overview.srt').write_text('\n\n'.join(f'{i}\n{timestamp((i-1)*7.5)} --> {timestamp(i*7.5)}\n{c}' for i,c in enumerate(captions,1))+'\n',encoding='utf-8')
(out/'VIDEO_README.txt').write_text('FreshRoute overview: 90 seconds, 1280x720, Motion JPEG AVI, burned-in captions, no audio.\nThis is a captioned architecture slide overview, not a live browser screen recording.\nOpen with a player supporting Motion JPEG AVI. Captions are also supplied as SRT.\nThe full seven-minute walkthrough is in docs/phase-9/DEMO_SCRIPT.md.\n',encoding='utf-8')

allowed_dirs=['src','server','infrastructure','scripts','tests','docs','public']
files=[]
for directory in allowed_dirs:
    files.extend(p for p in (root/directory).rglob('*') if p.is_file() and p.name!='cloud-config.json' and '__pycache__' not in p.parts)
files.extend(root/n for n in ['README.md','FRESHROUTE_BUILD_BLUEPRINT.md','FRESHROUTE_IMPLEMENTATION_ROADMAP.md','package.json','package-lock.json','tsconfig.json','tsconfig.server.json','vite.config.ts','index.html','cdk.json','.gitignore'] if (root/n).exists())
deliverables=[p for p in out.iterdir() if p.is_file() and p.suffix.lower() not in ['.zip'] and not p.name.startswith('.')]
readme='''FreshRoute - Phase 9 evaluation package

Start with deliverables/FreshRoute-Technical-Report.pdf and the editable presentation.
Editable report: DOCX. Viva preparation: 40 questions in PDF/Markdown.
The 90-second AVI is a captioned architecture overview, not a live screen recording.

Source setup: extract source/, install Node 24, then npm.cmd ci and npm.cmd run dev.
Run npm.cmd test and npm.cmd run build for checks.
See source/docs/phase-9/RUN_DEPLOY_GUIDE.md for cloud deployment boundaries.
See source/docs/phase-9/DEMO_SCRIPT.md for the seven-minute live demonstration.
See source/docs/phase-9/SYLLABUS_MATRIX.csv for all eight modules.
Evidence and limitations are in source/docs/phase-9/EVIDENCE_INDEX.md and RELEASE_STATUS.md.

No API keys, login credentials, signed transfer URLs, node_modules or .git are included.
Deployment endpoints/account identifiers are public project configuration, not credentials.
Browser visual QA and human rehearsal remain outstanding; no successful email receipt is claimed.
'''
manifest={}
archive=out/'FreshRoute-Phase-9-Submission.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    z.writestr('START_HERE.txt',readme)
    for p in sorted(set(files)):
        name='source/'+p.relative_to(root).as_posix();data=p.read_bytes();z.writestr(name,data);manifest[name]=hashlib.sha256(data).hexdigest()
    for p in deliverables:
        name='deliverables/'+p.name;data=p.read_bytes();z.writestr(name,data);manifest[name]=hashlib.sha256(data).hexdigest()
    z.writestr('SHA256_MANIFEST.json',json.dumps(manifest,indent=2))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for name,digest in manifest.items(): assert hashlib.sha256(z.read(name)).hexdigest()==digest
print(json.dumps({'archiveBytes':archive.stat().st_size,'packagedFiles':len(manifest),'videoSeconds':count/fps,'videoFrames':count,'manifestVerified':True}))
