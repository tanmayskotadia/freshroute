import { readFileSync, writeFileSync } from "node:fs";
for (const stack of ["FreshRouteFoundation", "FreshRouteApplication"]) {
  const template = JSON.parse(readFileSync(`cdk.out/${stack}.template.json`, "utf8"));
  // CDK path metadata is diagnostic only. Omit it to fit CloudFormation's inline body limit.
  for (const resource of Object.values(template.Resources)) delete resource.Metadata;
  const body = JSON.stringify(template);
  if (Buffer.byteLength(body) > 51200) throw Error("Use a private S3 TemplateURL for this template.");
  writeFileSync(`build/${stack}.template.json`, body);
}
