// Mechanical goldpass oracle. Renders every entry's real detail-sheet HTML
// (the exact sheetBodyHTML() the live app uses) and checks: no element
// overflows its container, no two text elements overlap, no text renders
// below the font-size floor, every authored string survives verbatim
// (catches silent truncation), and text/background contrast clears WCAG AA.
//
// Driven externally (viewport width via Playwright) — call
// `window.runAudit({theme})` per width/theme combination and collect the
// JSON result.

import { SECTIONS } from "./sections.js";
import { sheetBodyHTML } from "./sheet.js";

const FONT_SPECS = [
  '600 16px "EB Garamond"', '500 italic 16px "EB Garamond"', '400 14px "Work Sans"', '600 14px "Work Sans"', '600 12px "JetBrains Mono"',
  '600 16px "Zilla Slab"', '500 italic 16px "Zilla Slab"', '400 14px "Public Sans"', '600 14px "Public Sans"', '600 12px "Cutive Mono"',
];

const FONT_SIZE_FLOOR = 10;
const OVERFLOW_TOLERANCE = 1.5;
const OVERLAP_TOLERANCE = 2;

async function loadAllFonts() {
  await Promise.all(FONT_SPECS.map((spec) => document.fonts.load(spec).catch(() => {})));
  await document.fonts.ready;
}

function collectStrings(obj, skipKeys) {
  const out = [];
  (function walk(v) {
    if (typeof v === "string") { out.push(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (v && typeof v === "object") {
      Object.keys(v).forEach((k) => {
        if (skipKeys && skipKeys.indexOf(k) !== -1) return;
        walk(v[k]);
      });
    }
  })(obj);
  return out;
}

function expectedStrings(entry, sec) {
  const strings = [entry.name, entry.hook, entry.def];
  if (sec.hasYear && entry.year) strings.push(entry.year);
  strings.push(...collectStrings(entry.anatomy, ["type"]));
  strings.push(...collectStrings(entry.notes));
  return strings.filter((s) => s && s.length > 1);
}

function norm(s) {
  return String(s).replace(/\s+/g, " ").trim().toLowerCase();
}

function textLeaves(root) {
  const out = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.getAttribute("aria-hidden") === "true") continue;
    if (node.children.length === 0 && node.textContent.trim().length > 0) out.push(node);
  }
  return out;
}

function rectsOverlap(a, b) {
  const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return ix > OVERLAP_TOLERANCE && iy > OVERLAP_TOLERANCE;
}

function contained(inner, outer) {
  return (
    inner.left >= outer.left - OVERFLOW_TOLERANCE &&
    inner.right <= outer.right + OVERFLOW_TOLERANCE &&
    inner.top >= outer.top - OVERFLOW_TOLERANCE &&
    inner.bottom <= outer.bottom + OVERFLOW_TOLERANCE
  );
}

function parseColor(str) {
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(",").map((s) => parseFloat(s));
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}

