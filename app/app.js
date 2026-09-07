import { renderAnatomy, SHAPE_LABEL, esc } from "./diagrams.js";
import { createPdfBlob } from "./pdf.js";

const SECTIONS = [
  {
    id: "concepts",
    label: "Concepts",
    dataFile: "data/concepts.json",
    eyebrow: "A Field Codex · Vol. I",
    title: "Ideas Worth Recognizing on Sight",
    sub: "A specimen catalog of the mental models, biases, and market mechanics that keep recurring across thinking, psychology, economics, and investing — each one classified, diagrammed, and stocked with field notes so you know it when you see it.",
    searchLabel: "Search the catalog",
    genreVar: { models: "g1", psychology: "g2", economics: "g3", investing: "g4" },
    hasYear: false,
    notesLabel: "Field Notes",
    mechanismLabel: "Anatomy",
    footName: "Field Codex · Vol. I",
  },
  {
    id: "acts",
    label: "Historical Acts & Policies",
    dataFile: "data/acts.json",
    eyebrow: "The Dossier · Vol. I",
    title: "100 Acts That Redrew the Map",
    sub: "A case file of the treaties, laws, corporate decisions, and policy shifts whose consequences are still being paid out today — each one dated, diagrammed, and filed with what actually happened next.",
    searchLabel: "Search the dossier",
    genreVar: { econ: "g1", war: "g2", biz: "g3", geo: "g4" },
    hasYear: true,
    notesLabel: "Aftermath",
    mechanismLabel: "Mechanism",
    footName: "The Dossier · Vol. I",
  },
];

const cache = {};
const state = { sectionId: null, genre: "all", query: "" };

const root = document.documentElement;
const shellTabs = document.getElementById("shell-tabs");
const wrap = document.getElementById("section-wrap");

function section() {
  return SECTIONS.find((s) => s.id === state.sectionId);
}

async function loadSection(id) {
  if (cache[id]) return cache[id];
  const sec = SECTIONS.find((s) => s.id === id);
  const res = await fetch(sec.dataFile);
  const data = await res.json();
  cache[id] = data;
  return data;
}

function codeFor(entry, data, sec) {
  const genreList = data.entries.filter((x) => x.genre === entry.genre);
  const n = genreList.indexOf(entry) + 1;
  return data.genres[entry.genre].code + "·" + (n < 10 ? "0" + n : n);
}

function matches(entry) {
  if (state.genre !== "all" && entry.genre !== state.genre) return false;
  if (state.query) {
    const q = state.query.toLowerCase();
    return (
      entry.name.toLowerCase().includes(q) ||
      entry.hook.toLowerCase().includes(q) ||
      entry.def.toLowerCase().includes(q) ||
      (entry.year || "").includes(q)
    );
  }
  return true;
}

function renderShellTabs() {
  shellTabs.innerHTML = "";
  SECTIONS.forEach((sec) => {
    const btn = document.createElement("button");
    btn.className = "shell-tab" + (sec.id === state.sectionId ? " active" : "");
    btn.style.setProperty("--tab-accent", sec.id === state.sectionId ? "var(--g1)" : "");
    btn.textContent = sec.label;
    btn.addEventListener("click", () => switchSection(sec.id));
    shellTabs.appendChild(btn);
  });
}

async function switchSection(id) {
  if (state.sectionId === id) return;
  state.sectionId = id;
  state.genre = "all";
  state.query = "";
  root.setAttribute("data-section", id);
  location.hash = id;
  try {
    localStorage.setItem("almanac.lastSection", id);
  } catch (e) {}
  renderShellTabs();
  await renderSection();
}

async function renderSection() {
  const sec = section();
  const data = await loadSection(sec.id);

  const genreEntries = Object.keys(data.genres).map((key) => ({ key, ...data.genres[key] }));

  wrap.innerHTML =
    '<header class="top">' +
      '<div class="eyebrow-row">' +
        '<span class="eyebrow">' + esc(sec.eyebrow) + '</span>' +
        '<span class="count-line" id="count-line"></span>' +
      '</div>' +
      '<h1>' + esc(sec.title) + '</h1>' +
      '<p class="sub">' + esc(sec.sub) + '</p>' +
      '<div class="filter-row">' +
        '<button class="filter-chip active" data-genre="all" style="--chip-color: var(--ink)"><span class="dot"></span>All</button>' +
        genreEntries.map((g) =>
          '<button class="filter-chip" data-genre="' + g.key + '" style="--chip-color: var(--' + sec.genreVar[g.key] + ')"><span class="dot"></span>' + esc(g.label) + '</button>'
        ).join("") +
        '<div class="search-box">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>' +
          '<input id="search" type="text" aria-label="' + esc(sec.searchLabel) + '">' +
          '<span class="search-label">Search</span>' +
        '</div>' +
      '</div>' +
    '</header>' +
    '<div class="grid" id="grid"></div>';

  wrap.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      wrap.querySelectorAll(".filter-chip").forEach((b) => b.classList.remove("active"));
      chip.classList.add("active");
      state.genre = chip.getAttribute("data-genre");
      renderGrid(data, sec);
    });
  });
  wrap.querySelector("#search").addEventListener("input", (e) => {
    state.query = e.target.value.trim();
    renderGrid(data, sec);
  });

  renderGrid(data, sec);
}

