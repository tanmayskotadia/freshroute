# AWS MCP only. No credentials or log payloads are returned.
identity=await call_boto3(service_name='sts',operation_name='GetCallerIdentity',params={})
assert identity['Account']=='118462784511'
region='ap-south-1'
trail=await call_boto3(service_name='cloudtrail',operation_name='GetTrail',region_name=region,params={'Name':'FreshRouteAudit'})
status=await call_boto3(service_name='cloudtrail',operation_name='GetTrailStatus',region_name=region,params={'Name':'FreshRouteAudit'})
selectors=await call_boto3(service_name='cloudtrail',operation_name='GetEventSelectors',region_name=region,params={'TrailName':'FreshRouteAudit'})
objects=await call_boto3(service_name='s3',operation_name='ListObjectsV2',region_name=region,params={'Bucket':'freshroute-118462784511-ap-south-1-audit','Prefix':'audit/AWSLogs/118462784511/'})
files=[x for x in objects.get('Contents',[]) if '/CloudTrail/' in x['Key'] and x['Size']>0]
digests=[x for x in objects.get('Contents',[]) if '/CloudTrail-Digest/' in x['Key'] and x['Size']>0]
head=await call_boto3(service_name='s3',operation_name='HeadObject',region_name=region,params={'Bucket':'freshroute-118462784511-ap-south-1-audit','Key':files[-1]['Key']}) if files else {}
alarms=await call_boto3(service_name='cloudwatch',operation_name='DescribeAlarms',region_name=region,params={'AlarmNamePrefix':'FreshRoute-'})
history=await call_boto3(service_name='cloudwatch',operation_name='DescribeAlarmHistory',region_name=region,params={'AlarmName':'FreshRoute-AlarmCanary'})
dashboard=await call_boto3(service_name='cloudwatch',operation_name='GetDashboard',region_name=region,params={'DashboardName':'FreshRoute-Operations'})
budget=await call_boto3(service_name='budgets',operation_name='DescribeBudget',region_name='us-east-1',params={'AccountId':identity['Account'],'BudgetName':'FreshRoute-Project-Ceiling'})
notices=await call_boto3(service_name='budgets',operation_name='DescribeNotificationsForBudget',region_name='us-east-1',params={'AccountId':identity['Account'],'BudgetName':'FreshRoute-Project-Ceiling'})
alarmTransitions=[{'at':str(x['Timestamp']),'type':x['HistoryItemType'],'summary':x['HistorySummary']} for x in history.get('AlarmHistoryItems',[])]
checks={'trailLogging':status.get('IsLogging') is True,'actualAuditObjectDelivered':len(files)>0,'digestDelivered':len(digests)>0,'auditObjectKmsEncrypted':head.get('ServerSideEncryption')=='aws:kms','trailValidationEnabled':trail['Trail'].get('LogFileValidationEnabled') is True,'dashboardConfigured':len(json.loads(dashboard['DashboardBody'])['widgets'])>=7,'alarmTransitionsObserved':any('OK to ALARM' in x['summary'] for x in alarmTransitions),'alarmNotificationActionSucceeded':any(x['type']=='Action' and 'Successfully executed action' in x['summary'] for x in alarmTransitions),'grossBudgetConfigured':budget['Budget']['CostTypes']['IncludeCredit'] is False,'fiveBudgetThresholds':len(notices.get('Notifications',[]))==5}
result={'checks':checks,'pass':all(checks.values()),'trailStatus':{k:str(v) for k,v in status.items() if k in ['IsLogging','LatestDeliveryTime','LatestDigestDeliveryTime','LatestDeliveryError']},'auditFile':files[-1]['Key'] if files else None,'auditEncryption':{'algorithm':head.get('ServerSideEncryption'),'key':head.get('SSEKMSKeyId')},'alarmHistory':alarmTransitions,'alarms':[{'name':x['AlarmName'],'state':x['StateValue']} for x in alarms.get('MetricAlarms',[])],'budget':{'limit':budget['Budget']['BudgetLimit'],'thresholds':[x['Threshold'] for x in notices.get('Notifications',[])]},'note':'No digest-chain cryptographic validation or email delivery assertion; existing production DLQ contents are preserved for review.'}
checks['reportDataEventsScoped']=any('arn:aws:s3:::freshroute-118462784511-ap-south-1-reports/exports/' in d.get('Values',[]) for s in selectors.get('EventSelectors',[]) for d in s.get('DataResources',[]))
checks['apiServerErrorAlarmConfigured']=any(x['AlarmName']=='FreshRoute-ApiServerErrors' for x in alarms.get('MetricAlarms',[]))
result['eventSelectors']=selectors.get('EventSelectors',[])
result['pass']=all(checks.values())
result
