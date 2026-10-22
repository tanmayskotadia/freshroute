# Bedrock access follow-up

The optional Bedrock adapter uses Converse with APAC Nova Micro. Its inference is blocked by the AWS account; fallback behavior was tested. Phase 7 now uses a separately verified external AI transport; this document preserves the Bedrock-specific restriction and follow-up details.

Copy these verified details into an AWS Support case if you want live inference enabled:

```text
Account: 118462784511
Source region: ap-south-1
Inference profile: apac.amazon.nova-micro-v1:0
Foundation model: amazon.nova-micro-v1:0
Operation: bedrock-runtime Converse
Observed error: ValidationException: Operation not allowed
GetFoundationModelAvailability:
  authorizationStatus: NOT_AUTHORIZED
  agreementAvailability.status: AVAILABLE
  entitlementAvailability: AVAILABLE
  regionAvailability: AVAILABLE

Please investigate the account-level restriction preventing Bedrock inference.
The application is an academic produce logistics decision-support project.
It uses bounded text requests without autonomous actions.
```

AWS guidance: https://repost.aws/knowledge-center/bedrock-invokemodel-api-error . No support case, billing upgrade, third-party subscription or model agreement has been submitted automatically. Once access is restored, rerun `infrastructure/mcp/verify-phase7.py` through AWS MCP and verify a BEDROCK response, token usage and the successful-response cache. Do not mark live AI complete based on a fallback response.
