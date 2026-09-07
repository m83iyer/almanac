// Shared diagram-shape rendering engine. Each entry's `anatomy` field picks
// one of these archetypes; the renderer draws it as inline SVG that inherits
// the active section's color tokens via `color` / `colorSoft` args and
// `currentColor` / `var(--paper)` lookups against the surrounding DOM.

export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function wrapSvgText(text, maxChars) {
  var words = String(text).split(" ");
  var lines = [], cur = "";
  words.forEach(function (w) {
    var cand = cur ? cur + " " + w : w;
    if (cand.length > maxChars && cur) { lines.push(cur); cur = w; } else { cur = cand; }
  });
  if (cur) lines.push(cur);
  return lines;
}

function svgOpen(w, h) {
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" style="display:block" xmlns="http://www.w3.org/2000/svg">';
}

function drawSteps(data, color, colorSoft) {
  var n = data.nodes.length;
  var w = 520, h = 190, pad = 14, gap = 10;
  var boxW = (w - pad * 2 - gap * (n - 1)) / n, boxH = 108, boxY = 24;
  var out = svgOpen(w, h);
  data.nodes.forEach(function (node, i) {
    var x = pad + i * (boxW + gap);
    out += '<rect x="' + x + '" y="' + boxY + '" width="' + boxW + '" height="' + boxH + '" rx="5" fill="' + colorSoft + '" stroke="' + color + '" stroke-width="1.1"/>';
    out += '<text x="' + (x + boxW / 2) + '" y="' + (boxY + 15) + '" text-anchor="middle" class="mono" font-size="9" fill="' + color + '" font-weight="600">STEP ' + (i + 1) + '</text>';
    var labelLines = wrapSvgText(node.label, Math.max(10, boxW / 6.1));
    labelLines.forEach(function (ln, li) {
      out += '<text x="' + (x + boxW / 2) + '" y="' + (boxY + 32 + li * 13) + '" text-anchor="middle" font-size="11.5" font-weight="600" fill="' + color + '">' + esc(ln) + '</text>';
    });
    var noteY = boxY + 32 + labelLines.length * 13 + 8;
    var noteLines = wrapSvgText(node.note || "", Math.max(10, boxW / 5.6)).slice(0, 3);
    noteLines.forEach(function (ln, li) {
      out += '<text x="' + (x + boxW / 2) + '" y="' + (noteY + li * 11) + '" text-anchor="middle" font-size="8.6" fill="currentColor" opacity="0.72">' + esc(ln) + '</text>';
    });
    if (i < n - 1) {
      var ax = x + boxW + 1, ay = boxY + boxH / 2;
      out += '<path d="M' + ax + ' ' + ay + ' L' + (ax + gap - 2) + ' ' + ay + '" stroke="' + color + '" stroke-width="1.6" marker-end="url(#arrow-' + color.replace('#', '') + ')"/>';
    }
  });
  out += '<defs><marker id="arrow-' + color.replace('#', '') + '" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="' + color + '"/></marker></defs>';
  out += '<text x="' + (w / 2) + '" y="' + (h - 8) + '" text-anchor="middle" class="mono" font-size="8.5" fill="currentColor" opacity="0.55">FLOW &middot; LEFT TO RIGHT</text>';
  out += '</svg>';
  return out;
}

function drawComparison(data, color, colorSoft) {
  var w = 520, h = 190;
  var boxW = 210, boxH = 130, boxY = 16, gapCenter = 60;
  var lx = w / 2 - gapCenter / 2 - boxW, rx = w / 2 + gapCenter / 2;
  var out = svgOpen(w, h);
  [["left", lx], ["right", rx]].forEach(function (pair) {
    var side = data[pair[0]], x = pair[1];
    out += '<rect x="' + x + '" y="' + boxY + '" width="' + boxW + '" height="' + boxH + '" rx="5" fill="' + colorSoft + '" stroke="' + color + '" stroke-width="1.1"/>';
    var labelLines = wrapSvgText(side.label, 22);
    labelLines.forEach(function (ln, li) {
      out += '<text x="' + (x + boxW / 2) + '" y="' + (boxY + 24 + li * 15) + '" text-anchor="middle" font-size="13" font-weight="700" fill="' + color + '">' + esc(ln) + '</text>';
    });
    var noteY = boxY + 24 + labelLines.length * 15 + 12;
    var noteLines = wrapSvgText(side.note || "", 30).slice(0, 5);
    noteLines.forEach(function (ln, li) {
      out += '<text x="' + (x + boxW / 2) + '" y="' + (noteY + li * 12) + '" text-anchor="middle" font-size="9.2" fill="currentColor" opacity="0.75">' + esc(ln) + '</text>';
    });
  });
  var cy = boxY + boxH / 2;
  out += '<circle cx="' + (w / 2) + '" cy="' + cy + '" r="19" fill="none" stroke="' + color + '" stroke-width="1.3"/>';
  out += '<text x="' + (w / 2) + '" y="' + (cy + 3.5) + '" text-anchor="middle" class="mono" font-size="9" fill="' + color + '" font-weight="600">' + esc((data.vs || "vs").toUpperCase()) + '</text>';
  out += '</svg>';
  return out;
}

