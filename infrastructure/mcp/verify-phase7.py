# Execute through AWS MCP. Tokens and passwords never leave this invocation.
identity = await call_boto3(service_name='sts', operation_name='GetCallerIdentity', region_name='ap-south-1', params={})
if identity['Account'] != '118462784511':
    raise RuntimeError('Wrong AWS account: reconnect the FreshRoute deployment account before verification.')
stack = await call_boto3(service_name='cloudformation', operation_name='DescribeStacks', region_name='ap-south-1', params={'StackName':'FreshRouteApplication'})
outputs = {x['OutputKey']:x['OutputValue'] for x in stack['Stacks'][0]['Outputs']}
pool, client = outputs['UserPoolId'], outputs['ClientId']
created, subjects, tokens = [], [], []
verification, cleanup = {}, []
try:
    for label in ['a','b']:
        username = f'freshroute-phase7-{uuid.uuid4().hex}-{label}@example.invalid'
        password = uuid.uuid4().hex + 'Aa!9'
        user = await call_boto3(service_name='cognito-idp', operation_name='AdminCreateUser', region_name='ap-south-1', params={'UserPoolId':pool,'Username':username,'MessageAction':'SUPPRESS','UserAttributes':[{'Name':'email','Value':username}]})
        created.append(username)
        subjects.append(next(a['Value'] for a in user['User']['Attributes'] if a['Name']=='sub'))
        await call_boto3(service_name='cognito-idp', operation_name='AdminSetUserPassword', region_name='ap-south-1', params={'UserPoolId':pool,'Username':username,'Password':password,'Permanent':True})
        auth = await call_boto3(service_name='cognito-idp', operation_name='AdminInitiateAuth', region_name='ap-south-1', params={'UserPoolId':pool,'ClientId':client,'AuthFlow':'ADMIN_USER_PASSWORD_AUTH','AuthParameters':{'USERNAME':username,'PASSWORD':password}})
        tokens.append(auth['AuthenticationResult']['AccessToken'])
    invoked = await call_boto3(service_name='lambda', operation_name='Invoke', region_name='ap-south-1', params={'FunctionName':'FreshRouteVerification','InvocationType':'RequestResponse','Payload':json.dumps({'phase7':True,'tokenA':tokens[0],'tokenB':tokens[1]})})
    verification = json.loads(invoked['Payload'])
    if verification.get('detail',{}).get('runId'):
        await call_boto3(service_name='dynamodb',operation_name='PutItem',region_name='ap-south-1',params={'TableName':'FreshRouteActivity','Item':{'owner':{'S':'AI#'+subjects[0]},'id':{'S':'RATE#'+time.strftime('%Y-%m-%d',time.gmtime())},'used':{'N':'20'},'expiresAt':{'N':str(int(time.time())+172800)}}})
        quota = await call_boto3(service_name='lambda',operation_name='Invoke',region_name='ap-south-1',params={'FunctionName':'FreshRouteVerification','Payload':json.dumps({'quotaCheck':verification['detail']['runId'],'tokenA':tokens[0]})})
        verification['quotaCheck']=json.loads(quota['Payload'])
    # Wait briefly for all committed outbox events, including terminal updates, to finish.
    pending = []
    for attempt in range(20):
        rows = await asyncio.gather(*[call_boto3(service_name='dynamodb', operation_name='Query', region_name='ap-south-1', params={'TableName':'FreshRouteActivity','KeyConditionExpression':'#o = :o','ExpressionAttributeNames':{'#o':'owner'},'ExpressionAttributeValues':{':o':{'S':subject}},'ConsistentRead':True}) for subject in subjects],return_exceptions=True)
        pending=[]
        published=[]
        for subject,page in zip(subjects,rows):
            if isinstance(page,Exception): raise page
            ids={x['id']['S'] for x in page.get('Items',[])}
            for row in page.get('Items',[]):
                rid=row['id']['S']
                if rid.startswith('OUTBOX#') and 'PROCESSED#'+rid[7:] not in ids: pending.append({'owner':subject,'id':rid})
                if rid.startswith('PROCESSED#'): published.append({'eventId':rid[10:],'snsMessageId':row.get('snsMessageId',{}).get('S')})
        if not pending: break
        await asyncio.sleep(1)
    verification['backgroundEvents']={'pending':len(pending),'processed':published}
    states=[]
    for jid in verification.get('detail',{}).get('analysisJobIds',[]):
        execution=await call_boto3(service_name='stepfunctions', operation_name='DescribeExecution', region_name='ap-south-1', params={'executionArn':outputs['AnalysisStateMachineArn'].replace(':stateMachine:',':execution:')+':'+jid})
        states.append({'jobId':jid,'status':execution['status']})
    verification['actualStepFunctionsExecutions']=states
finally:
    # Probe releases its own reservations before cleanup. Never alter a real user's rows.
    for username in created:
        await call_boto3(service_name='cognito-idp', operation_name='AdminDeleteUser', region_name='ap-south-1', params={'UserPoolId':pool,'Username':username})
    for table in ['FreshRouteShipments','FreshRouteRuns','FreshRouteDestinations','FreshRouteActivity']:
        for subject in (subjects + ['AI#'+s for s in subjects] if table == 'FreshRouteActivity' else subjects):
            page=await call_boto3(service_name='dynamodb', operation_name='Query', region_name='ap-south-1', params={'TableName':table,'KeyConditionExpression':'#o = :o','ExpressionAttributeNames':{'#o':'owner'},'ExpressionAttributeValues':{':o':{'S':subject}},'ProjectionExpression':'#o,id'})
            entries=[{'DeleteRequest':{'Key':{'owner':row['owner'],'id':row['id']}}} for row in page.get('Items',[])]
            for offset in range(0,len(entries),25):
                removed=await call_boto3(service_name='dynamodb', operation_name='BatchWriteItem', region_name='ap-south-1', params={'RequestItems':{table:entries[offset:offset+25]}})
                if removed.get('UnprocessedItems'): raise RuntimeError('Cleanup requires retry')
    for subject in subjects:
        for bucket,prefix in [('freshroute-118462784511-ap-south-1-reports','exports/'+subject+'/'),('freshroute-118462784511-ap-south-1-data','quarantine/'+subject+'/')]:
            versions=await call_boto3(service_name='s3', operation_name='ListObjectVersions', region_name='ap-south-1', params={'Bucket':bucket,'Prefix':prefix})
            objects=[{'Key':x['Key'],'VersionId':x['VersionId']} for x in versions.get('Versions',[])+versions.get('DeleteMarkers',[])]
            if objects: await call_boto3(service_name='s3', operation_name='DeleteObjects', region_name='ap-south-1', params={'Bucket':bucket,'Delete':{'Objects':objects,'Quiet':True}})
    cleanup.append({'temporaryUsersDeleted':len(created),'ownerPartitionsDeleted':len(subjects),'privateTestFilesDeleted':True})
result={'verification':verification,'cleanup':cleanup}
result
