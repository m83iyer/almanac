// Shared diagram-shape rendering engine — HTML-first.
//
// Text and boxes are real HTML (CSS grid/flex): content-sized, wraps
// naturally, cannot silently overflow or truncate. SVG is used only for
// genuinely vector marks with no text inside them — the curve's plotted
// line, the concentric rings — so nothing here scales fonts against a
// viewBox. Point/ring labels for those two are positioned HTML overlays.
//
// (Replaced an earlier character-count SVG text-wrapping version that
// measured 102/200 entries failing basic containment — see the 2026-09-07
// goldpass. Every render here is a `<div class="diagram diagram-<type>">`
// so `styles.css` owns all sizing; nothing in this file hardcodes a pixel
// box for text to fit into.)

export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

function wrap(type, color, colorSoft, inner) {
  return '<div class="diagram diagram-' + type + '" style="--dcolor:' + color + ';--dcolor-soft:' + colorSoft + '">' + inner + '</div>';
}

function drawSteps(data) {
  var cards = data.nodes.map(function (node, i) {
    return '<div class="d-step">' +
      '<div class="d-step-label mono">STEP ' + (i + 1) + '</div>' +
      '<div class="d-step-title">' + esc(node.label) + '</div>' +
      (node.note ? '<div class="d-step-note">' + esc(node.note) + '</div>' : '') +
      '</div>';
  }).join('<div class="d-step-arrow" aria-hidden="true">&rarr;</div>');
  return '<div class="d-steps-row">' + cards + '</div>' +
    '<div class="d-caption mono">SEQUENCE &middot; IN ORDER</div>';
}

function drawComparison(data) {
  var sides = ["left", "right"].map(function (key) {
    var side = data[key];
    return '<div class="d-compare-box">' +
      '<div class="d-compare-label">' + esc(side.label) + '</div>' +
      (side.note ? '<div class="d-compare-note">' + esc(side.note) + '</div>' : '') +
      '</div>';
  }).join("");
  return '<div class="d-compare-row">' + sides + '</div>' +
    '<div class="d-compare-vs mono"><span>' + esc((data.vs || "vs").toUpperCase()) + '</span></div>';
}

function drawCycle(data) {
  var nodes = data.nodes.map(function (node, i) {
    return '<div class="d-cycle-node">' +
      '<div class="d-cycle-index mono">' + (i + 1) + '</div>' +
      '<div class="d-cycle-title">' + esc(node.label) + '</div>' +
      '</div>';
  }).join("");
  return '<div class="d-cycle-grid">' + nodes + '</div>' +
    '<div class="d-caption mono">LOOP &middot; LAST FEEDS BACK INTO FIRST &#8635;</div>';
}

function drawHub(data) {
  var spokes = data.spokes.map(function (s) {
    return '<div class="d-spoke">' +
      '<div class="d-spoke-label">' + esc(s.label) + '</div>' +
      (s.note ? '<div class="d-spoke-note">' + esc(s.note) + '</div>' : '') +
      '</div>';
  }).join("");
  return '<div class="d-hub-center">' + esc(data.center.label) + '</div>' +
    '<div class="d-hub-spokes">' + spokes + '</div>';
}

function drawCurve(data) {
  var pts = data.points;
  var path = "M" + pts[0].x + " " + (100 - pts[0].y);
  for (var i = 0; i < pts.length - 1; i++) {
    var p0 = pts[i], p1 = pts[i + 1];
    var mx = (p0.x + p1.x) / 2;
    path += " C" + mx + " " + (100 - p0.y) + " " + mx + " " + (100 - p1.y) + " " + p1.x + " " + (100 - p1.y);
  }
  var dots = pts.map(function (p) {
    return '<circle cx="' + p.x + '" cy="' + (100 - p.y) + '" r="1.7" fill="var(--dcolor)"/>';
  }).join("");
  var svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="d-curve-svg" xmlns="http://www.w3.org/2000/svg">' +
    '<line x1="0" y1="100" x2="100" y2="100" class="d-curve-axisline"/>' +
    '<line x1="0" y1="0" x2="0" y2="100" class="d-curve-axisline"/>' +
    '<path d="' + path + '" fill="none" stroke="var(--dcolor)" stroke-width="1.1"/>' +
    dots +
    '</svg>';
  var labels = pts.map(function (p, idx) {
    if (!p.label) return "";
    var vAlign = p.y > 82 ? "below" : "above";
    var hAlign = idx === 0 ? "start" : (idx === pts.length - 1 ? "end" : "center");
    return '<span class="d-curve-label d-curve-label-' + vAlign + ' d-curve-label-' + hAlign + '" style="left:' + p.x + '%; top:' + (100 - p.y) + '%">' + esc(p.label) + '</span>';
  }).join("");
  return '<div class="d-curve-plot">' + svg + labels + '</div>' +
    '<div class="d-curve-axes">' +
      (data.yLabel ? '<div class="d-curve-axis-y mono">' + esc(data.yLabel) + '</div>' : '<div></div>') +
      '<div class="d-curve-axis-x mono">' + esc(data.xLabel || "") + '</div>' +
    '</div>';
}

