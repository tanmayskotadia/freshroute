import test from 'node:test';
import assert from 'node:assert/strict';
import {computeTemplate,operationsTemplate} from '../infrastructure/labs/templates.mjs';
import {sqlTemplate,dmsTemplate} from '../infrastructure/labs/sql-templates.mjs';
test('disposable lab exposes no SSH, internet database or public load balancer',()=>{
 const c=computeTemplate(),s=sqlTemplate();
 assert.equal(c.Resources.Alb.Properties.Scheme,'internal');
 for(const r of Object.values(c.Resources).filter(x=>x.Type==='AWS::EC2::SecurityGroup')) for(const rule of r.Properties.SecurityGroupIngress||[]) assert.notEqual(rule.FromPort,22);
 assert.equal(c.Resources.Launch.Properties.LaunchTemplateData.MetadataOptions.HttpTokens,'required');
 assert.ok(c.Resources.Launch.Properties.LaunchTemplateData.BlockDeviceMappings.every(x=>x.Ebs.Encrypted&&x.Ebs.DeleteOnTermination));
 assert.equal(s.Resources.Database.Properties.PubliclyAccessible,false);
 assert.equal(s.Resources.Database.Properties.StorageEncrypted,true);
 assert.equal(s.Resources.Database.Properties.ManageMasterUserPassword,true);
 assert.equal(s.Resources.Database.Properties.MasterUserPassword,undefined);
 assert.ok(!JSON.stringify(s.Resources.PrivateRoutes).includes('0.0.0.0/0'));
});
test('cost guards bound capacity and migration to fictional full-load rows',()=>{
 const c=computeTemplate(),d=dmsTemplate(),o=operationsTemplate();
 assert.equal(c.Resources.Workers.Properties.MaxSize,'2');
 assert.equal(c.Resources.ScaleToZero.Properties.DesiredCapacity,0);
 assert.equal(d.Resources.Task.Properties.MigrationType,'full-load');
 const rules=JSON.parse(d.Resources.Task.Properties.TableMappings).rules;
 assert.equal(rules[0]['object-locator']['schema-name'],'legacy');
 assert.equal(rules[0]['object-locator']['table-name'],'shipments');
 assert.equal(o.Resources.Budget.Properties.Budget.CostTypes.IncludeCredit,false);
 assert.ok(Object.values(o.Resources).filter(x=>x.Type==='AWS::CloudWatch::Alarm').every(x=>x.Properties.TreatMissingData==='notBreaching'));
});
