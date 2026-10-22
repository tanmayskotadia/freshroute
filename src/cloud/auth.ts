export type CloudConfig = {
  phase?: number;
  hosting?: string;
  region: string;
  apiUrl: string;
  userPoolId: string;
  clientId: string;
  authDomain: string;
  websiteUrl: string;
};
export type Session = {
  accessToken: string;
  expiresAt: number;
  name: string;
  administrator: boolean;
};
const sessionKey = "freshroute.auth.session";
const pendingKey = "freshroute.auth.pkce";
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
export function readSession(): Session | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(sessionKey) || "null");
    return value &&
      typeof value.accessToken === "string" &&
      value.expiresAt > Date.now() + 30000
      ? value
      : null;
  } catch {
    return null;
  }
}
export function forgetSession() {
  sessionStorage.removeItem(sessionKey);
  sessionStorage.removeItem(pendingKey);
}
export async function startSignIn(config: CloudConfig) {
  if (location.hostname === "127.0.0.1") {
    location.assign(config.websiteUrl + "/welcome");
    return;
  }
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48))),
    state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  const callback = `${location.origin}/auth/callback`;
  sessionStorage.setItem(
    pendingKey,
    JSON.stringify({ verifier, state, callback, createdAt: Date.now() }),
  );
  const url = new URL("/oauth2/authorize", config.authDomain);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: callback,
    scope: "openid email",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  location.assign(url.toString());
}
export async function finishSignIn(config: CloudConfig) {
  const query = new URLSearchParams(location.search);
  const pending = JSON.parse(sessionStorage.getItem(pendingKey) || "null");
  sessionStorage.removeItem(pendingKey);
  history.replaceState({}, "", "/auth/callback");
  if (query.has("error"))
    throw Error("Sign-in was cancelled or rejected. Please start again.");
  if (
    !pending ||
    query.get("state") !== pending.state ||
    Date.now() - pending.createdAt > 600000 ||
    !query.get("code")
  )
    throw Error(
      "The sign-in session expired or could not be verified. Start again.",
    );
  const response = await fetch(new URL("/oauth2/token", config.authDomain), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      code: query.get("code")!,
      redirect_uri: pending.callback,
      code_verifier: pending.verifier,
    }),
  });
  if (!response.ok)
    throw Error("Cognito could not complete sign-in. Start again.");
  const tokens = await response.json();
  if (
    typeof tokens.access_token !== "string" ||
    !Number.isFinite(tokens.expires_in) ||
    tokens.expires_in <= 0
  )
    throw Error("Invalid sign-in response.");
  // Claims below are display hints only. API Gateway verifies the signed access token.
  const payload = tokens.access_token
    .split(".")[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const claims = JSON.parse(atob(payload));
  const session: Session = {
    accessToken: tokens.access_token,
    expiresAt: Date.now() + Math.min(tokens.expires_in, 900) * 1000,
    name: "Signed-in operator",
    administrator:
      Array.isArray(claims["cognito:groups"]) &&
      claims["cognito:groups"].includes("administrators"),
  };
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
  // Refresh tokens are deliberately discarded. Reauthentication renews this short session.
  history.replaceState({}, "", "/overview");
  return session;
}
export function signOut(config: CloudConfig) {
  forgetSession();
  const url = new URL("/logout", config.authDomain);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: `${location.origin}/welcome`,
  }).toString();
  location.assign(url.toString());
}
