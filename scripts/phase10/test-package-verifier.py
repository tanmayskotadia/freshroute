"""Negative checks for the release gate: changed data must never pass silently."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
import zipfile

spec=importlib.util.spec_from_file_location('verifier',Path(__file__).with_name('verify-package.py'))
verifier=importlib.util.module_from_spec(spec);spec.loader.exec_module(verifier)

def archive(change=None):
    data={name:b'fictional fixture' for name in [
        'source/package.json','source/package-lock.json','source/src/App.tsx',
        'source/docs/phase-9/SYLLABUS_MATRIX.csv',
        'deliverables/FreshRoute-Technical-Report.pdf','deliverables/FreshRoute-Presentation.pptx']}
    manifest={name:hashlib.sha256(value).hexdigest() for name,value in data.items()}
    if change: change(data,manifest)
    stream=io.BytesIO()
    with zipfile.ZipFile(stream,'w') as z:
        z.writestr('START_HERE.txt','Test fixture, no actual report data.')
        for name,value in data.items():z.writestr(name,value)
        z.writestr('SHA256_MANIFEST.json',json.dumps(manifest))
    stream.seek(0);return stream

class ReleaseGateTests(unittest.TestCase):
    def test_valid_archive(self):self.assertEqual(verifier.verify_package(archive())['status'],'PASS')
    def test_changed_payload(self):
        with self.assertRaisesRegex(ValueError,'checksum'):
            verifier.verify_package(archive(lambda d,m:d.update({'source/src/App.tsx':b'changed'})))
    def test_unlisted_payload(self):
        with self.assertRaisesRegex(ValueError,'cover every'):
            verifier.verify_package(archive(lambda d,m:d.update({'source/extra.txt':b'extra'})))
    def test_path_traversal(self):
        with self.assertRaisesRegex(ValueError,'Unsafe'):
            verifier.verify_package(archive(lambda d,m:d.update({'../outside.txt':b'x'})))
    def test_private_files(self):
        with self.assertRaisesRegex(ValueError,'Excluded'):
            verifier.verify_package(archive(lambda d,m:d.update({'source/.env':b'x'})))
    def test_missing_required_file(self):
        def remove(d,m):d.pop('source/src/App.tsx');m.pop('source/src/App.tsx')
        with self.assertRaisesRegex(ValueError,'Required'):
            verifier.verify_package(archive(remove))
    def test_known_secret_format(self):
        def inject(d,m):
            name='source/key.txt';d[name]=b'gsk_'+b'x'*30;m[name]=hashlib.sha256(d[name]).hexdigest()
        with self.assertRaisesRegex(ValueError,'Credential'):
            verifier.verify_package(archive(inject))

if __name__=='__main__':unittest.main()
