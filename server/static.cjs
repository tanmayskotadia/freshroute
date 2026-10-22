const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const client = new S3Client({ region: process.env.AWS_REGION });
const headers = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://*.amazonaws.com https://*.amazoncognito.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
};
exports.handler = async (event) => {
  if (!["GET", "HEAD"].includes(event.requestContext.http.method))
    return { statusCode: 405, headers, body: "" };
  let path;
  try {
    path = decodeURIComponent(event.rawPath || "/");
  } catch {
    return { statusCode: 400, headers, body: "Invalid path" };
  }
  const appRoute =
    path === "/" ||
    (/^\/(overview|shipments|rescue|runs|network|history|settings|evidence|welcome|sign-in|auth|operations|fulfilment|analytics)(\/|$)/.test(
      path,
    ) &&
      !/\.[^/]+$/.test(path));
  const key = appRoute ? "index.html" : path.slice(1);
  if (
    !appRoute &&
    !/^assets\/[A-Za-z0-9_.-]+$/.test(key) &&
    !["cloud-config.json", "index.html", "favicon.svg"].includes(key)
  )
    return { statusCode: 404, headers, body: "Not found" };
  try {
    const object = await client.send(
      new GetObjectCommand({ Bucket: process.env.WEB_BUCKET, Key: key }),
    );
    const bytes = await object.Body.transformToByteArray();
    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": object.ContentType || "application/octet-stream",
        "Cache-Control": key.startsWith("assets/")
          ? "public,max-age=31536000,immutable"
          : "no-store",
      },
      isBase64Encoded: true,
      body:
        event.requestContext.http.method === "HEAD"
          ? ""
          : Buffer.from(bytes).toString("base64"),
    };
  } catch (error) {
    return {
      statusCode: error.name === "NoSuchKey" ? 404 : 503,
      headers: { ...headers, "Cache-Control": "no-store" },
      body:
        error.name === "NoSuchKey"
          ? "Not found"
          : "The web release is not available yet.",
    };
  }
};
