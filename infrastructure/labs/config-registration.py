import boto3
import time
import json
import urllib.request
from botocore.config import Config
from botocore.exceptions import ClientError
def respond(event,context,status,data,physical):
    body=json.dumps({'Status':status,'Reason':'See the registration function log for a safe error class','PhysicalResourceId':physical,'StackId':event['StackId'],'RequestId':event['RequestId'],'LogicalResourceId':event['LogicalResourceId'],'NoEcho':False,'Data':data}).encode()
    request=urllib.request.Request(event['ResponseURL'],data=body,headers={'content-type':'','content-length':str(len(body))},method='PUT')
    with urllib.request.urlopen(request,timeout=10) as response:
        response.read()
def handler(event,context):
    client=boto3.client('config',region_name='ap-south-1',config=Config(connect_timeout=5,read_timeout=10,retries={'total_max_attempts':2,'mode':'standard'}))
    physical='FreshRouteLabConfigRegistration'
    try:
        if event['RequestType']=='Delete':
            for operation,args in [
                (client.stop_configuration_recorder,{'ConfigurationRecorderName':'FreshRouteLabRecorder'}),
                (client.delete_config_rule,{'ConfigRuleName':'FreshRouteLabAuthorizedPorts'}),
                (client.delete_delivery_channel,{'DeliveryChannelName':'FreshRouteLabDelivery'}),
                (client.delete_configuration_recorder,{'ConfigurationRecorderName':'FreshRouteLabRecorder'})]:
                for attempt in range(20):
                    try:
                        operation(**args);break
                    except ClientError as error:
                        code=error.response['Error']['Code']
                        if code.startswith('NoSuch'):break
                        if code=='ResourceInUseException' and attempt<19:time.sleep(3);continue
                        raise
        else:
            p=event['ResourceProperties']
            existing=client.describe_configuration_recorders()['ConfigurationRecorders']
            if any(row['name']!='FreshRouteLabRecorder' for row in existing):
                raise RuntimeError('Existing external Config recorder must be preserved')
            client.put_configuration_recorder(ConfigurationRecorder={'name':'FreshRouteLabRecorder','roleARN':p['RoleArn'],'recordingGroup':{'allSupported':False,'includeGlobalResourceTypes':False,'resourceTypes':['AWS::EC2::SecurityGroup']}})
            client.put_delivery_channel(DeliveryChannel={'name':'FreshRouteLabDelivery','s3BucketName':p['BucketName']})
            client.start_configuration_recorder(ConfigurationRecorderName='FreshRouteLabRecorder')
            client.put_config_rule(ConfigRule={'ConfigRuleName':'FreshRouteLabAuthorizedPorts','Scope':{'ComplianceResourceId':p['FixtureId'],'ComplianceResourceTypes':['AWS::EC2::SecurityGroup']},'Source':{'Owner':'AWS','SourceIdentifier':'VPC_SG_OPEN_ONLY_TO_AUTHORIZED_PORTS'},'InputParameters':'{"authorizedTcpPorts":"8080"}'})
        respond(event,context,'SUCCESS',{},physical)
    except Exception as error:
        # Do not log the CloudFormation callback URL or full event.
        print(type(error).__name__)
        respond(event,context,'FAILED',{'errorClass':type(error).__name__},physical)