function relLum(c) {
  function chan(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  return 0.2126 * chan(c.r) + 0.7152 * chan(c.g) + 0.0722 * chan(c.b);
}

function contrastRatio(c1, c2) {
  const l1 = relLum(c1), l2 = relLum(c2);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function effectiveBg(el) {
  let node = el;
  while (node) {
    const c = parseColor(getComputedStyle(node).backgroundColor);
    if (c && c.a > 0.5) return c;
    node = node.parentElement;
  }
  return { r: 255, g: 255, b: 255 };
}

// Cumulative CSS `opacity` from el up to (excluding) #sheet-body — used to
// alpha-composite the effective on-screen text color, since a `note`
// element styled with opacity:0.8 is not actually rendering at its
// nominal getComputedStyle().color; it's blended toward the background.
function cumulativeOpacity(el, stopAt) {
  let node = el, op = 1;
  while (node && node !== stopAt) {
    op *= parseFloat(getComputedStyle(node).opacity);
    node = node.parentElement;
  }
  return op;
}

function blend(fg, bg, alpha) {
  return {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  };
}

function checkEntry(entry, data, sec) {
  const violations = [];
  const varName = sec.genreVar[entry.genre];
  const sheetEl = document.getElementById("sheet");
  const bodyEl = document.getElementById("sheet-body");
  sheetEl.style.setProperty("--sheet-color", "var(--" + varName + ")");
  sheetEl.style.setProperty("--sheet-color-soft", "var(--" + varName + "-soft)");
  bodyEl.innerHTML = sheetBodyHTML(entry, data, sec);

  const anatomyBox = bodyEl.querySelector(".anatomy-box");
  const anatomyRect = anatomyBox.getBoundingClientRect();
  const sheetRect = sheetEl.getBoundingClientRect();

  // 1. verbatim content survives (catches truncation)
  const rendered = norm(bodyEl.textContent);
  for (const s of expectedStrings(entry, sec)) {
    if (!rendered.includes(norm(s))) {
      violations.push({ kind: "truncated", detail: s.slice(0, 60) });
    }
  }

  // 2. leaves: overflow, containment, font floor, contrast
  const diagramLeaves = textLeaves(anatomyBox);
  const allLeaves = textLeaves(bodyEl);
  for (const el of allLeaves) {
    if (el.scrollWidth > el.clientWidth + OVERFLOW_TOLERANCE * 4) {
      violations.push({ kind: "internal-overflow", detail: el.className || el.tagName, text: el.textContent.slice(0, 40) });
    }
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < FONT_SIZE_FLOOR) {
      violations.push({ kind: "font-too-small", detail: fs.toFixed(1) + "px", text: el.textContent.slice(0, 40) });
    }
    const fgRaw = parseColor(getComputedStyle(el).color);
    if (fgRaw) {
      // Start the background search at el's own background (an element can
      // be both the text node and the filled box, e.g. .d-hub-center), only
      // falling back to ancestors when el itself has no opaque fill.
      const bg = effectiveBg(el);
      const alpha = fgRaw.a * cumulativeOpacity(el, bodyEl);
      const fg = alpha < 1 ? blend(fgRaw, bg, alpha) : fgRaw;
      const ratio = contrastRatio(fg, bg);
      const bold = parseInt(getComputedStyle(el).fontWeight, 10) >= 600;
      const isLarge = fs >= 18 || (fs >= 14 && bold);
      const floor = isLarge ? 3.0 : 4.5;
      if (ratio < floor) {
        violations.push({ kind: "low-contrast", detail: ratio.toFixed(2) + " (need " + floor + ")", text: el.textContent.slice(0, 40) });
      }
    }
  }
  for (const el of diagramLeaves) {
    const r = el.getBoundingClientRect();
    if (!contained(r, anatomyRect)) {
      violations.push({ kind: "escapes-diagram-box", detail: el.className || el.tagName, text: el.textContent.slice(0, 40) });
    }
  }
  if (!contained(anatomyRect, sheetRect)) {
    violations.push({ kind: "diagram-escapes-sheet", detail: "anatomy-box" });
  }

  // 3. pairwise overlap among ALL text leaves in the sheet (not just the
  // diagram's absolutely-positioned ones) — normal document flow can't
  // self-overlap, but .sheet-stamp is position:absolute over the sheet body
  // and must be checked against .sheet-name/.sheet-hook for long titles.
  for (let i = 0; i < allLeaves.length; i++) {
    for (let j = i + 1; j < allLeaves.length; j++) {
      const a = allLeaves[i].getBoundingClientRect();
      const b = allLeaves[j].getBoundingClientRect();
      if (rectsOverlap(a, b)) {
        violations.push({
          kind: "text-overlap",
          detail: allLeaves[i].textContent.slice(0, 30) + " ↔ " + allLeaves[j].textContent.slice(0, 30),
        });
      }
    }
  }

  return violations;
}

window.runAudit = async function runAudit(options) {
  options = options || {};
  const theme = options.theme || "light";
  document.documentElement.setAttribute("data-theme", theme);
  await loadAllFonts();

  const results = { theme, width: window.innerWidth, total: 0, failing: 0, violations: [] };

  for (const sec of SECTIONS) {
    document.documentElement.setAttribute("data-section", sec.id);
    const res = await fetch(sec.dataFile);
    const data = await res.json();
    for (const entry of data.entries) {
      results.total++;
      const violations = checkEntry(entry, data, sec);
      if (violations.length) {
        results.failing++;
        results.violations.push({ section: sec.id, id: entry.id, archetype: entry.anatomy.type, violations });
      }
    }
  }
  return results;
};

document.getElementById("out").textContent = "Ready. Call window.runAudit({theme}) from the driver.";
