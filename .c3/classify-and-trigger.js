#!/usr/bin/env node
// Runs inside the GitHub Actions job. Usage: node classify-and-trigger.js changes.json (from collect-changes.js)
// Env: C3_URL, C3_API_KEY, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA, GITHUB_SERVER_URL
const fs = require("fs");
const { classifyChange, needsScan } = require("./classifier");

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("usage: classify-and-trigger.js <changes.json>");
  const input = JSON.parse(fs.readFileSync(file, "utf8"));
  const changes = Array.isArray(input) ? input : input.changes; // plain array = older format, no baseSha
  const baseSha = Array.isArray(input) ? undefined : input.baseSha;
  if (!Array.isArray(changes)) throw new Error("changes file must contain {baseSha, changes[]}");
  const changedFiles = changes.map((c) => c.path);
  const classification = classifyChange(changedFiles);
  console.log(`Changed files (${changes.length}):\n  ${changes.map((c) => `${c.status.padEnd(8)} ${c.path} (+${c.additions}/-${c.deletions})`).join("\n  ") || "(none)"}`);
  console.log(`Classification: ${classification} -> ${needsScan(classification) ? "Component 2 scan required" : "scan skipped"}`);

  const { C3_URL, C3_API_KEY, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA } = process.env;
  for (const [k, v] of Object.entries({ C3_URL, C3_API_KEY, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA }))
    if (!v) throw new Error(`missing env ${k}`);

  const payload = {
    repo: GITHUB_REPOSITORY,
    repoUrl: `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${GITHUB_REPOSITORY}`,
    prNumber: Number(PR_NUMBER),
    commitSha: HEAD_SHA,
    baseSha,
    changedFiles,
    changes,
  };

  // Retry transient failures. If the backend stays unreachable the step FAILS,
  // so the check never silently passes.
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${C3_URL.replace(/\/$/, "")}${process.env.C3_EVENTS_PATH || "/api/enforcement/pipeline-events"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": C3_API_KEY },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      });
      const text = await res.text();
      if (res.ok) { console.log(`Component 3 responded ${res.status}: ${text}`); return; }
      if (res.status < 500) throw Object.assign(new Error(`Component 3 rejected request: ${res.status} ${text}`), { fatal: true });
      lastErr = new Error(`${res.status} ${text}`);
    } catch (e) {
      if (e.fatal) throw e;
      lastErr = e;
    }
    console.log(`Attempt ${attempt} failed: ${lastErr.message}`);
    await new Promise((r) => setTimeout(r, attempt * 2000));
  }
  throw new Error(`Component 3 unreachable after retries: ${lastErr.message}`);
}

main().catch((e) => { console.error(`::error::${e.message}`); process.exit(1); });
