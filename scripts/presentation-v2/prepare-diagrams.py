"""Render authored Mermaid diagrams and retain their layout for editable slides."""
import json
from pathlib import Path

root=Path(__file__).resolve().parents[2]
source=root/'docs/presentation-v2/mermaid';out=root/'tmp/presentation-v2/diagrams'
source.mkdir(parents=True,exist_ok=True);out.mkdir(parents=True,exist_ok=True)
graphs={
'01-cover':'''flowchart TB
 A["Delayed shipment"] --> B{"Feasible response?"}
 B --> C["Continue"]
 B --> D["Cool"]
 B --> E["Reroute"]
 class A input
 class B,E accent
''',
'02-problem':'''flowchart LR
 A["Entered delay<br/>Temperature exposure"] --> B["Quality at arrival<br/>becomes uncertain"]
 B --> C{"Choose a response"}
 C --> D["Cheap or nearby<br/>may fail constraints"]
 D --> E["Late rejection<br/>and quantity at risk"]
 F["Missing link"] --> G["One reproducible<br/>comparison"]
 G --> H["Current capacity<br/>and recorded approval"]
 class A,B input
 class D,E risk
 class F,G,H accent
''',
'03-solution':'''flowchart LR
 A["OBSERVE<br/>Shipment"] --> B["SIMULATE<br/>Rescue Lab"]
 B --> C["SAVE<br/>Snapshot"]
 C --> D["REVIEW<br/>Decision Studio"]
 D --> E["RESERVE<br/>Capacity hold"]
 E --> F["VERIFY<br/>Fulfilment"]
 class A input
 class B,C,D accent
 class E,F result
''',
'04-architecture':'''flowchart LR
 A["React interface<br/>Cognito sign-in"] --> B["API Gateway<br/>Workspace Lambda"]
 B --> C["DynamoDB<br/>4 tables"]
 B --> D["Step Functions<br/>Analysis Worker"]
 D --> C
 B --> E["SQS imports<br/>Import Worker"]
 E --> F["Private S3<br/>4 buckets"]
 C --> G["Streams and SQS<br/>Report workers"]
 G --> F
 G --> H["SNS and app inbox<br/>Decision updates"]
 class A input
 class B,D,E,G accent
 class C,F,H result
''',
'05-model':'''flowchart LR
 A["Entered shipment<br/>and temperatures"] --> B["Q10 exposure<br/>Quality cohorts"]
 B --> C{"Hard constraints"}
 C -->|"Pass"| D["Rank loss, cost<br/>and time"]
 C -->|"Fail"| E["Reject with<br/>a reason"]
 D --> F["Freeze inputs<br/>and results"]
 class A input
 class B,C,D,F accent
 class E risk
''',
'05b-example':'''flowchart LR
 G["Original FR-101 seed<br/>500 kg tomatoes"] --> H["Continue: 58.3 quality<br/>350 kg below threshold"]
 G --> I["Eastside: 74.0 quality<br/>0 kg below threshold"]
 class G input
 class H risk
 class I result
''',
'06-reservation':'''flowchart LR
 A["Review<br/>saved analysis"] --> B{"Versions and<br/>capacity current?"}
 B -->|"Yes"| C["DynamoDB transaction<br/>Capacity held"]
 B -->|"No"| X["Recalculate<br/>or reject"]
 C --> D["Streams to SQS<br/>Post-decision worker"]
 D --> E["Private PDF<br/>App inbox and SNS"]
 C --> F["Dispatch<br/>Record delivery"]
 F --> G["Release capacity<br/>once"]
 C -->|"Cancel before dispatch"| G
 class A input
 class B,C,D accent
 class X risk
 class E,F,G result
''',
'07-ai':'''flowchart LR
 A["Saved calculation<br/>Verified facts"] --> B["Copilot Lambda<br/>AI explanation"]
 B --> C{"Valid structured<br/>facts and fields?"}
 C -->|"Yes"| D["Review draft<br/>Recalculate and approve"]
 C -->|"No or timeout"| E["Fallback<br/>Calculation stays valid"]
 class A input
 class B,C accent
 class D result
 class E risk
''',
'08-proof':'''flowchart TB
 A["Cloud evidence"] --> B["RETAINED APP"]
 A --> C["VERIFIED LABS<br/>Deleted after testing"]
 A --> D["STUDY TOPICS"]
 B --> E["Serverless and storage<br/>Security and audit"]
 C --> F["EC2, EBS and EFS<br/>Peering, WAF and Config"]
 C --> G["Private RDS and DMS<br/>Full load of 3 exact rows"]
 D --> H["Aurora, Multi-AZ, SWF<br/>Direct Connect, Snow"]
 class A accent
 class B,E result
 class C,F,G input
 class D,H risk
'''
}
style='''
classDef default fill:#172420,stroke:#3D5950,stroke-width:1.5px,color:#F0F4E9;
classDef input fill:#23352F,stroke:#82998A,color:#F0F4E9;
classDef accent fill:#D9ED70,stroke:#D9ED70,color:#112019;
classDef result fill:#245345,stroke:#74D2AF,color:#F1FFF8;
classDef risk fill:#4C302A,stroke:#DD9F85,color:#FFE8DE;
'''
config={'theme':'base','themeVariables':{'fontFamily':'Arial','fontSize':'28px','lineColor':'#91AC9B','primaryTextColor':'#F0F4E9','edgeLabelBackground':'#111B17'},'flowchart':{'htmlLabels':False,'curve':'linear','nodeSpacing':36,'rankSpacing':60,'padding':20,'wrappingWidth':400},'securityLevel':'strict'}
for name,code in graphs.items():
    complete='%%{init: '+json.dumps(config,separators=(',',':'))+'}%%\n'+code+style
    (source/(name+'.mmd')).write_text(complete,encoding='utf-8')

if __name__=='__main__':
    print('Saved eight Mermaid sources. Render locally with render-diagrams.mjs.')
