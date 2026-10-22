# CloudFront account verification blocker

AWS denied `AWS::CloudFront::Distribution` creation with HTTP 403: the account must be verified before adding new CloudFront resources. AWS instructed contacting Support and including the error. This is an account restriction, not an application/IAM policy failure. Request ID: 1d12b385-d17d-4390-8ee3-2fa534b78fd1.

The user approved an API Gateway + Lambda HTTPS frontend while resolving verification. The web bucket remains private; only the frontend Lambda role reads it. CloudFront/OAC code remains available behind the `cloudFront=enabled` CDK context flag, but must not be described as deployed.

The initial stack rolled back and retained four buckets, four tables and a KMS key. The failed stack metadata was removed and those nine resources imported into a new managed stack before adding the approved fallback. No buckets, table contents or encryption key were deleted. CloudFront resources created during the failed operation were rolled back.

Changing to CloudFront later changes the web origin: update Cognito callbacks, API CORS and generated config using a reviewed change set. Keep both callbacks during transition and verify sign-in before removing the fallback.
