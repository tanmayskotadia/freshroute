import test from "node:test";
import assert from "node:assert/strict";
import { invokeAI } from "../server/aiProvider.ts";
test("AI transport keeps the credential server-side and requests bounded JSON output", async () => {
  const previous = {
    fetch: globalThis.fetch,
    provider: process.env.AI_PROVIDER,
    key: process.env.AI_API_KEY,
    model: process.env.AI_MODEL_ID,
  };
  try {
    process.env.AI_PROVIDER = "groq";
    process.env.AI_API_KEY = "test-only-not-a-real-key";
    process.env.AI_MODEL_ID = "openai/gpt-oss-20b";
    let sent;
    globalThis.fetch = async (url, options) => {
      sent = { url, options };
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: '{"summaryKey":"tradeoffs","factIds":["shipment"]}',
              },
            },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 12 },
        }),
      };
    };
    const result = await invokeAI(
      "Return JSON only.",
      { mode: "explain" },
      new AbortController().signal,
    );
    assert.equal(sent.url, "https://api.groq.com/openai/v1/chat/completions");
    const body = JSON.parse(sent.options.body);
    assert.equal(body.max_completion_tokens, 800);
    assert.deepEqual(body.response_format, { type: "json_object" });
    assert.equal(body.tools, undefined);
    assert.equal(
      body.messages[1].content.includes(process.env.AI_API_KEY),
      false,
    );
    assert.equal(result.inputTokens, 20);
    assert.equal(result.outputTokens, 12);
    let cancelled = false;
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      body: {
        cancel: async () => {
          cancelled = true;
        },
      },
    });
    await assert.rejects(
      invokeAI("JSON", {}, new AbortController().signal),
      (e) =>
        e.name === "AIAuthenticationError" && !e.message.includes("test-only"),
    );
    assert.equal(cancelled, true);
  } finally {
    globalThis.fetch = previous.fetch;
    for (const [name, value] of [
      ["AI_PROVIDER", previous.provider],
      ["AI_API_KEY", previous.key],
      ["AI_MODEL_ID", previous.model],
    ]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
