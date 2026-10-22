import os,json,socket,urllib.request,urllib.error
def handler(event,context):
    # Caller is IAM-authorized; targets are restricted to these two fictional lab CIDRs.
    host=event.get('host',os.environ['ALB_HOST'])
    if host!=os.environ['ALB_HOST'] and not host.startswith('10.80.'):
        return {'error':'LAB_TARGET_ONLY'}
    if event.get('portCheck'):
        try:
            with socket.socket() as connection:
                connection.settimeout(2)
                connection.connect((host,22))
                return {'sshReachable':True}
        except OSError:return {'sshReachable':False}
    request=urllib.request.Request('http://'+host+(':'+str(8080) if host.startswith('10.80.') else '')+'/health',headers={'X-FreshRoute-Lab':'blocked'} if event.get('blocked') else {})
    try:
        with urllib.request.urlopen(request,timeout=8) as r:return {'status':r.status,'body':json.load(r)}
    except urllib.error.HTTPError as e:return {'status':e.code}
