import { DomainError } from "../domain";
import { readSession } from "./auth";
import type { CloudConfig } from "./auth";
export async function cloudRequest<T = any>(
  config: CloudConfig,
  path: string,
  body?: unknown,
): Promise<T> {
  const session = readSession();
  if (!session)
    throw new DomainError(
      "AUTH",
      "Your cloud session expired. Sign in again to continue.",
    );
  let response: Response;
  try {
    response = await fetch(config.apiUrl + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    throw new DomainError(
      "NETWORK",
      "The cloud service could not be reached. Retry without closing your form.",
    );
  }
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new DomainError(
      "API",
      "The cloud service returned an unreadable response.",
    );
  }
  if (!response.ok)
    throw new DomainError(
      data.code || "API",
      data.message || "Cloud request failed.",
      data.fields || {},
    );
  return data;
}
