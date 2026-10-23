"""Package editable Mermaid sources and the deck's presenter notes."""
from pathlib import Path
import zipfile
import xml.etree.ElementTree as E

root=Path(__file__).resolve().parents[2]
folder=root/'output/presentation-v2'
deck=folder/'FreshRoute-Architecture-8-Slides-Revised.pptx'
ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','p':'http://schemas.openxmlformats.org/presentationml/2006/main'}
titles=['FreshRoute','The problem and the missing link','Our solution and key features','AWS architecture','The decision model','Reservation and fulfilment','AI explanation with operator control','Cloud depth with evidence']
notes=['# FreshRoute faculty presentation notes','Use these notes alongside the eight-slide deck. The website demonstration is a suggested sequence to rehearse, not a record of a demonstration already performed.\n']
with zipfile.ZipFile(deck) as z:
    slides=[n for n in z.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')]
    assert len(slides)==8
    alltext=' '.join(' '.join(E.fromstring(z.read(n)).itertext()) for n in slides)
    for name in ['M R Krishni - 24BCE','Pratyush Purwar - 24BCE5254','Tanmay Suresh Kotadia - 24BCE5281']:
        assert name in alltext,name
    for i,title in enumerate(titles,1):
        xml=E.fromstring(z.read(f'ppt/notesSlides/notesSlide{i}.xml'))
        paragraphs=[]
        for shape in xml.findall('.//p:sp',ns):
            placeholder=shape.find('.//p:ph',ns)
            if placeholder is not None and placeholder.get('type') in ('sldNum','sldImg'):continue
            for para in shape.findall('.//a:p',ns):
                text=''.join(para.itertext()).strip()
                if text:paragraphs.append(text)
        notes.extend([f'## Slide {i}: {title}','\n\n'.join(paragraphs),''])
notes_text='\n\n'.join(notes)
(root/'docs/presentation-v2/PRESENTER-NOTES.md').write_text(notes_text,encoding='utf-8')
readme='''# FreshRoute presentation sources

The PowerPoint contains exactly 8 slides in the original Midnight Circuit design.
All diagram nodes, labels and edges are native editable PowerPoint objects.
The diagrams follow the accompanying Mermaid definitions and local Mermaid layouts.

## Included files

- Slides 1, 2 and 3 use content layouts without diagrams.
- mermaid/: 6 editable Mermaid definitions for slides 4 through 8 (slide 5 uses two diagrams).
- svg/: vector renderings of those definitions.
- PRESENTER-NOTES.md: the same explanations and demonstration script embedded in PowerPoint notes.

## Using the files

Open .mmd files in a trusted local Mermaid editor. The source includes its palette and layout configuration.
Edit native shapes and labels directly in PowerPoint for small presentation changes.
Changes to a .mmd file do not automatically update the PowerPoint.
PowerPoint Presenter View shows the detailed notes while the audience sees the diagram.

## Team and factual boundaries

M R Krishni - 24BCE
Pratyush Purwar - 24BCE5254
Tanmay Suresh Kotadia - 24BCE5281

The first roll number intentionally matches the supplied prefix. Update it when the full number is available.
Use the retained-app, verified-and-deleted-lab and study-topic distinctions shown on slide 8.
The worked shipment is fictional. Its quality and quantity-at-risk values are model outputs, not measured savings or food-safety certification.
The neutral AI name describes the feature. Describe the actual configured provider accurately if asked.
'''
with zipfile.ZipFile(folder/'FreshRoute-Revised-Sources-and-Notes.zip','w',zipfile.ZIP_DEFLATED) as z:
    z.writestr('README.md',readme)
    z.writestr('PRESENTER-NOTES.md',notes_text)
    for file in sorted((root/'docs/presentation-v2/mermaid').glob('*.mmd')):
        if file.name[:2] not in ('01','02','03'):z.write(file,'mermaid/'+file.name)
    for file in sorted((root/'tmp/presentation-v2/diagrams').glob('*.svg')):
        if file.name[:2] not in ('01','02','03'):z.write(file,'svg/'+file.name)
print('Packaged 8-slide presenter notes and 6 Mermaid sources for 5 diagram slides.')
