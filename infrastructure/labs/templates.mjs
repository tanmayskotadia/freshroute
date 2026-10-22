// Independent CloudFormation groups: retained operations and disposable engineering labs.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const ref = name => ({Ref:name}), att = (name,attribute) => ({'Fn::GetAtt':[name,attribute]});
const resource = (Type, Properties, extra={}) => ({Type,Properties,...extra});
const tags = [{Key:'Project',Value:'FreshRoute'},{Key:'Phase',Value:'8'},{Key:'Lifecycle',Value:'disposable-lab'}];
const trust = service => ({Version:'2012-10-17',Statement:[{Effect:'Allow',Principal:{Service:service},Action:'sts:AssumeRole'}]});
const policy = Statement => ({Version:'2012-10-17',Statement});
const allow = (Action,Resource) => ({Effect:'Allow',Action,Resource});
export function operationsTemplate() {
  const Resources = {}, alarms=[];
  const functions=['FreshRouteWeb','FreshRouteWorkspaceApi','FreshRouteImportWorker','FreshRouteAnalysisWorker','FreshRouteOutboxBridge','FreshRoutePostDecisionWorker','FreshRouteCopilot'];
  Resources.Alerts=resource('AWS::SNS::Topic',{TopicName:'FreshRouteOperationalAlerts'});
  Resources.AlertsPolicy=resource('AWS::SNS::TopicPolicy',{Topics:[ref('Alerts')],PolicyDocument:policy([{Effect:'Allow',Principal:{Service:'cloudwatch.amazonaws.com'},Action:'sns:Publish',Resource:ref('Alerts'),Condition:{StringEquals:{'aws:SourceAccount':ref('AWS::AccountId')},ArnLike:{'aws:SourceArn':{'Fn::Sub':'arn:${AWS::Partition}:cloudwatch:${AWS::Region}:${AWS::AccountId}:alarm:FreshRoute-*'}}}}])});
  // Alarm notifications contain only operational metadata; no application records or credentials.
  function alarm(id, namespace, metric, dimensions, threshold, stat='Sum') {
    Resources[id]=resource('AWS::CloudWatch::Alarm',{AlarmName:`FreshRoute-${id}`,AlarmDescription:'FreshRoute operational signal; missing error data is not breaching.',Namespace:namespace,MetricName:metric,Dimensions:dimensions,Period:60,EvaluationPeriods:2,DatapointsToAlarm:1,Statistic:stat,Threshold:threshold,ComparisonOperator:'GreaterThanOrEqualToThreshold',TreatMissingData:'notBreaching',AlarmActions:[ref('Alerts')],OKActions:[ref('Alerts')]});
    alarms.push(att(id,'Arn'));
  }
  for (const f of functions) alarm(f.replace('FreshRoute','')+'Errors','AWS/Lambda','Errors',[{Name:'FunctionName',Value:f}],1);
  for(const q of ['FreshRouteImportDLQ','FreshRoutePostDecisionDLQ','FreshRouteOutboxStreamFailures']) alarm(q+'Depth','AWS/SQS','ApproximateNumberOfMessagesVisible',[{Name:'QueueName',Value:q}],1,'Maximum');
  alarm('WorkflowFailures','AWS/States','ExecutionsFailed',[{Name:'StateMachineArn',Value:{'Fn::Sub':'arn:${AWS::Partition}:states:${AWS::Region}:${AWS::AccountId}:stateMachine:FreshRouteAnalysis'}}],1);
  alarm('ApiServerErrors','AWS/ApiGateway','5xx',[{Name:'ApiId',Value:'r2rxt5q5kk'}],1);
  Resources.AiFallbackMetric=resource('AWS::Logs::MetricFilter',{LogGroupName:'/freshroute/copilot',FilterPattern:'{ $.stage = "COPILOT_FALLBACK" }',MetricTransformations:[{MetricNamespace:'FreshRoute/Operations',MetricName:'AiFallbacks',MetricValue:'1',DefaultValue:0}]});
  alarm('AiFallbacks','FreshRoute/Operations','AiFallbacks',[],3);
  alarm('AlarmCanary','FreshRoute/Operations','VerificationSignal',[],1,'Maximum');
  const metric=(title,metrics,x,y,stat='Sum')=>({type:'metric',x,y,width:12,height:6,properties:{title,view:'timeSeries',region:ref('AWS::Region'),period:60,stat,metrics}});
  const widgets=[{type:'text',x:0,y:0,width:24,height:2,properties:{markdown:'# FreshRoute cloud control room\nOperational metrics, queues and workflow evidence. Sparse/empty metrics are not proof of uptime. Alarm notifications publish to the operational SNS topic; email delivery is separate.'}},
    metric('Requests and executions',functions.map(f=>['AWS/Lambda','Invocations','FunctionName',f]),0,2),
    metric('Function errors',functions.map(f=>['AWS/Lambda','Errors','FunctionName',f]),12,2),
    metric('Duration p95 (milliseconds)',functions.map(f=>['AWS/Lambda','Duration','FunctionName',f]),0,8,'p95'),
    metric('Pending work and dead letters',['FreshRouteImports','FreshRoutePostDecision','FreshRouteImportDLQ','FreshRoutePostDecisionDLQ','FreshRouteOutboxStreamFailures'].map(q=>['AWS/SQS','ApproximateNumberOfMessagesVisible','QueueName',q]),12,8,'Maximum'),
    metric('Workflow failures and timeouts',['ExecutionsFailed','ExecutionsTimedOut','ExecutionsSucceeded'].map(m=>['AWS/States',m,'StateMachineArn',{'Fn::Sub':'arn:${AWS::Partition}:states:${AWS::Region}:${AWS::AccountId}:stateMachine:FreshRouteAnalysis'}]),0,14),
    metric('AI fallback count',[['FreshRoute/Operations','AiFallbacks']],12,14),
    {type:'alarm',x:0,y:20,width:24,height:5,properties:{title:'Alarms (no data is distinct from healthy traffic)',alarms}}];
  Resources.Dashboard=resource('AWS::CloudWatch::Dashboard',{DashboardName:'FreshRoute-Operations',DashboardBody:{'Fn::Sub':JSON.stringify({widgets}).replaceAll('{"Ref":"AWS::Region"}','"${AWS::Region}"').replaceAll('{"Fn::Sub":"arn:${AWS::Partition}:states:${AWS::Region}:${AWS::AccountId}:stateMachine:FreshRouteAnalysis"}','"arn:${AWS::Partition}:states:${AWS::Region}:${AWS::AccountId}:stateMachine:FreshRouteAnalysis"').replace(/\{"Fn::GetAtt":\["([^"]+)","Arn"\]\}/g,'"${$1.Arn}"')}});
  Resources.Budget=resource('AWS::Budgets::Budget',{Budget:{BudgetName:'FreshRoute-Project-Ceiling',BudgetType:'COST',TimeUnit:'MONTHLY',BudgetLimit:{Amount:200,Unit:'USD'},CostTypes:{IncludeCredit:false,IncludeRefund:false,IncludeTax:true,IncludeSupport:true}},NotificationsWithSubscribers:[25,50,100,150,180].map(Threshold=>({Notification:{ComparisonOperator:'GREATER_THAN',NotificationType:'ACTUAL',Threshold,ThresholdType:'ABSOLUTE_VALUE'},Subscribers:[{SubscriptionType:'EMAIL',Address:ref('NotificationEmail')}]}))});
  return {AWSTemplateFormatVersion:'2010-09-09',Description:'FreshRoute retained monitoring, alarms and gross cost budget',Parameters:{NotificationEmail:{Type:'String',NoEcho:true}},Resources,Outputs:{DashboardName:{Value:'FreshRoute-Operations'},AlertsTopicArn:{Value:ref('Alerts')}}};
}
export function computeTemplate() {
 const R={};
 const add=(n,t,p,e)=>R[n]=resource(t,p,e);
 add('Vpc','AWS::EC2::VPC',{CidrBlock:'10.80.0.0/16',EnableDnsSupport:true,EnableDnsHostnames:true,Tags:tags});
 add('PeerVpc','AWS::EC2::VPC',{CidrBlock:'10.81.0.0/16',EnableDnsSupport:true,EnableDnsHostnames:true,Tags:tags});
 add('Gateway','AWS::EC2::InternetGateway',{Tags:tags}); add('GatewayAttachment','AWS::EC2::VPCGatewayAttachment',{VpcId:ref('Vpc'),InternetGatewayId:ref('Gateway')});
 add('RouteTable','AWS::EC2::RouteTable',{VpcId:ref('Vpc'),Tags:tags});
 add('InternetRoute','AWS::EC2::Route',{RouteTableId:ref('RouteTable'),DestinationCidrBlock:'0.0.0.0/0',GatewayId:ref('Gateway')},{DependsOn:'GatewayAttachment'});
 for(const [n,cidr,zone] of [['A','10.80.1.0/24',0],['B','10.80.2.0/24',1]]) {
   add('Subnet'+n,'AWS::EC2::Subnet',{VpcId:ref('Vpc'),CidrBlock:cidr,MapPublicIpOnLaunch:true,AvailabilityZone:{'Fn::Select':[zone,{'Fn::GetAZs':''}]},Tags:tags});
   add('Association'+n,'AWS::EC2::SubnetRouteTableAssociation',{SubnetId:ref('Subnet'+n),RouteTableId:ref('RouteTable')});
 }
 add('PeerSubnet','AWS::EC2::Subnet',{VpcId:ref('PeerVpc'),CidrBlock:'10.81.1.0/24',AvailabilityZone:{'Fn::Select':[0,{'Fn::GetAZs':''}]},Tags:tags});
 add('PeerRoutes','AWS::EC2::RouteTable',{VpcId:ref('PeerVpc'),Tags:tags});
 add('PeerAssociation','AWS::EC2::SubnetRouteTableAssociation',{SubnetId:ref('PeerSubnet'),RouteTableId:ref('PeerRoutes')});
 add('Peering','AWS::EC2::VPCPeeringConnection',{VpcId:ref('Vpc'),PeerVpcId:ref('PeerVpc'),Tags:tags});
 add('ToPeer','AWS::EC2::Route',{RouteTableId:ref('RouteTable'),DestinationCidrBlock:'10.81.0.0/16',VpcPeeringConnectionId:ref('Peering')});
 add('FromPeer','AWS::EC2::Route',{RouteTableId:ref('PeerRoutes'),DestinationCidrBlock:'10.80.0.0/16',VpcPeeringConnectionId:ref('Peering')});
 add('AlbSecurity','AWS::EC2::SecurityGroup',{VpcId:ref('Vpc'),GroupDescription:'Private fixture HTTP only from the peer lab VPC',SecurityGroupIngress:[{IpProtocol:'tcp',FromPort:80,ToPort:80,CidrIp:'10.81.0.0/16'}],Tags:tags});
 add('InstanceSecurity','AWS::EC2::SecurityGroup',{VpcId:ref('Vpc'),GroupDescription:'No SSH; fixture traffic from ALB and peer',SecurityGroupIngress:[{IpProtocol:'tcp',FromPort:8080,ToPort:8080,SourceSecurityGroupId:ref('AlbSecurity')},{IpProtocol:'tcp',FromPort:8080,ToPort:8080,CidrIp:'10.81.0.0/16'}],Tags:tags});
 add('FileSecurity','AWS::EC2::SecurityGroup',{VpcId:ref('Vpc'),GroupDescription:'NFS from lab instances only',SecurityGroupIngress:[{IpProtocol:'tcp',FromPort:2049,ToPort:2049,SourceSecurityGroupId:ref('InstanceSecurity')}],Tags:tags});
 add('ProbeSecurity','AWS::EC2::SecurityGroup',{VpcId:ref('PeerVpc'),GroupDescription:'No ingress; controlled private lab probe',SecurityGroupEgress:[{IpProtocol:'tcp',FromPort:80,ToPort:80,CidrIp:'10.80.0.0/16'},{IpProtocol:'tcp',FromPort:8080,ToPort:8080,CidrIp:'10.80.0.0/16'},{IpProtocol:'tcp',FromPort:22,ToPort:22,CidrIp:'10.80.0.0/16'},{IpProtocol:'tcp',FromPort:5432,ToPort:5432,CidrIp:'10.80.0.0/16'}],Tags:tags});
 add('FileSystem','AWS::EFS::FileSystem',{Encrypted:true,PerformanceMode:'generalPurpose',ThroughputMode:'bursting',FileSystemTags:tags});
 for(const n of ['A','B']) add('Mount'+n,'AWS::EFS::MountTarget',{FileSystemId:ref('FileSystem'),SubnetId:ref('Subnet'+n),SecurityGroups:[ref('FileSecurity')]});
 add('InstanceRole','AWS::IAM::Role',{AssumeRolePolicyDocument:trust('ec2.amazonaws.com'),ManagedPolicyArns:[{'Fn::Sub':'arn:${AWS::Partition}:iam::aws:policy/AmazonSSMManagedInstanceCore'}],Tags:tags});
 add('InstanceProfile','AWS::IAM::InstanceProfile',{Roles:[ref('InstanceRole')]});
 const userData=readFileSync(new URL('./userdata.sh',import.meta.url),'utf8');
 add('Launch','AWS::EC2::LaunchTemplate',{LaunchTemplateData:{ImageId:ref('ImageId'),InstanceType:'t3.micro',IamInstanceProfile:{Arn:att('InstanceProfile','Arn')},MetadataOptions:{HttpTokens:'required',HttpEndpoint:'enabled'},CreditSpecification:{CpuCredits:'standard'},NetworkInterfaces:[{DeviceIndex:0,AssociatePublicIpAddress:true,Groups:[ref('InstanceSecurity')]}],BlockDeviceMappings:[{DeviceName:'/dev/xvda',Ebs:{VolumeSize:8,VolumeType:'gp3',Encrypted:true,DeleteOnTermination:true}}],UserData:{'Fn::Base64':{'Fn::Sub':userData}},TagSpecifications:[{ResourceType:'instance',Tags:tags},{ResourceType:'volume',Tags:tags}]}});
 add('Alb','AWS::ElasticLoadBalancingV2::LoadBalancer',{Type:'application',Scheme:'internal',Subnets:[ref('SubnetA'),ref('SubnetB')],SecurityGroups:[ref('AlbSecurity')],Tags:tags});
 add('Targets','AWS::ElasticLoadBalancingV2::TargetGroup',{VpcId:ref('Vpc'),Port:8080,Protocol:'HTTP',HealthCheckPath:'/health',HealthCheckIntervalSeconds:15,HealthyThresholdCount:2,TargetGroupAttributes:[{Key:'deregistration_delay.timeout_seconds',Value:'10'}],Tags:tags});
 add('Listener','AWS::ElasticLoadBalancingV2::Listener',{LoadBalancerArn:ref('Alb'),Port:80,Protocol:'HTTP',DefaultActions:[{Type:'forward',TargetGroupArn:ref('Targets')}]});
 add('Workers','AWS::AutoScaling::AutoScalingGroup',{MinSize:'2',MaxSize:'2',DesiredCapacity:'2',VPCZoneIdentifier:[ref('SubnetA'),ref('SubnetB')],LaunchTemplate:{LaunchTemplateId:ref('Launch'),Version:att('Launch','LatestVersionNumber')},TargetGroupARNs:[ref('Targets')],HealthCheckType:'ELB',HealthCheckGracePeriod:480,Tags:tags.map(x=>({...x,PropagateAtLaunch:true}))},{DependsOn:['MountA','MountB','InternetRoute','Listener']});
 add('ScaleToZero','AWS::AutoScaling::ScheduledAction',{AutoScalingGroupName:ref('Workers'),DesiredCapacity:0,MinSize:0,MaxSize:0,StartTime:ref('ScaleDownAt')});
 add('ScaleOutPolicy','AWS::AutoScaling::ScalingPolicy',{AutoScalingGroupName:ref('Workers'),PolicyType:'SimpleScaling',AdjustmentType:'ChangeInCapacity',ScalingAdjustment:1,Cooldown:'30'});
 add('Waf','AWS::WAFv2::WebACL',{Scope:'REGIONAL',DefaultAction:{Allow:{}},VisibilityConfig:{CloudWatchMetricsEnabled:true,SampledRequestsEnabled:false,MetricName:'FreshRouteLabWaf'},Rules:[{Name:'BlockBenignVerificationHeader',Priority:0,Action:{Block:{}},Statement:{ByteMatchStatement:{FieldToMatch:{SingleHeader:{Name:'x-freshroute-lab'}},PositionalConstraint:'EXACTLY',SearchString:'blocked',TextTransformations:[{Priority:0,Type:'NONE'}]}},VisibilityConfig:{CloudWatchMetricsEnabled:true,SampledRequestsEnabled:false,MetricName:'FreshRouteLabBlocked'}}],Tags:tags});
 add('WafAssociation','AWS::WAFv2::WebACLAssociation',{ResourceArn:ref('Alb'),WebACLArn:att('Waf','Arn')});
 add('ProbeLogs','AWS::Logs::LogGroup',{LogGroupName:'/freshroute/lab-probe',RetentionInDays:7});
 add('ProbeRole','AWS::IAM::Role',{AssumeRolePolicyDocument:trust('lambda.amazonaws.com'),ManagedPolicyArns:[{'Fn::Sub':'arn:${AWS::Partition}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'}],Policies:[{PolicyName:'LabLogs',PolicyDocument:policy([allow(['logs:CreateLogStream','logs:PutLogEvents'],att('ProbeLogs','Arn'))])}],Tags:tags});
 add('Probe','AWS::Lambda::Function',{FunctionName:'FreshRouteLabProbe',Runtime:'python3.12',Handler:'index.handler',Role:att('ProbeRole','Arn'),Timeout:45,MemorySize:128,VpcConfig:{SubnetIds:[ref('PeerSubnet')],SecurityGroupIds:[ref('ProbeSecurity')]},LoggingConfig:{LogGroup:ref('ProbeLogs')},Environment:{Variables:{ALB_HOST:att('Alb','DNSName')}},Code:{ZipFile:readFileSync(new URL('./probe.py',import.meta.url),'utf8')},Tags:tags});
 const out={}; for(const id of ['Vpc','SubnetA','SubnetB','PeerVpc','PeerSubnet','ProbeSecurity','Workers','Targets','Alb','FileSystem','Peering','InstanceSecurity','InstanceRole'])out[id]={Value:ref(id)};
 out.AlbHost={Value:att('Alb','DNSName')};
 return {AWSTemplateFormatVersion:'2010-09-09',Description:'Disposable FreshRoute private compute/network/EFS/WAF experiment',Parameters:{ImageId:{Type:'AWS::EC2::Image::Id'},ScaleDownAt:{Type:'String'}},Resources:R,Outputs:out};
}
if (process.argv[1]?.endsWith('templates.mjs')) {
 mkdirSync('build/phase8',{recursive:true});
 for(const [name,template] of [['Operations',operationsTemplate()],['ComputeLab',computeTemplate()]]) writeFileSync(`build/phase8/FreshRoute${name}.template.json`,JSON.stringify(template));
}