function drawCycle(data, color, colorSoft) {
  var n = data.nodes.length;
  var w = 520, h = 220, cx = w / 2, cy = h / 2 + 4, r = 78, boxW = 118, boxH = 58;
  var out = svgOpen(w, h);
  var centers = [];
  for (var i = 0; i < n; i++) {
    var angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    centers.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  for (i = 0; i < n; i++) {
    var a = centers[i], b = centers[(i + 1) % n];
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len, ny = dx / len;
    var cxp = mx + nx * 16, cyp = my + ny * 16;
    out += '<path d="M' + a.x + ' ' + a.y + ' Q' + cxp + ' ' + cyp + ' ' + b.x + ' ' + b.y + '" fill="none" stroke="' + color + '" stroke-width="1.4" marker-end="url(#carrow-' + color.replace('#', '') + ')"/>';
  }
  out += '<defs><marker id="carrow-' + color.replace('#', '') + '" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="' + color + '"/></marker></defs>';
  centers.forEach(function (c, idx) {
    out += '<rect x="' + (c.x - boxW / 2) + '" y="' + (c.y - boxH / 2) + '" width="' + boxW + '" height="' + boxH + '" rx="6" fill="' + colorSoft + '" stroke="' + color + '" stroke-width="1.1"/>';
    var lines = wrapSvgText(data.nodes[idx].label, 17).slice(0, 3);
    var startY = c.y - (lines.length - 1) * 6.5;
    lines.forEach(function (ln, li) {
      out += '<text x="' + c.x + '" y="' + (startY + li * 13) + '" text-anchor="middle" font-size="10.5" font-weight="600" fill="' + color + '">' + esc(ln) + '</text>';
    });
  });
  out += '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" class="mono" font-size="8.5" fill="currentColor" opacity="0.5">LOOP</text>';
  out += '</svg>';
  return out;
}

function drawHub(data, color, colorSoft) {
  var spokes = data.spokes, n = spokes.length;
  var w = 520, h = 230, cx = w / 2, cy = h / 2 + 6, r = 92, boxW = 128, boxH = 56, centerR = 56;
  var out = svgOpen(w, h);
  var centers = [];
  for (var i = 0; i < n; i++) {
    var angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    centers.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  centers.forEach(function (c) {
    out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + c.x + '" y2="' + c.y + '" stroke="' + color + '" stroke-width="1" opacity="0.55"/>';
  });
  out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + centerR + '" fill="' + color + '" opacity="0.92"/>';
  var centerLines = wrapSvgText(data.center.label, 14).slice(0, 3);
  var cStartY = cy - (centerLines.length - 1) * 6.5;
  centerLines.forEach(function (ln, li) {
    out += '<text x="' + cx + '" y="' + (cStartY + li * 13) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--paper)">' + esc(ln) + '</text>';
  });
  centers.forEach(function (c, idx) {
    var s = spokes[idx];
    out += '<rect x="' + (c.x - boxW / 2) + '" y="' + (c.y - boxH / 2) + '" width="' + boxW + '" height="' + boxH + '" rx="5" fill="' + colorSoft + '" stroke="' + color + '" stroke-width="1"/>';
    var lines = wrapSvgText(s.label, 20).slice(0, 2);
    var startY = c.y - (lines.length > 1 ? 4 : -1);
    lines.forEach(function (ln, li) {
      out += '<text x="' + c.x + '" y="' + (startY + li * 12) + '" text-anchor="middle" font-size="9.6" font-weight="600" fill="' + color + '">' + esc(ln) + '</text>';
    });
    if (s.note) {
      var nl = wrapSvgText(s.note, 22).slice(0, 1);
      out += '<text x="' + c.x + '" y="' + (c.y + boxH / 2 - 6) + '" text-anchor="middle" font-size="7.6" fill="currentColor" opacity="0.68">' + esc(nl[0]) + '</text>';
    }
  });
  out += '</svg>';
  return out;
}

function drawCurve(data, color, colorSoft) {
  var w = 520, h = 210, padL = 46, padR = 20, padT = 20, padB = 40;
  var plotW = w - padL - padR, plotH = h - padT - padB;
  var out = svgOpen(w, h);
  out += '<rect x="' + padL + '" y="' + padT + '" width="' + plotW + '" height="' + plotH + '" fill="' + colorSoft + '" opacity="0.5"/>';
  out += '<line x1="' + padL + '" y1="' + (padT + plotH) + '" x2="' + (padL + plotW) + '" y2="' + (padT + plotH) + '" stroke="currentColor" stroke-width="1" opacity="0.4"/>';
  out += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + plotH) + '" stroke="currentColor" stroke-width="1" opacity="0.4"/>';
  var pts = data.points.map(function (p) { return { x: padL + (p.x / 100) * plotW, y: padT + plotH - (p.y / 100) * plotH, label: p.label }; });
  var path = "M" + pts[0].x + " " + pts[0].y;
  for (var i = 0; i < pts.length - 1; i++) {
    var p0 = pts[i], p1 = pts[i + 1];
    var mx = (p0.x + p1.x) / 2;
    path += " C" + mx + " " + p0.y + " " + mx + " " + p1.y + " " + p1.x + " " + p1.y;
  }
  out += '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2.2"/>';
  pts.forEach(function (p, idx) {
    out += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="' + color + '"/>';
    if (p.label) {
      var above = p.y - padT > 22;
      out += '<text x="' + p.x + '" y="' + (above ? p.y - 10 : p.y + 18) + '" text-anchor="' + (idx === 0 ? "start" : idx === pts.length - 1 ? "end" : "middle") + '" font-size="9" font-weight="600" fill="' + color + '">' + esc(p.label) + '</text>';
    }
  });
  out += '<text x="' + (padL + plotW / 2) + '" y="' + (h - 8) + '" text-anchor="middle" class="mono" font-size="9" fill="currentColor" opacity="0.6">' + esc(data.xLabel || "") + ' →</text>';
  out += '<text x="14" y="' + (padT + plotH / 2) + '" text-anchor="middle" class="mono" font-size="9" fill="currentColor" opacity="0.6" transform="rotate(-90 14 ' + (padT + plotH / 2) + ')">' + esc(data.yLabel || "") + ' →</text>';
  out += '</svg>';
  return out;
}

