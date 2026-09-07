// Lightweight content gate: run before every deploy so a bad edit to
// concepts.json / acts.json fails CI instead of silently breaking the site.
import { readFileSync, readdirSync } from "node:fs";

const VALID_ANATOMY = new Set(["steps", "comparison", "cycle", "hub", "curve", "circles", "spectrum", "matrix"]);
const dataDir = new URL("../app/data/", import.meta.url);
let failed = false;

function fail(file, msg) {
  console.error(`FAIL ${file}: ${msg}`);
  failed = true;
}

for (const file of readdirSync(dataDir).filter((f) => f.endsWith(".json"))) {
  const raw = readFileSync(new URL(file, dataDir), "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    fail(file, `invalid JSON — ${e.message}`);
    continue;
  }

  if (!data.genres || typeof data.genres !== "object") fail(file, "missing genres object");
  if (!Array.isArray(data.entries)) { fail(file, "missing entries array"); continue; }

  const ids = new Set();
  data.entries.forEach((e, i) => {
    const where = `${file} entries[${i}]`;
    if (!e.id) fail(where, "missing id");
    else if (ids.has(e.id)) fail(where, `duplicate id "${e.id}"`);
    else ids.add(e.id);

    if (!e.genre || !data.genres[e.genre]) fail(where, `genre "${e.genre}" not declared in genres`);
    if (!e.name) fail(where, "missing name");
    if (!e.hook) fail(where, "missing hook");
    if (!e.def) fail(where, "missing def");
    if (!e.anatomy || !VALID_ANATOMY.has(e.anatomy.type)) fail(where, `invalid anatomy.type "${e.anatomy && e.anatomy.type}"`);
    if (!Array.isArray(e.notes) || !e.notes.length) fail(where, "missing notes");
  });

  console.log(`${file}: ${data.entries.length} entries, ${ids.size} unique ids, genres: ${Object.keys(data.genres).join(", ")}`);
}

if (failed) {
  console.error("\nValidation failed.");
  process.exit(1);
}
console.log("\nAll content files valid.");
