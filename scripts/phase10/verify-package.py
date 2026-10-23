"""Verify a submission ZIP without extracting it. Uses the Python standard library."""
import argparse
import hashlib
import json
from pathlib import PurePosixPath
import re
import zipfile

SECRET = re.compile(rb'(?:gsk_[A-Za-z0-9]{25,}|AKIA[A-Z0-9]{16}|X-Amz-Signature=[a-f0-9]{64})')

def verify_package(path):
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Duplicate archive paths')
        for name in names:
            p = PurePosixPath(name)
            if p.is_absolute() or '..' in p.parts or '\\' in name or ':' in name:
                raise ValueError('Unsafe archive path')
            if any(part in {'.git', 'node_modules', 'tmp', '.env', '.env.local'} for part in p.parts):
                raise ValueError('Excluded working files found')
            if p.name == 'cloud-config.json':
                raise ValueError('Deployment-local configuration found')
        if sum(i.file_size for i in z.infolist()) > 150_000_000:
            raise ValueError('Archive exceeds submission size limit')
        if z.testzip() is not None:
            raise ValueError('ZIP CRC verification failed')
        manifest = json.loads(z.read('SHA256_MANIFEST.json'))
        actual = set(names) - {'START_HERE.txt', 'SHA256_MANIFEST.json'}
        if actual != set(manifest):
            raise ValueError('Manifest does not cover every payload file')
        for name, expected in manifest.items():
            data = z.read(name)
            if hashlib.sha256(data).hexdigest() != expected:
                raise ValueError('Payload checksum mismatch: ' + name)
            if name.startswith('source/') and SECRET.search(data):
                raise ValueError('Credential signature found: ' + name)
        required = {
            'source/package.json', 'source/package-lock.json', 'source/src/App.tsx',
            'source/docs/phase-9/SYLLABUS_MATRIX.csv',
            'deliverables/FreshRoute-Technical-Report.pdf',
            'deliverables/FreshRoute-Presentation.pptx',
        }
        if not required.issubset(actual):
            raise ValueError('Required submission files missing')
        return {'status': 'PASS', 'payloadFiles': len(actual), 'allChecksumsVerified': True,
                'crcVerified': True, 'excludedPathsAbsent': True,
                'credentialSignatureScan': 'no matches (not a comprehensive secret audit)'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive')
    args = parser.parse_args()
    try:
        print(json.dumps(verify_package(args.archive), indent=2))
    except (ValueError, KeyError, zipfile.BadZipFile) as error:
        print(json.dumps({'status': 'FAIL', 'reason': str(error)}))
        raise SystemExit(1)
