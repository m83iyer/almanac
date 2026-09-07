// Builds the detail-sheet body HTML for one entry. Pure function, no DOM
// side effects — imported by both the live app (app.js) and the audit /
// gallery harnesses, so what gets measured is exactly what ships.

import { renderAnatomy, esc } from "./diagrams.js";

export function codeFor(entry, data, sec) {
  const genreList = data.entries.filter((x) => x.genre === entry.genre);
  const n = genreList.indexOf(entry) + 1;
  return data.genres[entry.genre].code + "·" + (n < 10 ? "0" + n : n);
}

export function sheetBodyHTML(entry, data, sec) {
  const varName = sec.genreVar[entry.genre];
  const notesHtml = entry.notes.map((n) =>
    '<div class="note-item"><p class="note-title">' + esc(n.t) + '</p><p class="note-body">' + esc(n.b) + '</p></div>'
  ).join("");
  const code = codeFor(entry, data, sec);
  const g = data.genres[entry.genre];

  return (
    '<div class="sheet-stamp">On File</div>' +
    '<div class="sheet-code-row"><span>' + code + '</span><span class="rule"></span><span>' + esc(g.label.toUpperCase()) + '</span></div>' +
    (sec.hasYear ? '<div class="sheet-year">' + esc(entry.year) + '</div>' : '') +
    '<h2 class="sheet-name">' + esc(entry.name) + '</h2>' +
    '<p class="sheet-hook">' + esc(entry.hook) + '</p>' +
    '<p class="sheet-def">' + esc(entry.def) + '</p>' +
    '<p class="anatomy-label">' + esc(sec.mechanismLabel) + '</p>' +
    '<div class="anatomy-box">' + renderAnatomy(entry.anatomy, "var(--" + varName + ")", "var(--" + varName + "-soft)") + '</div>' +
    '<p class="notes-label">' + esc(sec.notesLabel) + '</p>' +
    '<div class="notes-list">' + notesHtml + '</div>' +
    '<div class="sheet-foot"><span>' + esc(sec.footName) + '</span><span>' + code + '</span></div>' +
    '<div class="export-row"><button class="export-btn" id="export-btn">' +
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v13m0 0l-5-5m5 5l5-5M4 20h16"/></svg>' +
      'Export as PDF</button></div>' +
    '<div class="export-msg" id="export-msg"></div>'
  );
}

export function sheetColorVars(entry, sec) {
  const varName = sec.genreVar[entry.genre];
  return { color: "var(--" + varName + ")", colorSoft: "var(--" + varName + "-soft)" };
}
