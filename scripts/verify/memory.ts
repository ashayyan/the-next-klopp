// verify-setup section: live agentmemory round trip for the learner profile and project rules (SETUP-05).
// Searches go through POST /agentmemory/smart-search. Compact mode returns ids and titles only, so
// the full content is read from GET /agentmemory/memories and matched by id.
// The secret file is read only if it exists and is used only as the Authorization header value.
// It is never printed, logged or written. Standalone, dependency-free, erasable TypeScript.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE = "http://localhost:3111/agentmemory";
const TAG = "the-next-klopp";
const MAX_CONTENT_CHARS = 4000;

interface SearchResult {
  obsId?: string;
  id?: string;
  title?: string;
}
interface Memory {
  id: string;
  content: string;
  project?: string;
  concepts?: string[];
}

function fail(message: string): never {
  console.error(`verify memory: FAIL - ${message}`);
  process.exit(1);
}

const secretFile = join(homedir(), ".agentmemory", "secret");
const headers: Record<string, string> = { "Content-Type": "application/json" };
if (existsSync(secretFile)) {
  const secret = readFileSync(secretFile, "utf8").trim();
  if (secret.length > 0) headers.Authorization = `Bearer ${secret}`;
}

async function request(path: string, init: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, signal: AbortSignal.timeout(15000) });
  } catch {
    fail(
      `agentmemory is not reachable at ${BASE} (start it with: npx -y @agentmemory/agentmemory@0.9.33)`,
    );
  }
  if (!res.ok) fail(`${init.method ?? "GET"} ${path} returned HTTP ${res.status}`);
  return res.json();
}

const live = (await request("/livez", { method: "GET" })) as { status?: string };
if (live.status !== "ok") fail(`livez status is "${live.status}", expected "ok"`);

const listed = (await request(`/memories?project=${TAG}`, { method: "GET" })) as {
  memories?: Memory[];
};
const memories = listed.memories ?? [];
if (memories.length === 0) fail(`no memories stored for project ${TAG}`);
const byId = new Map(memories.map((m) => [m.id, m]));

for (const m of memories) {
  if (m.content.length >= MAX_CONTENT_CHARS) {
    fail(
      `entry ${m.id} is ${m.content.length} characters (limit ${MAX_CONTENT_CHARS}): looks like a dump`,
    );
  }
}

async function search(query: string): Promise<Memory[]> {
  const data = (await request("/smart-search", {
    method: "POST",
    body: JSON.stringify({ query, limit: 5 }),
  })) as { results?: SearchResult[] };
  const found: Memory[] = [];
  for (const r of data.results ?? []) {
    const memory = byId.get(r.obsId ?? r.id ?? "");
    if (memory) found.push(memory);
  }
  return found;
}

const profile = await search(`${TAG} learner profile ADHD PFSA`);
if (!profile.some((m) => m.content.includes("PFSA"))) {
  fail("search for the learner profile returned no entry that contains PFSA");
}

const rules = await search(`${TAG} non-negotiables`);
if (!rules.some((m) => /non-negotiable/i.test(m.content))) {
  fail("search for the project rules returned no entry that contains non-negotiable");
}

console.log(
  `verify memory: ok (${memories.length} entries, longest ${Math.max(...memories.map((m) => m.content.length))} chars)`,
);
