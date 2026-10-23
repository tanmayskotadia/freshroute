// Run through the persistent Artifact Session tool. All slide content remains editable.
export async function buildDeck(artifactSession, nodeRepl) {
var fs = await import('node:fs/promises');
var root = 'C:/Users/SURESH D KOTADIA/Desktop/cs/projects/cad';
await fs.mkdir(root+'/tmp/phase-9/slides',{recursive:true});
await artifactSession.run(async ({presentation}) => {
  presentation.slides.keep([]);
  const ink='#193F32', muted='#5B6B60', cream='#F5F4EB', green='#416D52', orange='#B06138';
  const text=(s,str,x,y,w,h,size=25,color=ink,bold=false)=>{
    const a=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
    a.text=str;a.text.style={typeface:'Arial',fontSize:size,color,bold};return a;
  };
  const rect=(s,x,y,w,h,fill=green)=>s.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:h},fill,line:{fill:'none',width:0}});
  const box=(s,str,x,y,w=240,h=74)=>{rect(s,x,y,w,h,'#E3EADF');text(s,str,x+16,y+15,w-32,h-20,21,ink,true);};
  const arrow=(s,x,y,w=40)=>s.shapes.add({geometry:'rightArrow',position:{left:x,top:y,width:w,height:22},fill:green,line:{fill:'none',width:0}});
  const base=(n,kicker,title,note)=>{
    const s=presentation.slides.add();s.background.fill=cream;
    text(s,kicker.toUpperCase(),64,39,1100,26,14,green,true);
    text(s,title,64,93,1148,110,43,ink,true);
    rect(s,64,657,1152,1,'#CCD5C9');
    text(s,'FRESHROUTE  /  CLOUD ARCHITECTURE DESIGN',64,674,1040,22,12,muted);
    text(s,String(n).padStart(2,'0'),1162,672,54,24,14,muted,true);
    s.speakerNotes.text=note;return s;
  };
  let s=base(1,'BCSE355L · Phase 9','Good food. Better decisions.',
    '20 seconds. FreshRoute helps a dispatcher compare rescue options for delayed perishable shipments and preserve a reviewed decision. Fictional inputs; illustrative quality model. Source: docs/phase-9/REPORT_SOURCE.json, sections 1-2.');
  text(s,'A traceable path from a delayed shipment\nto an operator-approved rescue plan.',64,242,1000,120,34);
  text(s,'Observe',64,466,300,54,37,green,true);arrow(s,323,480,65);
  text(s,'Simulate',443,466,310,54,37,green,true);arrow(s,734,480,65);
  text(s,'Decide',866,466,310,54,37,green,true);
  text(s,'Academic prototype · Mumbai AWS deployment · 23 October 2026',64,588,1120,35,19,muted);

  s=base(2,'The practical problem','A delay creates several difficult choices.',
    '25 seconds. Explain the dispatcher problem, not just the service inventory. Route times, temperatures and costs are entered assumptions. No live GPS, traffic or sensor integration. Source: src/fixtures.ts; src/model/engine.ts.');
  ['Continue the route','Cool the shipment','Reroute to a receiver'].forEach((v,i)=>{
    text(s,'0'+(i+1),64+i*390,245,340,65,50,orange,true);
    text(s,v,64+i*390,336,340,85,29,ink,true);
  });
  text(s,'Compare quality, quantity at risk, cost, receiving hours and available capacity.',64,495,1100,90,31);

  s=base(3,'Reproducible seeded incident','500 kg of tomatoes. One entered delay.',
    '35 seconds. The unchanged FR-101 fixture is illustrative. Continuation has modeled quality 58.3/100 and 350 kg below threshold; it is infeasible. Eastside is the seeded winner. These are model outputs, not measured waste or commercial savings. Source: docs/phase-3/seeded-incident.json.');
  [['500 kg','Shipment quantity'],['3 hours','Entered delay'],['58.3 / 100','Continuation quality']].forEach(([a,b],i)=>{text(s,a,64+i*390,260,350,85,49,green,true);text(s,b,64+i*390,354,350,65,23,muted);});
  text(s,'The original seed ranks Eastside receiving centre first.',64,476,1130,55,30,ink,true);
  text(s,'Changed inputs can change the winner. The quality model is illustrative.',64,557,1130,54,23,muted);

  s=base(4,'Calculation before explanation','Check constraints. Then rank trade-offs.',
    '45 seconds. Q10=2 converts temperature history to equivalent hours at 10 C. Quality cohorts decay exponentially. Loss is cohort mass below threshold. Hard constraints precede scoring. Saved snapshots preserve model and source versions; edits require recalculation. Source: src/model/engine.ts; parameters.ts; tests/model.test.mjs.');
  const pipeline=['Entered history','Quality cohorts','Feasible options','Weighted ranking'];
  pipeline.forEach((v,i)=>{box(s,v,64+i*292,250,246,90);if(i<3)arrow(s,321+i*292,283,30);});
  text(s,'Reject first',64,416,450,45,29,orange,true);
  text(s,'Receiving hours · produce rules · capacity\nBudget · declared quality threshold',64,476,530,105,24);
  text(s,'Preserve the result',674,416,500,45,29,green,true);
  text(s,'Frozen inputs, model version and source signature\nremain available in the saved analysis.',674,476,535,105,24);

  s=base(5,'Retained AWS architecture','Managed services with clear responsibilities.',
    '55 seconds. Browser uses Cognito PKCE and an authenticated API. API Gateway HTTPS frontend plus Web Lambda reads private S3 because CloudFront account verification is blocked. Application uses four DynamoDB tables, Step Functions, queues, Streams, workers and private reports. Diagram is simplified; no EC2 in the production path. Source: infrastructure/app.ts; workflows.ts; fulfilment.ts; docs/phase-9/ARCHITECTURE.md.');
  box(s,'Browser + Cognito',64,235,245);arrow(s,321,262,38);box(s,'HTTP API + Lambda',374,235,270);arrow(s,657,262,38);box(s,'DynamoDB · 4 tables',710,235,355);
  box(s,'Step Functions',64,368,245);arrow(s,321,395,38);box(s,'Analysis Worker',374,368,270);arrow(s,657,395,38);box(s,'Frozen analysis',710,368,355);
  box(s,'Streams + SQS',64,501,245);arrow(s,321,528,38);box(s,'Background workers',374,501,270);arrow(s,657,528,38);box(s,'Private reports + SNS',710,501,355);
  text(s,'HTTPS frontend: API Gateway → Web Lambda → private S3. CloudFront is blocked.',64,605,1140,28,18,muted);

  s=base(6,'Storage with a purpose','Four buckets. Four access boundaries.',
    '30 seconds. Web, data, reports and audit separate access and retention responsibilities. All private/versioned/TLS-only; reports and audit use a customer-managed KMS key. Lifecycle settings do not prove an archive transition. Source: infrastructure/app.ts; docs/phase-8/operations-final-verification.json.');
  [['Web','Release assets'],['Data','Imports and fixtures'],['Reports','Owner-bound downloads'],['Audit','CloudTrail objects and digests']].forEach(([a,b],i)=>{
    const x=64+(i%2)*590,y=238+Math.floor(i/2)*176; text(s,a,x,y,530,52,34,green,true);text(s,b,x,y+64,530,65,26);
  });
  text(s,'Private · versioned · TLS required · scoped readers and writers',64,600,1150,34,21,muted);

  s=base(7,'AI with operator control','Explain the result. Review the draft.',
    '45 seconds. Current technical backend uses Groq openai/gpt-oss-20b; optional Bedrock adapter is not a successful Bedrock deployment claim. Neutral business UI says AI. Secret stays server-side. 800 tokens, nine-second deadline, one-hour cache; quotas 20 per owner and 200 global UTC uncached attempts/day. Grounded schema validation and fallback. AI IAM cannot reserve capacity. Source: infrastructure/copilot.ts; server/copilot.ts; docs/phase-7/; docs/phase-8/application-regression.json.');
  box(s,'Saved calculated facts',64,245,300,100);arrow(s,383,283,45);box(s,'Validated AI response',450,245,330,100);arrow(s,800,283,45);box(s,'Operator review',866,245,350,100);
  text(s,'Bounded requests',64,431,500,47,30,green,true);text(s,'Token limit · deadline · quotas · cache',64,492,530,85,25);
  text(s,'Safe failure path',674,431,510,47,30,green,true);text(s,'Deterministic fallback; no autonomous\nbooking or food-safety certification.',674,492,530,100,25);

  s=base(8,'From analysis to fulfilment','A reservation checks today’s capacity.',
    '45 seconds. Frozen analysis is not a reservation. Current revisions, whole-gram capacity and conditional transactions protect booking. Explicit terminal transitions release once. Queue workers produce private PDFs and notifications. Email receipt is not claimed. Source: server/commands.ts; server/fulfilment.ts; tests/reservations.test.mjs; docs/phase-8/application-regression.json.');
  ['Review the option','Check current versions','Reserve atomically','Generate private report'].forEach((v,i)=>{text(s,String(i+1),64,233+i*86,55,50,34,orange,true);text(s,v,145,233+i*86,1000,55,31);});
  text(s,'Duplicate requests and stale snapshots must not silently consume capacity twice.',64,601,1140,38,21,muted);

  s=base(9,'Measured engineering experiments','Prove behaviour, then remove the lab.',
    '45 seconds. Two healthy EC2 workers and internal ALB; same EFS checksum, distinct EBS scratch; peering and SSM without SSH; ASG replacement and controlled desired 1-to-2 scaling; WAF allowed 200/test 403; Config compliant/drift/remediation. Private RDS TLS and DMS full load: three exact rows, same instance schemas, no CDC/cutover. All five stacks deleted. Source: docs/phase-8/*-verification.json; scale-and-migration-completion.json; cleanup-verification.json.');
  const labs=[['Compute + network','EC2 replacement · controlled scaling\nEFS/EBS · peering · SSM'],['Security + recovery','WAF 200 / 403 · Config remediation\nIsolated DLQ and corrected replay'],['SQL + migration','Private PostgreSQL · verified TLS\nDMS full load: 3 exact rows']];
  labs.forEach(([a,b],i)=>{text(s,a,64+i*390,246,350,90,30,green,true);text(s,b,64+i*390,363,350,170,23);});
  text(s,'Five disposable stacks deleted. The retained application remains deployed.',64,584,1140,48,24,orange,true);

  s=base(10,'Syllabus and proof','All eight modules have an explicit treatment.',
    '25 seconds. 71 topic entries checked against supplied BCSE355L syllabus. Retained implementation, deleted labs and studies are distinct. Multi-AZ, read replicas, Aurora, Direct Connect, SWF, Shield and historical/physical migration topics remain studies. CloudFront blocked; Trusted Advisor restricted. Source: docs/phase-9/SYLLABUS_MATRIX.csv; original supplied syllabus PDF.');
  [['Retained product','IAM · S3 · DynamoDB · Streams\nSQS · SNS · Step Functions\nKMS · monitoring · audit · budgets'],['Verified / deleted labs','EC2 · ASG · ALB · EBS · EFS\nVPC peering · SSM · Config · WAF\nRDS · DMS · queue recovery'],['Studies and restrictions','Aurora · Multi-AZ · read replicas\nDirect Connect · SWF · Shield\nSMS / Snow family · CloudFront']].forEach(([a,b],i)=>{text(s,a,64+i*390,239,350,88,29,green,true);text(s,b,64+i*390,361,350,216,23);});
  text(s,'The matrix links each topic to its actual evidence and limits.',64,600,1140,33,21,muted);

  s=base(11,'Cost and honest boundaries','Keep the useful app. Remove idle experiments.',
    '25 seconds. USD 200 is a planning ceiling, not an enforced cap. Five thresholds 25/50/100/150/180 USD. Retained resources incur normal charges; account estimates/credits are dated and delayed. Browser visual QA and human rehearsal remain; email delivery and CloudFront unresolved. Source: docs/phase-8/cost-verification.json; account-review.json; cleanup-verification.json; docs/phase-9/RELEASE_STATUS.md.');
  text(s,'$200',64,239,500,110,76,green,true);text(s,'Total planning ceiling',64,369,520,55,27);
  text(s,'Budget alerts do not stop spending.',64,456,510,90,26,muted);
  text(s,'Known limits',674,247,500,55,34,orange,true);
  text(s,'Illustrative quality model\nCloudFront account verification\nEmail delivery unverified\nLive browser visual QA pending',674,341,530,231,26);

  s=base(12,'Demonstration and practical value','A decision another operator can inspect.',
    '25 seconds. Close with the sequence and practical contribution. Use the seven-minute in-app guide or the deck as separate presentation routes, not both inside seven minutes. Production requires calibrated models and real recipient/dispatch integration. No measured food savings or guaranteed grade. Source: docs/phase-9/DEMO_SCRIPT.md; REPORT_SOURCE.json. Total deck allocation: 420 seconds.');
  text(s,'Incident → comparison → frozen analysis\nAI explanation → capacity check → private report',64,247,1150,140,35,ink,true);
  text(s,'Reproducible calculation. Explicit approval. Recorded cloud evidence.',64,462,1140,100,29,green,true);
  text(s,'Local demo available offline after setup; cloud actions require sign-in.',64,593,1140,35,21,muted);
  nodeRepl.write({slides:presentation.slides.items.length});
},{artifactType:'presentation'});
}


