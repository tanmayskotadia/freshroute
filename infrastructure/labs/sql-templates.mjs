import {writeFileSync,mkdirSync} from 'node:fs';
const ref=n=>({Ref:n}), att=(n,a)=>({'Fn::GetAtt':[n,a]});
const res=(Type,Properties,extra={})=>({Type,Properties,...extra});
const tags=[{Key:'Project',Value:'FreshRoute'},{Key:'Phase',Value:'8'},{Key:'Lifecycle',Value:'disposable-lab'},{Key:'created_by',Value:'rds-oss-skill'},{Key:'generation_model',Value:'codex'}];
const secretPassword={'Fn::Join':['',['{{resolve:secretsmanager:',att('Database','MasterUserSecret.SecretArn'),':SecretString:password}}']]};
export function sqlTemplate(){
 const R={}; const add=(n,t,p,e)=>R[n]=res(t,p,e);
 add('PrivateRoutes','AWS::EC2::RouteTable',{VpcId:ref('VpcId'),Tags:tags});
 add('ReturnToPeer','AWS::EC2::Route',{RouteTableId:ref('PrivateRoutes'),DestinationCidrBlock:'10.81.0.0/16',VpcPeeringConnectionId:ref('PeeringId')});
 for(const [n,cidr,i] of [['A','10.80.11.0/24',0],['B','10.80.12.0/24',1]]){
   add('Private'+n,'AWS::EC2::Subnet',{VpcId:ref('VpcId'),CidrBlock:cidr,MapPublicIpOnLaunch:false,AvailabilityZone:{'Fn::Select':[i,{'Fn::GetAZs':''}]},Tags:tags});
   add('PrivateRoute'+n,'AWS::EC2::SubnetRouteTableAssociation',{SubnetId:ref('Private'+n),RouteTableId:ref('PrivateRoutes')});
 }
 add('DmsSecurity','AWS::EC2::SecurityGroup',{VpcId:ref('VpcId'),GroupDescription:'Disposable DMS outbound database traffic only',SecurityGroupEgress:[{IpProtocol:'tcp',FromPort:5432,ToPort:5432,CidrIp:'10.80.0.0/16'}],Tags:tags});
 add('DatabaseSecurity','AWS::EC2::SecurityGroup',{VpcId:ref('VpcId'),GroupDescription:'PostgreSQL from private lab clients and DMS only',SecurityGroupIngress:[{IpProtocol:'tcp',FromPort:5432,ToPort:5432,CidrIp:'10.81.1.0/24'},{IpProtocol:'tcp',FromPort:5432,ToPort:5432,SourceSecurityGroupId:ref('DmsSecurity')}],Tags:tags});
 add('SubnetGroup','AWS::RDS::DBSubnetGroup',{DBSubnetGroupDescription:'Isolated lab database subnets without an internet route',SubnetIds:[ref('PrivateA'),ref('PrivateB')],Tags:tags});
 add('Parameters','AWS::RDS::DBParameterGroup',{Family:'postgres18',Description:'Require TLS for fictional lab clients',Parameters:{'rds.force_ssl':'1'},Tags:tags});
 add('Database','AWS::RDS::DBInstance',{DBInstanceIdentifier:'freshroute-sql-lab',DBInstanceClass:'db.t3.micro',Engine:'postgres',EngineVersion:ref('EngineVersion'),AllocatedStorage:'20',StorageType:'gp3',StorageEncrypted:true,DBName:'freshroute_lab',MasterUsername:'freshroute_lab_owner',ManageMasterUserPassword:true,PubliclyAccessible:false,MultiAZ:false,BackupRetentionPeriod:0,DeletionProtection:false,DeleteAutomatedBackups:true,DBSubnetGroupName:ref('SubnetGroup'),DBParameterGroupName:ref('Parameters'),VPCSecurityGroups:[ref('DatabaseSecurity')],Tags:tags},{DeletionPolicy:'Delete',UpdateReplacePolicy:'Delete'});
 add('SqlLogs','AWS::Logs::LogGroup',{LogGroupName:'/freshroute/sql-lab',RetentionInDays:7});
 add('SqlRole','AWS::IAM::Role',{AssumeRolePolicyDocument:{Version:'2012-10-17',Statement:[{Effect:'Allow',Action:'sts:AssumeRole',Principal:{Service:'lambda.amazonaws.com'}}]},ManagedPolicyArns:[{'Fn::Sub':'arn:${AWS::Partition}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole'}],Tags:tags});
 add('SqlClient','AWS::Lambda::Function',{FunctionName:'FreshRouteSqlLab',Runtime:'nodejs24.x',Architectures:['arm64'],Handler:'sqlLab.handler',Role:att('SqlRole','Arn'),Timeout:45,MemorySize:128,VpcConfig:{SubnetIds:[ref('PeerSubnetId')],SecurityGroupIds:[ref('ProbeSecurityId')]},LoggingConfig:{LogGroup:ref('SqlLogs')},Environment:{Variables:{DB_HOST:att('Database','Endpoint.Address'),DB_PASSWORD:secretPassword}},Code:{S3Bucket:'freshroute-118462784511-ap-south-1-data',S3Key:'releases/phase8/sql-lab.zip',S3ObjectVersion:ref('ArtifactVersion')},Tags:tags});
 const Outputs={DbHost:{Value:att('Database','Endpoint.Address')},DbSecretArn:{Value:att('Database','MasterUserSecret.SecretArn')},DmsSecurityId:{Value:ref('DmsSecurity')},PrivateA:{Value:ref('PrivateA')},PrivateB:{Value:ref('PrivateB')}};
 return {AWSTemplateFormatVersion:'2010-09-09',Description:'Disposable private RDS fixture and TLS-verified SQL client; no production data',Parameters:{VpcId:{Type:'AWS::EC2::VPC::Id'},PeeringId:{Type:'String'},PeerSubnetId:{Type:'AWS::EC2::Subnet::Id'},ProbeSecurityId:{Type:'AWS::EC2::SecurityGroup::Id'},EngineVersion:{Type:'String'},ArtifactVersion:{Type:'String'}},Resources:R,Outputs};
}
export function dmsTemplate(){
 const R={};
 R.VpcRole=res('AWS::IAM::Role',{RoleName:'dms-vpc-role',AssumeRolePolicyDocument:{Version:'2012-10-17',Statement:[{Effect:'Allow',Action:'sts:AssumeRole',Principal:{Service:'dms.amazonaws.com'}}]},ManagedPolicyArns:[{'Fn::Sub':'arn:${AWS::Partition}:iam::aws:policy/service-role/AmazonDMSVPCManagementRole'}],Tags:tags},{Condition:'CreateVpcRole'});
 R.Subnets=res('AWS::DMS::ReplicationSubnetGroup',{ReplicationSubnetGroupDescription:'Private FreshRoute migration fixture',SubnetIds:[ref('PrivateA'),ref('PrivateB')],Tags:tags},{DependsOn:'VpcRole'});
 R.Replication=res('AWS::DMS::ReplicationInstance',{ReplicationInstanceIdentifier:'freshroute-migration-lab',ReplicationInstanceClass:'dms.t3.small',EngineVersion:'3.6.1',AllocatedStorage:50,MultiAZ:false,PubliclyAccessible:false,ReplicationSubnetGroupIdentifier:ref('Subnets'),VpcSecurityGroupIds:[ref('DmsSecurityId')],Tags:tags},{DependsOn:'VpcRole'});
 const password={'Fn::Join':['',['{{resolve:secretsmanager:',ref('DbSecretArn'),':SecretString:password}}']]};
 for(const [name,type] of [['Source','source'],['Target','target']])R[name]=res('AWS::DMS::Endpoint',{EndpointIdentifier:'freshroute-lab-'+type,EndpointType:type,EngineName:'postgres',ServerName:ref('DbHost'),Port:5432,DatabaseName:'freshroute_lab',Username:'freshroute_lab_owner',Password:password,SslMode:'require',Tags:tags});
 R.Task=res('AWS::DMS::ReplicationTask',{ReplicationTaskIdentifier:'freshroute-fixture-full-load',MigrationType:'full-load',ReplicationInstanceArn:ref('Replication'),SourceEndpointArn:ref('Source'),TargetEndpointArn:ref('Target'),TableMappings:JSON.stringify({rules:[{'rule-type':'selection','rule-id':'1','rule-name':'only-fictional-fixture','object-locator':{'schema-name':'legacy','table-name':'shipments'},'rule-action':'include'},{'rule-type':'transformation','rule-id':'2','rule-name':'modernize-schema','rule-target':'schema','object-locator':{'schema-name':'legacy'},'rule-action':'rename',value:'warehouse'}]}),ReplicationTaskSettings:JSON.stringify({FullLoadSettings:{TargetTablePrepMode:'DROP_AND_CREATE',MaxFullLoadSubTasks:1,CommitRate:1000},Logging:{EnableLogging:false}}),Tags:tags});
 const Parameters=Object.fromEntries(['PrivateA','PrivateB','DmsSecurityId','DbSecretArn','DbHost'].map(n=>[n,{Type:'String'}]));Parameters.CreateRole={Type:'String',Default:'true',AllowedValues:['true','false']};
 return {AWSTemplateFormatVersion:'2010-09-09',Description:'Disposable DMS full load of fictional legacy shipments into warehouse schema; no CDC',Parameters,Conditions:{CreateVpcRole:{'Fn::Equals':[ref('CreateRole'),'true']}},Resources:R,Outputs:{ReplicationArn:{Value:ref('Replication')},SourceArn:{Value:ref('Source')},TargetArn:{Value:ref('Target')},TaskArn:{Value:ref('Task')}}};
}
if(process.argv[1]?.endsWith('sql-templates.mjs')) {
 mkdirSync('build/phase8',{recursive:true});
 for(const [n,t] of [['SqlLab',sqlTemplate()],['MigrationLab',dmsTemplate()]])writeFileSync(`build/phase8/FreshRoute${n}.template.json`,JSON.stringify(t));
}
