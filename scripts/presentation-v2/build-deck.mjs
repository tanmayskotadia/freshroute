import fs from 'node:fs/promises';
const root='C:/Users/SURESH D KOTADIA/Desktop/cs/projects/cad';
const c={bg:'#111B17',lime:'#D9ED70',white:'#F0F4E9',muted:'#A6BCAF',teal:'#74D2AF',edge:'#91AC9B'};
const hex=v=>v.startsWith('rgb')?'#'+v.match(/\d+/g).slice(0,3).map(n=>(+n).toString(16).padStart(2,'0')).join(''):v;
export async function buildDeck(p,{coverOnly=false}={}) {
  const layouts=JSON.parse(await fs.readFile(root+'/tmp/presentation-v2/layouts.json','utf8'));
  p.slides.keep([]);
  const text=(s,value,x,y,w,h,size=28,color=c.white,bold=false,align='left')=>{
    const sh=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
    sh.text=value;sh.text.style={typeface:'Arial',fontSize:size,color,bold,alignment:align,verticalAlignment:'top',insets:0,autoFit:'none'};return sh;
  };
  const base=(n,title,subtitle,notes)=>{
    const s=p.slides.add({width:1600,height:900});s.background.fill=c.bg;
    text(s,'FRESHROUTE   /   CLOUD ARCHITECTURE DESIGN',72,44,1400,28,17,c.lime,true);
    text(s,title,72,102,1456,86,56,c.white,true);
    if(subtitle)text(s,subtitle,72,198,1456,74,29,c.muted);
    text(s,'BCSE355L   /   Academic prototype',72,846,1300,25,17,c.muted);
    text(s,String(n).padStart(2,'0')+' / 08',1414,842,114,30,18,c.muted,false,'right');
    s.speakerNotes.text=notes;return s;
  };
  const diagram=(s,key,frame)=>{
    const d=layouts[key], k=Math.min(frame.w/d.width,frame.h/d.height);
    const ox=frame.x+(frame.w-d.width*k)/2-d.minX*k,oy=frame.y+(frame.h-d.height*k)/2-d.minY*k;
    const pt=q=>({x:ox+q.x*k-frame.x,y:oy+q.y*k-frame.y});
    const custom=(points,fill,line,name)=>s.shapes.add({geometry:'custom',name,position:{left:frame.x,top:frame.y,width:frame.w,height:frame.h},fill,line,customPaths:[{width:frame.w,height:frame.h,commands:points.map((q,i)=>i?{lineTo:q}:{moveTo:q}).concat(fill==='none'?[]:[{close:{}}])}]});
    for(const [i,e] of d.edges.entries()) {
      const points=e.points.map(pt);
      custom(points,'none',{fill:c.edge,width:2.2,style:'solid'},key+' / edge '+i);
      const q=points.at(-1),prev=points.at(-2),angle=Math.atan2(q.y-prev.y,q.x-prev.x),len=9;
      const tip={x:q.x+4*Math.cos(angle),y:q.y+4*Math.sin(angle)};
      custom([tip,{x:q.x-len*Math.cos(angle)+4*Math.sin(angle),y:q.y-len*Math.sin(angle)-4*Math.cos(angle)},{x:q.x-len*Math.cos(angle)-4*Math.sin(angle),y:q.y-len*Math.sin(angle)+4*Math.cos(angle)}],c.edge,{fill:'none',width:0},key+' / arrow '+i);
    }
    for(const n of d.nodes) {
      const x=ox+n.x*k,y=oy+n.y*k,w=n.w*k,h=n.h*k;
      const sh=s.shapes.add({geometry:n.geometry,name:key+' / '+n.id,position:{left:x,top:y,width:w,height:h},fill:hex(n.fill),line:{fill:hex(n.stroke),width:1.5,style:'solid'},borderRadius:n.geometry==='roundRect'?8:undefined});
      if(n.geometry==='diamond') {
        const label=text(s,n.label,x+w*.13,y+h*.3,w*.74,h*.4,Math.max(22,28*k),n.color,true,'center');label.text.verticalAlignment='middle';
      } else {
        sh.text=n.label;sh.text.style={typeface:'Arial',fontSize:Math.max(22,28*k),color:n.color,bold:true,alignment:'center',verticalAlignment:'middle',insets:{left:9,right:9,top:7,bottom:7},autoFit:'none'};
      }
    }
    for(const label of d.edgeLabels) {
      if(!label.label)continue;
      const x=ox+label.x*k,y=oy+label.y*k,w=Math.max(35,label.w*k),h=Math.max(25,label.h*k);
      const sh=s.shapes.add({geometry:'rect',position:{left:x-5,top:y-2,width:w+10,height:h+4},fill:c.bg,line:{fill:'none',width:0}});
      sh.text=label.label;sh.text.style={typeface:'Arial',fontSize:Math.max(18,25*k),color:c.muted,alignment:'center',verticalAlignment:'middle',insets:0};
    }
    return {scale:k,font:Math.max(22,28*k)};
  };
  let s=base(1,'','',`OPENING, ABOUT 35 SECONDS
FreshRoute is a cloud application that helps a dispatcher decide what to do when a perishable shipment is delayed. The operator enters the incident, compares feasible responses, reviews the evidence and reserves receiving capacity. We then record fulfilment and preserve a private decision report.
Say: “Our project connects a quality calculation to an actual receiving-capacity decision. Tracking a delayed truck alone does not tell a dispatcher whether continuing, cooling or rerouting is feasible.”
Introduce the team exactly as shown.
The application is an academic prototype. Its shipment records are fictional and its quality model illustrates a decision process. It does not certify food safety or prove measured food-waste savings.
Sources: docs/faculty-guide/CONTENT.json, introduction and project scope. src/model/engine.ts. Team names supplied by the project team.`);
  // Cover uses the same original Midnight Circuit theme as the following slides.
  text(s,'FreshRoute',72,200,860,135,108,c.lime,true);
  text(s,'Cloud platform for\nperishable shipment rescue',76,363,790,132,43,c.white,true);
  text(s,'M R Krishni - 24BCE',76,600,830,43,28,c.white);
  text(s,'Pratyush Purwar - 24BCE5254',76,654,830,43,28,c.white);
  text(s,'Tanmay Suresh Kotadia - 24BCE5281',76,708,850,43,28,c.white);
  text(s,'Continue, cool\nor reroute?',968,288,560,162,60,c.teal,true);
  text(s,'One workspace to compare options\nand commit receiving capacity.',972,500,556,103,28,c.muted);
  if(coverOnly)return p;

  s=base(2,'The problem and the missing link','A delayed shipment creates a decision that tracking alone cannot resolve.',`PROBLEM, ABOUT 60 SECONDS
Explain the operational problem first. Delay and temperature exposure change the modeled quality at arrival. A response chosen only because it is cheap or nearby can violate receiving hours, produce rules, a quality threshold or capacity. That can create late rejection and leave quantity at risk.
The decision gap FreshRoute addresses is a reproducible comparison connected to current capacity and an explicit recorded approval. The application combines these steps in one workflow. We do not claim that all commercial logistics systems lack these capabilities.
Real-life users could include a produce distributor, a market receiving centre, a cooperative, or a cold-chain dispatcher. They need to evaluate feasible alternatives before they commit the shipment to a destination.
Say: “The useful output is a reviewed plan that a receiver can accept. We preserve the assumptions and check capacity at approval, so another dispatcher cannot silently consume the same receiving space.”
The route duration, incident delay and temperature history are entered assumptions. This project does not include live GPS, live traffic or physical sensor ingestion. Explain that a future sensor integration could replace these inputs without changing the approval principle.
Source: src/model/engine.ts, source constraints and ranking. docs/faculty-guide/CONTENT.json, problem statement and product limits.`);
  text(s,'A delay puts fresh\nproduce at risk.',72,315,720,132,49,c.lime,true);
  text(s,'Dispatchers must choose whether to continue,\ncool or reroute while quality keeps changing.',72,477,720,112,29,c.white);
  text(s,'The missing decision layer',875,320,653,58,35,c.teal,true);
  text(s,'Tracking shows the delay.\nIt does not establish a feasible receiving plan.',875,395,653,110,29,c.white);
  text(s,'Price and distance alone cannot confirm\nquality, receiving hours or available capacity.',875,520,653,110,29,c.white);
  text(s,'Who needs it',72,658,720,43,25,c.muted,true);
  text(s,'Produce distributors, cooperatives and\ncold-chain dispatchers.',72,710,720,92,30,c.white);
  text(s,'FreshRoute’s contribution',875,658,653,43,25,c.muted,true);
  text(s,'A reproducible comparison linked to\ncurrent capacity and recorded approval.',875,710,653,92,30,c.white);

  s=base(3,'Our solution and key features','A dispatcher workspace connects reviewed analysis to an operational plan.',`SOLUTION AND WEBSITE FLOW, ABOUT 90 SECONDS
Introduce the solution using the feature groups on this slide, then explain the website sequence. Observe: open Overview, select Shipments and inspect FR-101. Explain its produce, quantity, entered delay, route assumptions and quality threshold.
Simulate: open Rescue Lab and compare continuing, cooling and rerouting. Change one input only if you want to demonstrate sensitivity. Use “Run cloud analysis” for a cloud execution. A local “Save analysis” action is a different persistence path, so do not describe every saved item as a Step Functions run.
Save: show the workflow hub and saved-analysis history. A saved analysis freezes its inputs, calculated outputs, model version and source signature. It is evidence for a decision. It does not hold receiving capacity.
Review: open Decision Studio. Explain the ranked options, constraint rejection reasons, cost and modeled quantity below threshold. Demonstrate sensitivity, split planning or the AI explanation if appropriate. A scenario draft requires review and a new calculation.
Reserve: open “Review cloud plan” and select “Reserve receiving capacity.” The cloud checks current source versions and capacity. If the data is stale, recalculate. The reservation commits the operational choice.
Verify: open Fulfilment, inspect the owner-bound report, mark the shipment dispatched and record delivery. Show the outcome record and analytics. To cancel a demonstration reservation, cancel before dispatch through the application rather than altering database records.
Say: “Saving the calculation preserves what we considered. Reserving capacity commits what we will do. Those are deliberately separate actions.”
Use an original seeded shipment or label changed inputs clearly. Do not claim that the live demonstration has already occurred because the deck includes this script.
Sources: docs/faculty-guide/CONTENT.json, website walkthrough. src/pages and application routing. docs/phase-8/application-regression.json.`);
  text(s,'Compare before\nyou commit.',72,315,690,132,53,c.lime,true);
  text(s,'FreshRoute connects shipment analysis,\nreceiving capacity and fulfilment records\nin one cloud application.',72,489,690,142,29,c.white);
  text(s,'Saved analysis preserves evidence.\nReservation commits capacity.',72,706,690,90,27,c.muted);
  text(s,'01   Evaluate rescue options',857,315,671,49,33,c.teal,true);
  text(s,'Compare quality, cost and time. Explain\nrejections and test changed assumptions.',857,377,671,88,28,c.white);
  text(s,'02   Review with evidence',857,486,671,49,33,c.teal,true);
  text(s,'Keep versioned snapshots, inspect split plans\nand use AI to explain calculated results.',857,548,671,88,28,c.white);
  text(s,'03   Commit and follow through',857,657,671,49,33,c.teal,true);
  text(s,'Reserve capacity, record delivery and retain\nprivate PDFs, notifications and outcomes.',857,719,671,88,28,c.white);

  s=base(4,'AWS architecture','Managed services support identity, calculation and background work.',`CLOUD ARCHITECTURE, ABOUT 2 MINUTES
This is a simplified application diagram. Begin at the React interface. Amazon Cognito supplies user sign-in with authorization-code PKCE. API Gateway receives authenticated HTTP requests, and the Workspace API Lambda applies ownership and business rules. Identity authenticates the person; application checks authorize access to their records.
AWS Lambda runs code on demand. It is suitable for these short request handlers and background jobs without keeping an EC2 web server running. The deployed application has eight functions with separate responsibilities: Web, Workspace API, Verification, Import Worker, Analysis Worker, Outbox Bridge, Post Decision Worker and Copilot.
Amazon DynamoDB stores four logical datasets in four tables: Shipments, Runs, Destinations and Activity. Saved runs preserve calculation evidence. Destinations hold shared network receiving capacity. Activity includes jobs, notifications, AI cache and quota records. Conditional writes and transactions protect state transitions. The destination capacity is shared intentionally, while user records and reads require ownership checks.
AWS Step Functions Standard orchestrates cloud analysis. Its actual workflow validates input, calculates and persists through the Analysis Worker, and records failures through a catch path. Retries handle eligible transient errors. The website stages on slide 3 span several user actions. The analysis worker persists its result to DynamoDB as shown here.
Amazon SQS decouples imports and post-decision work. A queue buffers jobs when workers are busy. Separate dead-letter queues preserve repeatedly failing messages for inspection. DynamoDB Streams makes committed Activity outbox items available to the Outbox Bridge, which places jobs on SQS. The Post Decision Worker writes a private report and app notification and publishes to SNS. Consumers handle duplicates idempotently.
Amazon S3 provides four private, versioned, TLS-only buckets: web for release assets, data for imports and fixtures, reports for private PDFs, audit for CloudTrail records. A report download uses an owner check and a short-lived signed link. Four buckets express different permissions and retention purposes rather than adding services for decoration.
Amazon SNS provides the email notification integration. The latest retained evidence still showed its email subscription PendingConfirmation. App inbox delivery is implemented; do not claim a verified email receipt without a fresh successful delivery.
AWS IAM limits each worker to required actions. AWS KMS protects reports and audit with a customer-managed key. Secrets Manager stores the AI API key for server-side access. CloudWatch provides logs, metrics and alarms. CloudTrail records supported account API activity in the audit bucket. Infrastructure uses AWS CDK and CloudFormation. Budgets provides delayed spending alerts rather than a hard spending cap.
Frontend hosting uses a separate API Gateway HTTPS route, Web Lambda and private S3. CloudFront creation was blocked by account verification, so CloudFront is not a deployed frontend dependency. All deployment context is Mumbai, ap-south-1.
Sources: infrastructure/app.ts; infrastructure/workflows.ts; infrastructure/fulfilment.ts; infrastructure/copilot.ts; docs/phase-8/operations-final-verification.json; docs/phase-10/CLOUD_CHECKS.json; docs/faculty-guide/CONTENT.json.`);
  diagram(s,'04-architecture',{x:72,y:279,w:1456,h:402});
  text(s,'4 private S3 buckets: web, data, reports and audit',72,710,1456,42,29,c.lime,true);
  text(s,'IAM scopes access. KMS protects data. CloudWatch and CloudTrail retain evidence.',72,765,1456,42,25,c.muted);

  s=base(5,'The decision model','Hard constraints come before the ranking of quality, cost and time.',`MODEL AND WORKED EXAMPLE, ABOUT 90 SECONDS
The main diagram explains the deterministic calculation. Entered temperature history is converted to equivalent exposure using an illustrative Q10 approach. With Q10 = 2, increasing temperature by 10 degrees C doubles the modeled deterioration rate. Quality cohorts represent parts of the shipment with different starting conditions. The engine computes quality decay and sums cohort mass below the declared threshold.
Hard constraints include destination produce rules, receiving hours, remaining receiving capacity, the declared quality limit and budget constraints where applicable. An option that fails a hard constraint receives a reason and cannot win just because it has a low weighted score. Feasible options are ranked by the configured trade-offs. The result preserves input and model versions.
The lower diagram uses the unchanged original FR-101 seed: 500 kg of tomatoes and an entered three-hour delay. Continuing produces modeled quality about 58.3 and 350 kg below threshold. Eastside produces modeled quality 74.0 with 0 kg below threshold and a modeled extra cost of Rs 450. The original seed ranks Eastside first among feasible options. Changed parameters can change the winner.
Say: “The numerical result comes from our calculation, not from the language model. Here the model predicts a different quantity below threshold, but we do not call this measured food saved.”
This is an academic decision model, not a validated food-safety or shelf-life certification. Its outputs require real calibration and operational validation before commercial use.
Sources: src/model/engine.ts; src/model/parameters.ts; tests/model.test.mjs; docs/phase-3/seeded-incident.json; docs/faculty-guide/CONTENT.json.`);
  diagram(s,'05-model',{x:72,y:278,w:1456,h:275});
  diagram(s,'05b-example',{x:72,y:568,w:940,h:237});
  text(s,'Original seeded example',1054,592,474,51,30,c.lime,true);
  text(s,'Illustrative quality model.\nThese outputs do not establish\nmeasured waste reduction\nor food safety.',1054,657,474,130,25,c.muted);

  s=base(6,'Reservation and fulfilment','Approval checks the latest source versions and receiving capacity.',`TRANSACTIONS AND RELIABILITY, ABOUT 90 SECONDS
Begin with the saved analysis. The operator asks to reserve a receiving plan. The API checks ownership, source versions and the current availability of the destination. A DynamoDB transaction conditionally updates the relevant records and capacity together. Competing operators cannot both claim the same remaining capacity when the conditional transaction protects it. A stale or infeasible request is rejected and requires recalculation.
Quantities use whole grams and monetary amounts use integer paise to avoid careless floating-point accounting in the transaction. Idempotency protects a retried request from applying the same reservation twice.
The transaction also records an outbox item. DynamoDB Streams and an Outbox Bridge deliver background jobs to SQS. The post-decision worker generates the private PDF, updates the app inbox and invokes SNS publishing. Work can retry independently of the original browser request. The queues use dead-letter destinations for repeated failures. A background report failure does not undo a capacity hold that has already committed.
The state lifecycle is confirmed, dispatched, delivered. A confirmed plan may instead be cancelled before dispatch. Delivery or valid cancellation releases capacity exactly once. A repeated terminal action cannot release capacity twice. SNS email delivery depends on a confirmed subscription and is distinct from a successful publish request.
Say: “The approved decision and capacity change commit together. The document and notifications follow asynchronously, so the user does not have to keep the browser request open.”
Source: infrastructure/fulfilment.ts; application reservation and fulfilment handlers; docs/phase-8/application-regression.json; docs/faculty-guide/CONTENT.json.`);
  diagram(s,'06-reservation',{x:72,y:282,w:1456,h:443});
  text(s,'A transaction protects the hold. Terminal actions release it exactly once.',72,772,1456,46,29,c.lime,true);

  s=base(7,'AI explanation with operator control','The saved calculation remains the source of numerical truth.',`AI INTEGRATION, ABOUT 75 SECONDS
The AI Copilot explains a saved analysis and can suggest a structured scenario draft. The server supplies authoritative facts from the saved calculation. It validates returned fields and checks that numerical claims agree with the known result. A failure, timeout or invalid response selects a deterministic fallback. A model outage therefore does not prevent the ordinary calculation workflow.
A draft changes proposed assumptions only after the operator reviews it. It must go through a new calculation and a separate approval. The Copilot execution role cannot directly reserve receiving capacity. The diagram's final approval step represents a later operator action, not a tool the model can call.
Secrets Manager holds the API credential. The browser never receives that credential. Runtime IAM grants the server only the secret access it requires. Avoid opening or displaying the secret value during the presentation.
The implementation bounds model output to 800 tokens and uses an approximately nine-second request deadline. It caches for one hour and tracks uncached daily attempts: 20 per owner and 200 globally per UTC day. These are implementation safeguards, not a guarantee of zero cost.
The feature uses a server-side adapter to the configured external LLM API. Explain the deployed provider accurately if faculty asks. Optional adapters do not establish that another cloud service has actually handled a request.
Say: “The AI makes a computed result easier to understand. The operator remains responsible for changing assumptions and approving a receiving plan.”
Sources: infrastructure/copilot.ts; Copilot server implementation; docs/faculty-guide/CONTENT.json, AI controls and limitations.`);
  diagram(s,'07-ai',{x:72,y:288,w:1456,h:330});
  text(s,'Secrets stay on the server',72,680,700,47,33,c.lime,true);
  text(s,'Secrets Manager and scoped IAM access',72,741,700,58,25,c.muted);
  text(s,'Bounded requests and fallback',858,680,670,47,33,c.teal,true);
  text(s,'Deadline, cache and daily attempt limits',858,741,670,58,25,c.muted);

  s=base(8,'Cloud depth with evidence','The implementation separates retained services, tested labs and study topics.',`CLOSING AND SYLLABUS COVERAGE, ABOUT 90 SECONDS
The diagram distinguishes what is running for the application from what was tested temporarily and from topics studied without claiming a deployment.
RETAINED APPLICATION: API Gateway, Lambda, Cognito, DynamoDB, S3, Step Functions, SQS, SNS, IAM, KMS, Secrets Manager, CloudWatch, CloudTrail and Budgets. AWS CDK and CloudFormation define repeatable infrastructure. DynamoDB Streams connects committed changes to background work. This demonstrates managed compute, identity, object and key-value storage, asynchronous communication, workflow orchestration, security, audit and operations.
VERIFIED AND DELETED LABS: isolated EC2 Auto Scaling workers behind an internal Application Load Balancer, distinct EBS scratch storage and shared EFS checksums, VPC peering, SSM commands with denied SSH, instance replacement and a controlled scale from one to two instances. A WAF test returned ordinary 200 responses and blocked test requests with 403 on the lab ALB. WAF is not protecting the main application HTTP API. AWS Config showed compliant state, a controlled drift and remediation. Reliability tests included an isolated poison message and DLQ replay.
The relational lab used private RDS PostgreSQL and verified a TLS SQL connection. AWS DMS performed a full load of three exact rows between two schemas in that same RDS instance. This establishes a small verified full-load exercise. It does not establish continuous CDC, an on-premises migration or a production cutover. All five temporary lab stacks were deleted after verification to reduce running costs. The foundation, application and operations stacks remained.
STUDY OR RESTRICTION: Aurora, RDS Multi-AZ and read replicas, SWF, Direct Connect, Shield, SMS and the Snow family belong to the study or comparison scope. CloudFront remains blocked by account verification. Trusted Advisor support API access was restricted. No slide claims that every syllabus service is continuously deployed.
Evidence includes 49 application tests and 19 cloud business regressions recorded in Phase 8. These are dated results rather than a claim that tests have just run during this talk. The 23 October Phase 10 snapshot showed 14 alarms, with 13 OK and one alarm for three preserved import-DLQ messages. The SNS rescue email subscription still appeared pending in retained evidence. USD 200 is the project planning budget, not a Free Tier guarantee or a hard AWS cap. Budget alerts can be delayed.
Close by demonstrating one meaningful path: inspect FR-101, run cloud analysis, review a feasible receiving plan, reserve capacity, then show fulfilment and the private PDF. End on why the architecture matters: reproducible comparison and a capacity-backed operational record.
Sources: docs/phase-8/compute-verification.json; replacement-verification.json; config-verification.json; migration-verification.json; scale-and-migration-completion.json; cleanup-verification.json; application-regression.json; docs/phase-10/CLOUD_CHECKS.json; OPERATIONS_CHECKS.json; docs/faculty-guide/CONTENT.json.`);
  diagram(s,'08-proof',{x:72,y:283,w:1456,h:416});
  text(s,'49 application tests. 19 dated cloud regression checks.',72,735,1456,45,30,c.lime,true);
  text(s,'Demo sequence: FR-101, analysis, review, reservation and fulfilment.',72,788,1456,36,24,c.muted);
  return p;
}
