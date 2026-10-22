import concurrent.futures
import json
import sys
import urllib.request
from pathlib import Path

transfers = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
def upload(item):
    payload = Path(item['path']).read_bytes()
    request = urllib.request.Request(item['url'], data=payload, method='PUT', headers={'Content-Type':item['contentType']})
    with urllib.request.urlopen(request, timeout=90) as response:
        return {'key':item['key'], 'status':response.status, 'bytes':len(payload), 'version':response.headers.get('x-amz-version-id')}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(upload, transfers))
Path('build/web-release.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps({'uploaded':len(results),'allSuccessful':all(r['status']==200 for r in results)}))
