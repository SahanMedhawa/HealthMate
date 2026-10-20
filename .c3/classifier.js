// Trigger check: decides from file paths alone whether a PR needs a Component 2 scan.
// Metadata only - no file contents are read. Heavy parsing stays in Component 2.
const DOC_EXT = [".md", ".txt", ".rst", ".adoc"];
const CONFIG_EXT = [".yml", ".yaml", ".json", ".env", ".toml", ".ini", ".properties", ".xml"];

// Dependency manifests are JSON/XML but can change architecture (new modules/deps),
// so they are treated as code-affecting.
const CODE_AFFECTING_NAMES = ["pom.xml", "build.gradle", "package.json", "settings.gradle"];

function extOf(p) {
  const base = p.split("/").pop().toLowerCase();
  const i = base.lastIndexOf(".");
  return i <= 0 ? base.startsWith(".") ? base : "" : base.slice(i);
}

function fileKind(p) {
  const base = p.split("/").pop().toLowerCase();
  if (CODE_AFFECTING_NAMES.includes(base)) return "code";
  const ext = extOf(p);
  if (DOC_EXT.includes(ext)) return "documentation";
  if (CONFIG_EXT.includes(ext)) return "configuration";
  return "code";
}

/** @param {string[]} filePaths @returns {"documentation"|"configuration"|"code change"} */
function classifyChange(filePaths) {
  const files = (filePaths || []).map((f) => f.trim()).filter(Boolean);
  if (files.length === 0) return "documentation"; // nothing changed -> nothing to scan
  const kinds = new Set(files.map(fileKind));
  if (kinds.has("code")) return "code change";
  if (kinds.size === 1 && kinds.has("documentation")) return "documentation";
  return "configuration"; // docs+config mix, or config only: no code touched
}

const needsScan = (classification) => classification === "code change";

module.exports = { classifyChange, needsScan, fileKind };