function drawCircles(data, color, colorSoft) {
  var rings = data.rings, n = rings.length;
  var w = 520, h = 230, cx = w * 0.32, cy = h / 2;
  var maxR = 92;
  var out = svgOpen(w, h);
  for (var i = n - 1; i >= 0; i--) {
    var r = maxR * ((i + 1) / n);
    var op = 0.35 + (n - i) * (0.5 / n);
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + color + '" opacity="' + (i === n - 1 ? 0.14 : op * 0.5) + '" stroke="' + color + '" stroke-width="1"/>';
  }
  var labelX = cx + maxR + 26;
  rings.forEach(function (ring, idx) {
    var ly = 30 + idx * ((h - 60) / (n - 1 || 1));
    var dotR = maxR * ((n - idx) / n) * 0.94;
    out += '<line x1="' + (cx + 4) + '" y1="' + (cy - dotR + (idx === n - 1 ? dotR * 0.3 : 6)) + '" x2="' + (labelX - 6) + '" y2="' + ly + '" stroke="' + color + '" stroke-width="0.8" opacity="0.55"/>';
    out += '<text x="' + labelX + '" y="' + (ly - 3) + '" font-size="11" font-weight="700" fill="' + color + '">' + esc(ring.label) + '</text>';
    var nl = wrapSvgText(ring.note || "", 34).slice(0, 2);
    nl.forEach(function (ln, li) {
      out += '<text x="' + labelX + '" y="' + (ly + 11 + li * 11) + '" font-size="8.8" fill="currentColor" opacity="0.72">' + esc(ln) + '</text>';
    });
  });
  out += '</svg>';
  return out;
}

