import json
import sys
import urllib.request
from pathlib import Path

transfer = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
payload = Path(sys.argv[2]).read_bytes()
request = urllib.request.Request(transfer['url'], data=payload, method='PUT')
with urllib.request.urlopen(request, timeout=90) as response:
    print(json.dumps({'status': response.status, 'bytes': len(payload), 'version': response.headers.get('x-amz-version-id')}))
