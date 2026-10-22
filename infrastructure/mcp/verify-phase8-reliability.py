identity=await call_boto3(service_name='sts',operation_name='GetCallerIdentity',params={})
assert identity['Account']=='118462784511'
source=await call_boto3(service_name='sqs',operation_name='GetQueueUrl',region_name='ap-south-1',params={'QueueName':'FreshRouteLabWork'})
dead=await call_boto3(service_name='sqs',operation_name='GetQueueUrl',region_name='ap-south-1',params={'QueueName':'FreshRouteLabDLQ'})
fixture='phase8-'+uuid.uuid4().hex
sent=await call_boto3(service_name='sqs',operation_name='SendMessage',region_name='ap-south-1',params={'QueueUrl':source['QueueUrl'],'MessageBody':json.dumps({'fixtureId':fixture,'fail':True})})
found=None
for attempt in range(40):
    page=await call_boto3(service_name='sqs',operation_name='ReceiveMessage',region_name='ap-south-1',params={'QueueUrl':dead['QueueUrl'],'MaxNumberOfMessages':1,'WaitTimeSeconds':2,'VisibilityTimeout':30,'MessageSystemAttributeNames':['ApproximateReceiveCount','DeadLetterQueueSourceArn']})
    for row in page.get('Messages',[]):
        if json.loads(row['Body']).get('fixtureId')==fixture:found=row
    if found:break
    await asyncio.sleep(2)
checks={'poisonReachedDlq':found is not None}
detail={'fixtureId':fixture,'originalMessageId':sent['MessageId']}
if found:
    detail['dlqReceiveCount']=found.get('Attributes',{}).get('ApproximateReceiveCount')
    replay=await call_boto3(service_name='sqs',operation_name='SendMessage',region_name='ap-south-1',params={'QueueUrl':source['QueueUrl'],'MessageBody':json.dumps({'fixtureId':fixture,'fail':False})})
    await call_boto3(service_name='sqs',operation_name='DeleteMessage',region_name='ap-south-1',params={'QueueUrl':dead['QueueUrl'],'ReceiptHandle':found['ReceiptHandle']})
    processed=[]
    for attempt in range(20):
        logs=await call_boto3(service_name='logs',operation_name='FilterLogEvents',region_name='ap-south-1',params={'logGroupName':'/freshroute/reliability-lab','filterPattern':'"'+fixture+'"'})
        processed=[x['message'] for x in logs.get('events',[]) if 'FIXTURE_PROCESSED' in x['message']]
        if processed:break
        await asyncio.sleep(2)
    checks['controlledReplayProcessed']=len(processed)>0
    detail['replayMessageId']=replay['MessageId']
    detail['processingEvidence']=processed
result={'checks':checks,'pass':all(checks.values()),'detail':detail,'scope':'Isolated disposable queues only. At-least-once delivery; no exactly-once assertion.'}
result
