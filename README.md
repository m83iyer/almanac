# Almanac

An evolving personal library: mental models, historical acts and policies,
and — over time — more sections. Each entry gets a plain-English hook, a
diagram of how it actually works, and real (fact-checked) aftermath notes,
with one-click PDF export.

Every section carries its own visual identity — type, palette, corner
language all change with the active section — while sharing the same
underlying interaction model (filter, search, detail sheet, export).

## Structure

- `app/` — the static site: `index.html`, `styles.css`, `app.js`, plus:
  - `diagrams.js` — the shared 8-archetype SVG diagram engine
  - `pdf.js` — dependency-free single-page PDF export (canvas → JPEG →
    hand-assembled PDF byte stream, no library)
  - `data/*.json` — one file per section (`{genres, entries}`); this is
    what grows over time as new entries get added
  - `vendor/html2canvas.min.js` — vendored locally, no CDN dependency
- `native/Almanac/` — a thin SwiftPM (`NSWindow` + `WKWebView`) macOS
  wrapper that loads the hosted site, following the same pattern as this
  machine's other personal apps (Bookworm, Moneta)
- `scripts/` — data extraction/validation (`extract-data.mjs`,
  `validate-data.mjs`) and icon generation

## Hosting

Static site served from `app/` via GitHub Pages
(`.github/workflows/deploy-pages.yml`, deploys on push to `main`). The
native Mac app is just a window pointed at the same hosted URL — no local
server, no LaunchAgent, works identically on Mac and iPhone (Safari, or
"Add to Home Screen" via the manifest).

## Adding content

Add an entry to the relevant `app/data/*.json` file (or a new section's
JSON file) following the existing entry shape — `id`, `genre`, `name`,
`hook`, `def`, `anatomy` (one of the 8 diagram archetypes), `notes`. Run
`node scripts/validate-data.mjs` before pushing; CI runs the same check.

## Packaging the Mac app

```
native/Almanac/scripts/package_app.sh
```

Builds via `swift build -c release`, generates the `.icns` from
`app/assets/icon-1024.png`, ad-hoc codesigns, and installs to
`/Applications/Almanac.app`.
