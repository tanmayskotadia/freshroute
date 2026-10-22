# AWS MCP: run one stage per invocation to avoid long-task response expiry.
# Change ACTION to drift or remediate; run status until the expected evaluation arrives.
# Do not delete the lab until remediation is COMPLIANT.
ACTION='status'
identity=await call_boto3(service_name='sts',operation_name='GetCallerIdentity',params={})
assert identity['Account']=='118462784511'
s=await call_boto3(service_name='cloudformation',operation_name='DescribeStacks',region_name='ap-south-1',params={'StackName':'FreshRouteConfigLab'})
o={x['OutputKey']:x['OutputValue'] for x in s['Stacks'][0]['Outputs']}
interfaces=await call_boto3(service_name='ec2',operation_name='DescribeNetworkInterfaces',region_name='ap-south-1',params={'Filters':[{'Name':'group-id','Values':[o['FixtureGroupId']]}]})
assert not interfaces['NetworkInterfaces'], 'Fixture must be unattached.'
sg=await call_boto3(service_name='ec2',operation_name='DescribeSecurityGroups',region_name='ap-south-1',params={'GroupIds':[o['FixtureGroupId']]})
hasDrift=any(x.get('FromPort')==8081 for x in sg['SecurityGroups'][0]['IpPermissions'])
permission=[{'IpProtocol':'tcp','FromPort':8081,'ToPort':8081,'IpRanges':[{'CidrIp':'0.0.0.0/0'}]}]
if ACTION=='drift' and not hasDrift:
 await call_boto3(service_name='ec2',operation_name='AuthorizeSecurityGroupIngress',region_name='ap-south-1',params={'GroupId':o['FixtureGroupId'],'IpPermissions':permission})
if ACTION=='remediate':
 if hasDrift:await call_boto3(service_name='ec2',operation_name='RevokeSecurityGroupIngress',region_name='ap-south-1',params={'GroupId':o['FixtureGroupId'],'IpPermissions':permission})
 await call_boto3(service_name='config',operation_name='StartConfigRulesEvaluation',region_name='ap-south-1',params={'ConfigRuleNames':['FreshRouteLabAuthorizedPorts']})
r=await call_boto3(service_name='config',operation_name='GetComplianceDetailsByConfigRule',region_name='ap-south-1',params={'ConfigRuleName':'FreshRouteLabAuthorizedPorts'})
result={'stage':ACTION,'fixtureUnattached':True,'evaluations':[{'compliance':x['ComplianceType'],'recordedAt':str(x['ResultRecordedTime'])} for x in r.get('EvaluationResults',[])],'note':'Evaluation is asynchronous. Record baseline, drift and remediation in separate status invocations.'}
result
