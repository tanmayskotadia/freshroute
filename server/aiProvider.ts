import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  maxAttempts: 1,
  retryMode: "adaptive",
});
export const selectedProvider = () => process.env.AI_PROVIDER || "bedrock";
export const selectedModel = () =>
  selectedProvider() === "groq"
    ? process.env.AI_MODEL_ID || "openai/gpt-oss-20b"
    : process.env.BEDROCK_MODEL_ID || "apac.amazon.nova-micro-v1:0";
export async function invokeAI(
  system: string,
  input: unknown,
  signal: AbortSignal,
) {
  if (selectedProvider() === "groq") {
    const key = process.env.AI_API_KEY;
    if (!key) {
      const error = new Error("AI credential is not configured");
      error.name = "AIConfigurationError";
      throw error;
    }
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        signal,
        body: JSON.stringify({
          model: selectedModel(),
          messages: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(input) },
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 800,
          reasoning_effort: "low",
          temperature: 0,
        }),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      const error = new Error("AI request could not be completed");
      error.name =
        response.status === 429
          ? "ThrottlingException"
          : response.status === 401 || response.status === 403
            ? "AIAuthenticationError"
            : "AIProviderError";
      throw error;
    }
    const data = await response.json(),
      choice = data.choices?.[0];
    if (
      choice?.finish_reason !== "stop" ||
      typeof choice.message?.content !== "string"
    )
      throw Error("IncompleteModelOutput");
    return {
      text: choice.message.content as string,
      inputTokens: Number(data.usage?.prompt_tokens) || 0,
      outputTokens: Number(data.usage?.completion_tokens) || 0,
    };
  }
  const r = await bedrock.send(
    new ConverseCommand({
      modelId: selectedModel(),
      system: [{ text: system }],
      messages: [{ role: "user", content: [{ text: JSON.stringify(input) }] }],
      inferenceConfig: { maxTokens: 500, temperature: 0 },
    }),
    { abortSignal: signal },
  );
  if (r.stopReason !== "end_turn") throw Error("IncompleteModelOutput");
  return {
    text: (r.output?.message?.content || []).map((c) => c.text || "").join(""),
    inputTokens: r.usage?.inputTokens || 0,
    outputTokens: r.usage?.outputTokens || 0,
  };
}
