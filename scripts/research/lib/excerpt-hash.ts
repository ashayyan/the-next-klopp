import { createHash } from "node:crypto";

/**
 * Canonical excerpt hash shared by every research agent and the verifier:
 * SHA-256 (hex) of the passage after NFC normalisation, every whitespace run collapsed to one
 * space and trimming, encoded as UTF-8. The passage itself is never stored.
 */
export function excerptSha256(passage: string): string {
  const canonical = passage.normalize("NFC").replace(/\s+/g, " ").trim();
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
