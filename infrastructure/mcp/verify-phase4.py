# Execute this self-contained script through AWS MCP run_script, not the local CLI.
# Passwords and tokens exist only in this invocation; nothing returns their values.
stack = await call_boto3(service_name='cloudformation', operation_name='DescribeStacks', region_name='ap-south-1', params={'StackName':'FreshRouteApplication'})
outputs = {item['OutputKey']:item['OutputValue'] for item in stack['Stacks'][0]['Outputs']}
pool, client = outputs['UserPoolId'], outputs['ClientId']
created, subjects = [], []
verification = {}
try:
    health = await call_boto3(service_name='lambda', operation_name='Invoke', region_name='ap-south-1', params={'FunctionName':'FreshRouteVerification','InvocationType':'RequestResponse','Payload':json.dumps({'health':True})})
    tokens = []
    for label in ['a','b']:
        username = f'freshroute-qa-{uuid.uuid4().hex}-{label}@example.invalid'
        password = uuid.uuid4().hex + 'Aa!9'
        user = await call_boto3(service_name='cognito-idp', operation_name='AdminCreateUser', region_name='ap-south-1', params={'UserPoolId':pool,'Username':username,'MessageAction':'SUPPRESS','UserAttributes':[{'Name':'email','Value':username}]})
        created.append(username)
        subjects.append(next(a['Value'] for a in user['User']['Attributes'] if a['Name']=='sub'))
        await call_boto3(service_name='cognito-idp', operation_name='AdminSetUserPassword', region_name='ap-south-1', params={'UserPoolId':pool,'Username':username,'Password':password,'Permanent':True})
        auth = await call_boto3(service_name='cognito-idp', operation_name='AdminInitiateAuth', region_name='ap-south-1', params={'UserPoolId':pool,'ClientId':client,'AuthFlow':'ADMIN_USER_PASSWORD_AUTH','AuthParameters':{'USERNAME':username,'PASSWORD':password}})
        tokens.append(auth['AuthenticationResult']['AccessToken'])
    invoked = await call_boto3(service_name='lambda', operation_name='Invoke', region_name='ap-south-1', params={'FunctionName':'FreshRouteVerification','InvocationType':'RequestResponse','Payload':json.dumps({'tokenA':tokens[0],'tokenB':tokens[1]})})
    verification = {'health':json.loads(health['Payload']), 'accessAndPersistence':json.loads(invoked['Payload'])}
finally:
    cleanup = []
    for username in created:
        try:
            await call_boto3(service_name='cognito-idp', operation_name='AdminDeleteUser', region_name='ap-south-1', params={'UserPoolId':pool,'Username':username})
            cleanup.append('deleted')
        except Exception as error:
            cleanup.append(str(error))
    requests = {}
    for table in ['FreshRouteShipments','FreshRouteRuns','FreshRouteDestinations','FreshRouteActivity']:
        pages = await asyncio.gather(*[call_boto3(service_name='dynamodb', operation_name='Query', region_name='ap-south-1', params={'TableName':table,'KeyConditionExpression':'#o = :o','ExpressionAttributeNames':{'#o':'owner'},'ExpressionAttributeValues':{':o':{'S':subject}},'ProjectionExpression':'#o,id'}) for subject in subjects], return_exceptions=True)
        failures = [str(page) for page in pages if isinstance(page,Exception)]
        if failures: raise RuntimeError('Test data cleanup query failed: ' + '; '.join(failures))
        entries = [{'DeleteRequest':{'Key':{'owner':row['owner'],'id':row['id']}}} for page in pages for row in page.get('Items',[])]
        if entries: requests[table] = entries
    cleaned = await call_boto3(service_name='dynamodb', operation_name='BatchWriteItem', region_name='ap-south-1', params={'RequestItems':requests}) if requests else {}
result = {'verification':verification,'temporaryUserCleanup':cleanup,'testDataCleanup':cleaned}
result
