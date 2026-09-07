import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

function extractArray(source, varName) {
  const marker = `var ${varName} = [`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Could not find ${varName} in source`);
  const arrayStart = start + marker.length - 1; // position of the opening [
  let depth = 0;
  let end = -1;
  for (let i = arrayStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`Could not find matching close for ${varName}`);
  const literal = source.slice(arrayStart, end);
  const script = new vm.Script(`(${literal})`);
  const context = vm.createContext({});
  return script.runInContext(context);
}

function extractGenres(source) {
  const marker = "var GENRES = {";
  const start = source.indexOf(marker);
  if (start === -1) throw new Error("Could not find GENRES");
  const objStart = start + marker.length - 1;
  let depth = 0;
  let end = -1;
  for (let i = objStart; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const literal = source.slice(objStart, end);
  const script = new vm.Script(`(${literal})`);
  const context = vm.createContext({});
  return script.runInContext(context);
}

const scratch = "/private/tmp/claude-501/-Users-manojiyer-Library-Mobile-Documents-com-apple-CloudDocs-Claude/d189afe4-bfe2-420c-8301-840381e1eac3/scratchpad";

const fieldCodexSrc = readFileSync(`${scratch}/field-codex.html`, "utf8");
const actsDossierSrc = readFileSync(`${scratch}/acts-dossier.html`, "utf8");

const concepts = extractArray(fieldCodexSrc, "CONCEPTS");
const conceptGenres = extractGenres(fieldCodexSrc);
const acts = extractArray(actsDossierSrc, "CONCEPTS");
const actGenres = extractGenres(actsDossierSrc);

console.log(`concepts: ${concepts.length} entries, genres:`, Object.keys(conceptGenres));
console.log(`acts: ${acts.length} entries, genres:`, Object.keys(actGenres));

const outDir = "/Users/manojiyer/Library/Mobile Documents/com~apple~CloudDocs/Codex/projects/almanac/app/data";
writeFileSync(`${outDir}/concepts.json`, JSON.stringify({ genres: conceptGenres, entries: concepts }, null, 2));
writeFileSync(`${outDir}/acts.json`, JSON.stringify({ genres: actGenres, entries: acts }, null, 2));

console.log("Wrote concepts.json and acts.json");
