import { workflowApi } from "./workflowApi.ts";
import { reservationApi, assertShipmentEditable } from "./reservations.ts";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { DomainError } from "../src/domain.ts";
import { applyCommand } from "./commands.ts";
import type { Command } from "./commands.ts";
import { loadWorkspace, saveWorkspace } from "./store.ts";
const reply = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  },
  body: JSON.stringify(body),
});
export async function handler(event: APIGatewayProxyEventV2WithJWTAuthorizer) {
  const requestId = event.requestContext?.requestId;
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    const owner = claims?.sub;
    const issuer = `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}`;
    if (
      typeof owner !== "string" ||
      !/^[a-zA-Z0-9-]{1,128}$/.test(owner) ||
      claims.token_use !== "access" ||
      claims.client_id !== process.env.CLIENT_ID ||
      claims.iss !== issuer
    )
      return reply(401, {
        code: "UNAUTHENTICATED",
        message: "A valid Cognito access token is required.",
        requestId,
      });
    if (
      event.routeKey !== "GET /v1/workspace" &&
      event.routeKey !== "POST /v1/commands"
    ) {
      let body = null;
      if (event.body) {
        const raw = event.isBase64Encoded
          ? Buffer.from(event.body, "base64").toString("utf8")
          : event.body;
        if (Buffer.byteLength(raw, "utf8") > 128000)
          return reply(413, {
            code: "LIMIT",
            message: "Request exceeds 128 KB.",
          });
        try {
          body = JSON.parse(raw);
        } catch {
          return reply(400, { code: "VALIDATION", message: "Expected JSON." });
        }
      }
      const groups = String(claims["cognito:groups"] || "").split(
        /[\s,\[\]"]+/,
      );
      const fulfilment = await reservationApi(
        owner,
        event.routeKey,
        event.pathParameters,
        body ?? { format: event.queryStringParameters?.format },
        String(claims.username || owner),
        groups.includes("administrators"),
      );
      if (fulfilment) return reply(fulfilment.status, fulfilment.body);
      const workflow = await workflowApi(
        owner,
        event.routeKey,
        event.pathParameters,
        body,
      );
      if (workflow) return reply(workflow.status, workflow.body);
    }
    const loaded = await loadWorkspace(owner);
    if (event.routeKey === "GET /v1/workspace")
      return reply(200, {
        workspace: loaded.workspace,
        persisted: loaded.persisted,
      });
    if (event.routeKey !== "POST /v1/commands")
      return reply(404, {
        code: "NOT_FOUND",
        message: "Route not found.",
        requestId,
      });
    const text = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event.body || "";
    if (Buffer.byteLength(text, "utf8") > 128000)
      return reply(413, {
        code: "LIMIT",
        message: "Command body exceeds 128 KB.",
        requestId,
      });
    let command: Command;
    try {
      command = JSON.parse(text);
    } catch {
      return reply(400, {
        code: "VALIDATION",
        message: "Expected a JSON command.",
        requestId,
      });
    }
    const groups = String(claims["cognito:groups"] || "").split(/[\s,\[\]"]+/);
    if (["confirmAnalysis", "saveDestination"].includes(command.action))
      throw new DomainError(
        "FORBIDDEN",
        "Use the shared reservation or receiving-network endpoint for this action.",
      );
    if (
      command.action === "saveShipment" &&
      typeof command.args?.[1] === "string"
    )
      await assertShipmentEditable(owner, command.args[1]);
    const output = applyCommand(
      loaded.workspace,
      command,
      groups.includes("administrators"),
    );
    if (
      output.workspace.revision !== loaded.workspace.revision ||
      !loaded.persisted
    )
      await saveWorkspace(
        owner,
        loaded.workspace,
        output.workspace,
        loaded.persisted,
      );
    console.info(
      JSON.stringify({
        requestId,
        action: command.action,
        status: "ok",
        revision: output.workspace.revision,
      }),
    );
    return reply(200, output);
  } catch (error) {
    if (error instanceof DomainError)
      return reply(
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "CONFLICT"
            ? 409
            : error.code === "LIMIT"
              ? 413
              : error.code === "NOT_FOUND"
                ? 404
                : 400,
        {
          code: error.code,
          message: error.message,
          fields: error.fields,
          requestId,
        },
      );
    console.error(
      JSON.stringify({
        requestId,
        error: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    return reply(500, {
      code: "INTERNAL",
      message:
        "The service could not complete this request. Retry or reload your workspace.",
      requestId,
    });
  }
}
