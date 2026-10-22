# Phase 6 release status - 22 October 2026

## Implemented and deployed

- Fulfilment board, shared receiving capacity, stage filters and notification inbox.
- Atomic reservation, shipment lock, dispatch, delivery, cancellation and guarded capacity release.
- Transactional outbox -> DynamoDB Streams -> Lambda bridge -> SQS -> report/notification Lambda.
- Private versioned PDF and JSON reports in the KMS-encrypted reports bucket.
- Owner-authorized 120-second report links, persistent in-app read status and recipient-filtered SNS email subscription.
- Phase 5 import/analysis infrastructure deployed as a prerequisite.

Deployment account: `118462784511`, region: `ap-south-1`.
Website: https://dr4sw5bpoi.execute-api.ap-south-1.amazonaws.com

Both CloudFormation stacks reached UPDATE_COMPLETE. The final application release pins `releases/phase6/api.zip` version `89c4q3FrsRh_6vfnwxtwT403J6B9mA4o`. Frontend upload receipts report 17 successful asset uploads followed by 2 successful entry/config uploads. The deployed public config declares Phase 6.

## Verified evidence

The initial deployed Phase 6 build passed all 21 HTTP checks in `verification.json`. After reconnecting the original AWS account, the final artifact passed all 21 Phase 6 checks and all 10 CSV-import checks in `final-verification.json`. Actual Step Functions executions succeeded. Five committed outbox events generated reports/inbox messages and SNS publish message IDs. Both verification runs removed their temporary users, owned records and private object versions. A subsequent check found zero temporary test users and zero reserved kg at the test destination.

The PDF report layout was rendered and visually inspected. The latest local source passes all 41 automated tests, the production frontend build, and server/infrastructure TypeScript checks. Infrastructure strict synthesis also passed before deployment.

## Connection and remaining manual checks

1. The interrupted regression attempt has been superseded by the successful final regression and cleanup verification. The connector is now confirmed through STS to use deployment account `118462784511`.
2. A temporary connection to account `875691018816` was detected and rejected. No resources were created or changed in that account. The verification script rejects the wrong account before test-user creation.
3. The SNS confirmation was resent and the user reported confirming the newest email, but the latest AWS observation still showed `PendingConfirmation`. Email delivery is not claimed until AWS reports a confirmed subscription. SNS publish acceptance is not proof of inbox delivery.
4. Visual browser verification was rejected by the browser's origin approval policy. No alternative browser surface or security bypass was used. HTTP/backend tests and PDF visual inspection do not constitute browser UI verification.

`resource-inventory.json` records the actual CloudFormation resources in the correct account: 22 foundation resources and 79 application resources. These include policies, API routes and permissions; this is not a count of 101 different AWS services. A migration to another account requires an explicit account choice and a separate deployment.
