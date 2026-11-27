// CLI: printf 'passage' | node scripts/research/excerpt-hash.ts
// Prints the canonical excerpt SHA-256 (NFC, whitespace collapsed, trimmed, UTF-8) of stdin.
import { excerptSha256 } from "./lib/excerpt-hash.ts";

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
const passage = Buffer.concat(chunks).toString("utf8");

if (passage.trim() === "") {
  console.error("usage: printf 'exact passage' | node scripts/research/excerpt-hash.ts");
  process.exit(1);
}
console.log(excerptSha256(passage));
