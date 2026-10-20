#!/usr/bin/env node
// Collects per-file change details from git.
// Usage: node collect-changes.js <base-sha-or-ref> <head-sha-or-ref> <out.json>
//   env INCLUDE_LINES=true adds addedLines / removedLines (line number + text) per file
//   env INCLUDE_PATCH=true adds the raw diff text per file
// Output: { baseSha, headSha, changes: [{ path, status, oldPath?, additions, deletions, binary, addedLines?, removedLines?, patch? }] }
//   baseSha = the commit the PR branched from (merge-base), i.e. the code as it was BEFORE the PR's changes.
const fs = require("fs");
const { execFileSync } = require("child_process");

const STATUS = { A: "added", M: "modified", D: "deleted", R: "renamed", C: "copied", T: "modified" };
const MAX_PATCH_PER_FILE = 20000; // characters
const MAX_LINES_PER_KIND = 500;   // added/removed lines kept per file

const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

function parseNameStatus(out) {
  const t = out.split("\0").filter((x) => x !== "");
  const files = [];
  for (let i = 0; i < t.length; ) {
    const code = t[i][0];
    if (code === "R" || code === "C") { files.push({ status: STATUS[code], oldPath: t[i + 1], path: t[i + 2] }); i += 3; }
    else { files.push({ status: STATUS[code] || "modified", path: t[i + 1] }); i += 2; }
  }
  return files;
}

function parseNumstat(out) {
  const t = out.split("\0");
  const counts = new Map();
  for (let i = 0; i < t.length; ) {
    if (t[i] === "") { i++; continue; }
    const [a, d, p] = t[i].split("\t");
    const binary = a === "-";
    const rec = { additions: binary ? 0 : Number(a), deletions: binary ? 0 : Number(d), binary };
    if (p === "") { counts.set(t[i + 2], rec); i += 3; }      // rename: old\0new follow
    else { counts.set(t[i].split("\t").slice(2).join("\t"), rec); i += 1; }
  }
  return counts;
}

// Parses a single-file unified diff (made with -U0) into added / removed lines.
// Added lines carry their line number in the NEW file, removed lines in the OLD file.
function parseUnifiedDiff(text) {
  const addedLines = [], removedLines = [];
  let inHunk = false, newNo = 0, oldNo = 0;
  for (const line of text.split("\n")) {
    const h = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (h) { inHunk = true; oldNo = Number(h[1]); newNo = Number(h[2]); continue; }
    if (!inHunk || line.startsWith("\\")) continue; // header lines / "\ No newline at end of file"
    if (line.startsWith("+")) addedLines.push({ line: newNo++, text: line.slice(1) });
    else if (line.startsWith("-")) removedLines.push({ line: oldNo++, text: line.slice(1) });
  }
  return { addedLines, removedLines };
}

const revParse = (ref) => git(["rev-parse", "--verify", `${ref}^{commit}`]).trim();
const mergeBase = (base, head) => git(["merge-base", base, head]).trim();

function collect(base, head = "HEAD", { includePatch = false, includeLines = false } = {}) {
  const range = `${base}...${head}`;
  const files = parseNameStatus(git(["diff", "--name-status", "-M", "-z", range]));
  const counts = parseNumstat(git(["diff", "--numstat", "-M", "-z", range]));
  return files.map((f) => {
    const c = counts.get(f.path) || { additions: 0, deletions: 0, binary: false };
    const out = { ...f, ...c };
    const paths = f.oldPath ? [f.oldPath, f.path] : [f.path];
    if (includeLines && !c.binary) {
      const { addedLines, removedLines } = parseUnifiedDiff(git(["diff", "-U0", "-M", range, "--", ...paths]));
      out.addedLines = addedLines.slice(0, MAX_LINES_PER_KIND);
      out.removedLines = removedLines.slice(0, MAX_LINES_PER_KIND);
      if (addedLines.length > MAX_LINES_PER_KIND || removedLines.length > MAX_LINES_PER_KIND) out.linesTruncated = true;
    }
    if (includePatch && !c.binary) {
      let patch = git(["diff", "-M", range, "--", ...paths]);
      if (patch.length > MAX_PATCH_PER_FILE) { patch = patch.slice(0, MAX_PATCH_PER_FILE); out.patchTruncated = true; }
      out.patch = patch;
    }
    return out;
  });
}

if (require.main === module) {
  const [base, head, outFile] = process.argv.slice(2);
  if (!base || !head || !outFile) { console.error("usage: collect-changes.js <base> <head> <out.json>"); process.exit(1); }
  const changes = collect(base, head, { includePatch: process.env.INCLUDE_PATCH === "true", includeLines: process.env.INCLUDE_LINES === "true" });
  const result = { baseSha: mergeBase(base, head), headSha: revParse(head), changes };
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(`Collected ${changes.length} changed file(s); base ${result.baseSha.slice(0, 7)} -> head ${result.headSha.slice(0, 7)}`);
}
module.exports = { collect, mergeBase, parseNameStatus, parseNumstat, parseUnifiedDiff };