function drawCircles(data) {
  var rings = data.rings, n = rings.length;
  var svgRings = rings.map(function (ring, i) {
    var r = 42 * ((i + 1) / n);
    return '<circle cx="50" cy="50" r="' + r + '" fill="var(--dcolor)" fill-opacity="' + (0.1 + (n - i) * (0.22 / n)) + '" stroke="var(--dcolor)" stroke-width="0.7"/>';
  }).join("");
  var svg = '<svg viewBox="0 0 100 100" class="d-circles-svg" xmlns="http://www.w3.org/2000/svg">' + svgRings + '</svg>';
  var legend = rings.map(function (ring, i) {
    return '<div class="d-circle-legend-item">' +
      '<span class="d-circle-swatch" style="opacity:' + (0.35 + (n - i) * (0.5 / n)) + '"></span>' +
      '<div><div class="d-circle-legend-label">' + esc(ring.label) + '</div>' +
      (ring.note ? '<div class="d-circle-legend-note">' + esc(ring.note) + '</div>' : '') + '</div>' +
      '</div>';
  }).join("");
  return '<div class="d-circles-row">' +
    '<div class="d-circles-visual">' + svg + '</div>' +
    '<div class="d-circles-legend">' + legend + '</div>' +
    '</div>';
}

function drawSpectrum(data) {
  var marker = Math.max(0, Math.min(100, Number(data.marker) || 0));
  return '<div class="d-spectrum-ends">' +
    '<span class="d-spectrum-low">' + esc(data.low) + '</span>' +
    '<span class="d-spectrum-high">' + esc(data.high) + '</span>' +
    '</div>' +
    '<div class="d-spectrum-track"><div class="d-spectrum-marker" style="left:' + marker + '%"></div></div>' +
    (data.note ? '<div class="d-spectrum-note">' + esc(data.note) + '</div>' : '');
}

function drawMatrix(data) {
  var headerCells = data.cols.map(function (c) { return '<div class="d-matrix-colhead">' + esc(c) + '</div>'; }).join("");
  var bodyRows = data.rows.map(function (r, i) {
    var rowCells = data.cols.map(function (c, j) {
      return '<div class="d-matrix-cell' + (i === j ? ' d-matrix-cell-diag' : '') + '">' + esc(data.cells[i][j]) + '</div>';
    }).join("");
    return '<div class="d-matrix-rowhead">' + esc(r) + '</div>' + rowCells;
  }).join("");
  return '<div class="d-matrix-wrap">' +
    (data.yLabel ? '<div class="d-matrix-axis-y mono">' + esc(data.yLabel) + '</div>' : '') +
    '<div class="d-matrix-body">' +
      (data.xLabel ? '<div class="d-matrix-axis-x mono">' + esc(data.xLabel) + '</div>' : '') +
      '<div class="d-matrix-grid" style="grid-template-columns: minmax(64px, auto) repeat(' + data.cols.length + ', minmax(90px, 1fr))">' +
        '<div></div>' + headerCells + bodyRows +
      '</div>' +
    '</div>' +
    '</div>';
}

export var SHAPE_LABEL = {
  steps: "Sequence", comparison: "Comparison", cycle: "Feedback loop", hub: "Hub & spokes",
  curve: "Curve", circles: "Concentric", spectrum: "Spectrum", matrix: "Payoff matrix",
};

var RENDERERS = {
  steps: drawSteps, comparison: drawComparison, cycle: drawCycle, hub: drawHub,
  curve: drawCurve, circles: drawCircles, spectrum: drawSpectrum, matrix: drawMatrix,
};

export function renderAnatomy(anatomy, color, colorSoft) {
  var renderer = RENDERERS[anatomy.type];
  if (!renderer) return "";
  return wrap(anatomy.type, color, colorSoft, renderer(anatomy));
}