function drawSpectrum(data, color, colorSoft) {
  var w = 520, h = 150, padX = 30, barY = 62, barH = 14;
  var barW = w - padX * 2;
  var out = svgOpen(w, h);
  var gid = "grad-" + color.replace('#', '');
  out += '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="' + colorSoft + '"/><stop offset="100%" stop-color="' + color + '"/></linearGradient></defs>';
  out += '<rect x="' + padX + '" y="' + barY + '" width="' + barW + '" height="' + barH + '" rx="7" fill="url(#' + gid + ')"/>';
  var mx = padX + barW * (data.marker / 100);
  out += '<line x1="' + mx + '" y1="' + (barY - 12) + '" x2="' + mx + '" y2="' + (barY + barH + 12) + '" stroke="' + color + '" stroke-width="2"/>';
  out += '<circle cx="' + mx + '" cy="' + (barY + barH / 2) + '" r="6" fill="var(--ink)" stroke="var(--paper)" stroke-width="2"/>';
  out += '<text x="' + padX + '" y="' + (barY - 20) + '" font-size="10.5" font-weight="700" fill="currentColor">' + esc(data.low) + '</text>';
  out += '<text x="' + (padX + barW) + '" y="' + (barY - 20) + '" text-anchor="end" font-size="10.5" font-weight="700" fill="' + color + '">' + esc(data.high) + '</text>';
  if (data.note) {
    var lines = wrapSvgText(data.note, 78);
    lines.forEach(function (ln, li) {
      out += '<text x="' + (w / 2) + '" y="' + (barY + barH + 34 + li * 13) + '" text-anchor="middle" font-size="9.4" fill="currentColor" opacity="0.75">' + esc(ln) + '</text>';
    });
  }
  out += '</svg>';
  return out;
}

function drawMatrix(data, color, colorSoft) {
  var w = 520, h = 210, cellW = 148, cellH = 66, ox = 150, oy = 40;
  var out = svgOpen(w, h);
  out += '<text x="' + (ox + cellW) + '" y="18" text-anchor="middle" class="mono" font-size="9" fill="currentColor" opacity="0.6">' + esc(data.xLabel) + '</text>';
  out += '<text x="26" y="' + (oy + cellH) + '" text-anchor="middle" class="mono" font-size="9" fill="currentColor" opacity="0.6" transform="rotate(-90 26 ' + (oy + cellH) + ')">' + esc(data.yLabel) + '</text>';
  data.cols.forEach(function (c, i) {
    out += '<text x="' + (ox + i * cellW + cellW / 2) + '" y="' + (oy - 8) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="' + color + '">' + esc(c) + '</text>';
  });
  data.rows.forEach(function (r, i) {
    out += '<text x="' + (ox - 10) + '" y="' + (oy + i * cellH + cellH / 2 + 4) + '" text-anchor="end" font-size="10.5" font-weight="700" fill="' + color + '">' + esc(r) + '</text>';
    data.cols.forEach(function (c, j) {
      var x = ox + j * cellW, y = oy + i * cellH;
      var isDiag = i === j;
      out += '<rect x="' + x + '" y="' + y + '" width="' + (cellW - 4) + '" height="' + (cellH - 4) + '" rx="4" fill="' + (isDiag ? colorSoft : "transparent") + '" stroke="' + color + '" stroke-width="1"/>';
      var lines = wrapSvgText(data.cells[i][j], 24).slice(0, 2);
      var sy = y + cellH / 2 - 4 - (lines.length - 1) * 6;
      lines.forEach(function (ln, li) {
        out += '<text x="' + (x + cellW / 2 - 2) + '" y="' + (sy + li * 12) + '" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.85">' + esc(ln) + '</text>';
      });
    });
  });
  out += '</svg>';
  return out;
}

export var SHAPE_LABEL = {
  steps: "Sequence", comparison: "Comparison", cycle: "Feedback loop", hub: "Hub & spokes",
  curve: "Curve", circles: "Concentric", spectrum: "Spectrum", matrix: "Payoff matrix",
};

export function renderAnatomy(anatomy, color, colorSoft) {
  switch (anatomy.type) {
    case "steps": return drawSteps(anatomy, color, colorSoft);
    case "comparison": return drawComparison(anatomy, color, colorSoft);
    case "cycle": return drawCycle(anatomy, color, colorSoft);
    case "hub": return drawHub(anatomy, color, colorSoft);
    case "curve": return drawCurve(anatomy, color, colorSoft);
    case "circles": return drawCircles(anatomy, color, colorSoft);
    case "spectrum": return drawSpectrum(anatomy, color, colorSoft);
    case "matrix": return drawMatrix(anatomy, color, colorSoft);
    default: return "";
  }
}