function renderGrid(data, sec) {
  const countEl = wrap.querySelector("#count-line");
  const gridEl = wrap.querySelector("#grid");
  const list = data.entries.filter(matches);
  countEl.textContent = list.length + " OF " + data.entries.length + (sec.id === "acts" ? " CASE FILES ON RECORD" : " SPECIMENS CATALOGUED");
  gridEl.innerHTML = "";
  if (!list.length) {
    gridEl.innerHTML = '<div class="empty-state">Nothing matches that search.</div>';
    return;
  }
  list.forEach((entry) => {
    const g = data.genres[entry.genre];
    const card = document.createElement("div");
    card.className = "card";
    card.style.setProperty("--card-color", "var(--" + sec.genreVar[entry.genre] + ")");
    card.innerHTML =
      '<div class="card-code"><span>' + codeFor(entry, data, sec) + '</span><span>' + esc(g.label.toUpperCase()) + '</span></div>' +
      (sec.hasYear ? '<div class="card-year">' + esc(entry.year) + '</div>' : '') +
      '<div class="card-name">' + esc(entry.name) + '</div>' +
      '<div class="card-hook">' + esc(entry.hook) + '</div>' +
      '<div class="card-shape">' + esc(SHAPE_LABEL[entry.anatomy.type] || entry.anatomy.type) + '</div>';
    card.addEventListener("click", () => openSheet(entry, data, sec));
    gridEl.appendChild(card);
  });
}

// ── detail sheet ─────────────────────────────────────────────────────

const overlay = document.getElementById("overlay");
const sheetBody = document.getElementById("sheet-body");
const sheetEl = document.getElementById("sheet");
let current = null;

function openSheet(entry, data, sec) {
  current = { entry, data, sec };
  const varName = sec.genreVar[entry.genre];
  sheetEl.style.setProperty("--sheet-color", "var(--" + varName + ")");
  sheetEl.style.setProperty("--sheet-color-soft", "var(--" + varName + "-soft)");

  const notesHtml = entry.notes.map((n) =>
    '<div class="note-item"><p class="note-title">' + esc(n.t) + '</p><p class="note-body">' + esc(n.b) + '</p></div>'
  ).join("");

  const code = codeFor(entry, data, sec);
  const g = data.genres[entry.genre];

  sheetBody.innerHTML =
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
    '<div class="export-msg" id="export-msg"></div>';

  document.getElementById("export-btn").addEventListener("click", exportCurrentPdf);
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  overlay.scrollTop = 0;
}

function closeSheet() {
  overlay.hidden = true;
  document.body.style.overflow = "";
  current = null;
}
document.getElementById("close-btn").addEventListener("click", closeSheet);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSheet(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hidden) closeSheet(); });

// ── PDF export ───────────────────────────────────────────────────────

let downloadsNS = null;
if (window.claude && typeof window.claude.use === "function") {
  window.claude.use("downloads").then((ns) => { downloadsNS = ns; }).catch(() => {});
}

async function saveBlob(blob, filename) {
  if (downloadsNS && downloadsNS.save) {
    const res = await downloadsNS.save({ filename, data: blob });
    return res.status;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "saved";
}

async function exportCurrentPdf() {
  if (!current) return;
  const { entry, sec } = current;
  const btn = document.getElementById("export-btn");
  const msg = document.getElementById("export-msg");
  btn.disabled = true;
  const originalLabel = btn.innerHTML;
  btn.innerHTML = "Preparing…";
  msg.textContent = "";

  sheetEl.classList.add("exporting");
  try {
    const bg = getComputedStyle(document.body).getPropertyValue("--paper-raised").trim() || "#ffffff";
    const canvas = await window.html2canvas(sheetEl, { scale: 2.4, backgroundColor: bg, useCORS: true });
    sheetEl.classList.remove("exporting");
    const pdfBlob = await createPdfBlob(canvas, { title: entry.name + " — " + sec.footName });
    btn.innerHTML = originalLabel;
    const status = await saveBlob(pdfBlob, entry.id + "-almanac.pdf");
    msg.textContent = status === "delivered" ? "Sent." : "Saved.";
  } catch (err) {
    sheetEl.classList.remove("exporting");
    btn.innerHTML = originalLabel;
    if (err && err.code === "declined") {
      msg.textContent = "";
    } else {
      msg.textContent = "Export failed. Try again.";
    }
  } finally {
    btn.disabled = false;
  }
}

// ── boot ─────────────────────────────────────────────────────────────

function initialSection() {
  const fromHash = location.hash.replace("#", "");
  if (SECTIONS.some((s) => s.id === fromHash)) return fromHash;
  try {
    const saved = localStorage.getItem("almanac.lastSection");
    if (SECTIONS.some((s) => s.id === saved)) return saved;
  } catch (e) {}
  return SECTIONS[0].id;
}

async function boot() {
  renderShellTabs();
  state.sectionId = initialSection();
  root.setAttribute("data-section", state.sectionId);
  renderShellTabs();
  await renderSection();
}

boot();
