# Server-side AI credential setup

The product interface uses neutral labels: AI copilot, AI-generated evidence and deterministic fallback. Technical configuration records the selected provider accurately. The optional Bedrock adapter remains available; the deployed external API adapter uses Groq's OpenAI-compatible endpoint with `openai/gpt-oss-20b`. Live generation, caching and draft values passed verification on 22 October 2026.

1. Sign in to AWS account `118462784511`, region `ap-south-1`.
2. Open Secrets Manager and find `freshroute/copilot-api-key`.
3. Store a JSON key/value pair named `apiKey` with your API credential as its value. Do not place it in chat, source code, public cloud configuration or browser storage.
4. Tell the assistant only that the secret has been stored.

The secret was created empty through CloudFormation and retained independently of application changes. Verification reads only secret metadata to check whether a current version exists. The assistant does not retrieve secret values. CloudFormation resolves the Secrets Manager dynamic reference into the Lambda environment during deployment. Runtime HTTP requests send the credential only to the configured provider's fixed HTTPS endpoint; it is not returned in API responses or logged by application code.

Changing the stored credential does not automatically refresh an existing Lambda environment. Redeploy the function's configuration after rotating it. Never expose Lambda environment variables in diagnostic output. The runtime role does not need permission to retrieve secret values because CloudFormation resolves the reference at deployment.

Groq API and JSON response documentation: https://console.groq.com/docs/openai and https://console.groq.com/docs/structured-outputs . JSON Object Mode does not enforce the application's schema, so the same strict fact/draft validator remains mandatory after every response. Requests use an explicit token cap and deadline. The account's API quota and billing remain the user's responsibility; no paid plan was enabled automatically.
