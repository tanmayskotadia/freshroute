#!/bin/bash
set -euo pipefail
dnf install -y amazon-efs-utils python3
mkdir -p /mnt/shared /var/lib/freshroute
mount -t efs -o tls ${FileSystem}:/ /mnt/shared
cat /var/lib/cloud/data/instance-id > /var/lib/freshroute/scratch.txt
python3 - <<'PY'
import os,json
try:
  with open('/mnt/shared/receiving.json','x') as f: json.dump({'fixture':'FreshRoute fictional receiving manifest','capacityKg':500,'produce':['banana','tomato','mango']},f,sort_keys=True)
except FileExistsError: pass
PY
cat > /opt/freshroute-lab.py <<'PY'
from http.server import BaseHTTPRequestHandler,HTTPServer
import json,hashlib,os
class Handler(BaseHTTPRequestHandler):
  def do_GET(self):
    if not os.path.ismount('/mnt/shared'):
      self.send_error(503);return
    shared=open('/mnt/shared/receiving.json','rb').read()
    body=json.dumps({'node':open('/var/lib/cloud/data/instance-id').read().strip(),'ebsScratch':open('/var/lib/freshroute/scratch.txt').read().strip(),'sharedSha256':hashlib.sha256(shared).hexdigest(),'fixture':json.loads(shared),'sharedMounted':True}).encode()
    self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
  def log_message(self,*args):pass
HTTPServer(('0.0.0.0',8080),Handler).serve_forever()
PY
cat > /etc/systemd/system/freshroute-lab.service <<'UNIT'
[Unit]
After=network-online.target
[Service]
ExecStart=/usr/bin/python3 /opt/freshroute-lab.py
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now freshroute-lab
