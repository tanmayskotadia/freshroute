import {writeFileSync} from 'node:fs';
const ref=n=>({Ref:n}),att=(n,a)=>({'Fn::GetAtt':[n,a]});
const res=(Type,Properties)=>({Type,Properties});
const tags=[{Key:'Project',Value:'FreshRoute'},{Key:'Lifecycle',Value:'disposable-lab'}];
export const reliabilityTemplate={AWSTemplateFormatVersion:'2010-09-09',Description:'Isolated poison message / DLQ / controlled replay fixture; never touches production queues',Resources:{
 Dead:res('AWS::SQS::Queue',{QueueName:'FreshRouteLabDLQ',SqsManagedSseEnabled:true,MessageRetentionPeriod:86400,Tags:tags}),
 Work:res('AWS::SQS::Queue',{QueueName:'FreshRouteLabWork',SqsManagedSseEnabled:true,VisibilityTimeout:12,MessageRetentionPeriod:86400,RedrivePolicy:{deadLetterTargetArn:att('Dead','Arn'),maxReceiveCount:2},Tags:tags}),
 Logs:res('AWS::Logs::LogGroup',{LogGroupName:'/freshroute/reliability-lab',RetentionInDays:7}),
 Role:res('AWS::IAM::Role',{AssumeRolePolicyDocument:{Version:'2012-10-17',Statement:[{Effect:'Allow',Action:'sts:AssumeRole',Principal:{Service:'lambda.amazonaws.com'}}]},Policies:[{PolicyName:'OnlyFixtureQueueAndLogs',PolicyDocument:{Version:'2012-10-17',Statement:[{Effect:'Allow',Action:['sqs:ReceiveMessage','sqs:DeleteMessage','sqs:GetQueueAttributes'],Resource:att('Work','Arn')},{Effect:'Allow',Action:['logs:CreateLogStream','logs:PutLogEvents'],Resource:att('Logs','Arn')}]}}],Tags:tags}),
 Worker:res('AWS::Lambda::Function',{FunctionName:'FreshRouteReliabilityLab',Runtime:'python3.12',Handler:'index.handler',Role:att('Role','Arn'),Timeout:2,MemorySize:128,LoggingConfig:{LogGroup:ref('Logs')},Code:{ZipFile:'import json\ndef handler(event,context):\n failures=[]\n for row in event["Records"]:\n  data=json.loads(row["body"])\n  if data.get("fail"):\n   failures.append({"itemIdentifier":row["messageId"]})\n  else:\n   print(json.dumps({"stage":"FIXTURE_PROCESSED","fixtureId":data["fixtureId"]}))\n return {"batchItemFailures":failures}\n'},Tags:tags}),
 Mapping:res('AWS::Lambda::EventSourceMapping',{EventSourceArn:att('Work','Arn'),FunctionName:ref('Worker'),BatchSize:1,FunctionResponseTypes:['ReportBatchItemFailures']}),
 },Outputs:{WorkUrl:{Value:ref('Work')},DeadUrl:{Value:ref('Dead')}}};
writeFileSync('build/phase8/FreshRouteReliabilityLab.template.json',JSON.stringify(reliabilityTemplate));
