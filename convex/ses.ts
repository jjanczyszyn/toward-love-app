// Minimal AWS SES v2 SendEmail with SigV4 signing, for use inside a Convex
// action (uses Web Crypto; actions may use Date).
function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256hex(msg: string): Promise<string> {
  const data = new TextEncoder().encode(msg) as unknown as BufferSource;
  const buf = await crypto.subtle.digest("SHA-256", data);
  return hex(new Uint8Array(buf));
}

async function hmac(key: Uint8Array, msg: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    key as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const data = new TextEncoder().encode(msg) as unknown as BufferSource;
  const sig = await crypto.subtle.sign("HMAC", k, data);
  return new Uint8Array(sig);
}

export async function sendEmailSES(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const region = process.env.AWS_SES_REGION ?? "us-east-1";
  const akid = process.env.AWS_SES_ACCESS_KEY_ID;
  const secret = process.env.AWS_SES_SECRET_ACCESS_KEY;
  const from = process.env.LOGIN_FROM ?? "Toward Love <hello@toward.love>";
  if (!akid || !secret) throw new Error("Email is not configured (AWS SES).");

  const host = `email.${region}.amazonaws.com`;
  const path = "/v2/email/outbound-emails";
  const body = JSON.stringify({
    FromEmailAddress: from,
    Destination: { ToAddresses: [opts.to] },
    Content: {
      Simple: {
        Subject: { Data: opts.subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: opts.text, Charset: "UTF-8" },
          Html: { Data: opts.html, Charset: "UTF-8" },
        },
      },
    },
  });

  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}Z$/, "Z");
  const datestamp = amzdate.slice(0, 8);

  const payloadHash = await sha256hex(body);
  const canonicalHeaders =
    `content-type:application/json\nhost:${host}\nx-amz-date:${amzdate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = [
    "POST",
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${datestamp}/${region}/ses/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzdate,
    scope,
    await sha256hex(canonicalRequest),
  ].join("\n");

  const kDate = await hmac(new TextEncoder().encode("AWS4" + secret), datestamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, "ses");
  const kSigning = await hmac(kService, "aws4_request");
  const signature = hex(await hmac(kSigning, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${akid}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Amz-Date": amzdate,
      Authorization: authorization,
    },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`SES send failed (${res.status}): ${t.slice(0, 200)}`);
  }
}
