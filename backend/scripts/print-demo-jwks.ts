import { createPrivateKey, createPublicKey } from "node:crypto";

const encoded = process.env.VICTUS_DEMO_JWT_PRIVATE_KEY_PEM_BASE64?.trim();
const pem = encoded
  ? Buffer.from(encoded, "base64").toString("utf8").trim()
  : process.env.VICTUS_DEMO_JWT_PRIVATE_KEY_PEM?.replace(/\\n/g, "\n").trim();
const kid = process.env.VICTUS_DEMO_JWT_KID ?? "demo-es256-2026-01";
if (!pem) throw new Error("VICTUS_DEMO_JWT_PRIVATE_KEY_PEM is required");
const jwk = createPublicKey(createPrivateKey(pem)).export({ format: "jwk" });
console.log(JSON.stringify({ keys: [{ ...jwk, kid, alg: "ES256", use: "sig" }] }));
