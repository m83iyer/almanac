#!/usr/bin/env python3
"""Drive app/audit.html across engines/widths/themes and report violations.

Usage: python3 scripts/run_audit.py [--serve-port 8793]
"""
import argparse
import http.server
import json
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

APP_DIR = Path(__file__).resolve().parent.parent / "app"
WIDTHS = [(375, 800, "mobile-375"), (900, 900, "native-900"), (1280, 900, "wide-1280")]
THEMES = ["light", "dark"]
ENGINES = ["chromium", "webkit"]


def start_server(port):
    handler = lambda *a, **kw: http.server.SimpleHTTPRequestHandler(*a, directory=str(APP_DIR), **kw)
    httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def run(port):
    base = f"http://127.0.0.1:{port}/audit.html"
    all_results = []
    with sync_playwright() as p:
        for engine_name in ENGINES:
            engine = getattr(p, engine_name)
            browser = engine.launch()
            for width, height, width_label in WIDTHS:
                page = browser.new_page(viewport={"width": width, "height": height})
                page.goto(base)
                page.wait_for_function("window.runAudit !== undefined")
                for theme in THEMES:
                    result = page.evaluate("(opts) => window.runAudit(opts)", {"theme": theme})
                    result["engine"] = engine_name
                    result["widthLabel"] = width_label
                    all_results.append(result)
                    tag = f"{engine_name:9s} {width_label:12s} {theme:5s}"
                    print(f"{tag}  total={result['total']:3d}  failing={result['failing']:3d}")
                page.close()
            browser.close()
    return all_results


def summarize(all_results):
    print("\n" + "=" * 70)
    total_runs = len(all_results)
    total_failing_instances = sum(r["failing"] for r in all_results)
    print(f"Runs: {total_runs}  |  Total (entry x run) failures: {total_failing_instances}")

    by_entry = {}
    kind_counts = {}
    for r in all_results:
        for v in r["violations"]:
            key = (v["section"], v["id"])
            by_entry.setdefault(key, set())
            for issue in v["violations"]:
                kind_counts[issue["kind"]] = kind_counts.get(issue["kind"], 0) + 1
                by_entry[key].add(issue["kind"] + "::" + json.dumps(issue.get("detail", "")))

    print(f"\nDistinct entries with at least one violation (any run): {len(by_entry)}")
    print("\nViolation kind counts (across all engine/width/theme runs):")
    for kind, count in sorted(kind_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {kind:24s} {count}")

    print("\nWorst entries (most distinct violation signatures):")
    worst = sorted(by_entry.items(), key=lambda kv: -len(kv[1]))[:15]
    for (section, eid), sigs in worst:
        print(f"  {section:10s} {eid:28s} {len(sigs)} distinct issues")

    return {"kind_counts": kind_counts, "distinct_failing_entries": len(by_entry), "worst": [{"section": s, "id": i, "count": len(sig)} for (s, i), sig in worst]}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--serve-port", type=int, default=8793)
    ap.add_argument("--out", default=None, help="write full JSON results here")
    args = ap.parse_args()

    httpd = start_server(args.serve_port)
    try:
        all_results = run(args.serve_port)
    finally:
        httpd.shutdown()

    summary = summarize(all_results)

    if args.out:
        Path(args.out).write_text(json.dumps({"summary": summary, "runs": all_results}, indent=2))
        print(f"\nFull results: {args.out}")

    sys.exit(0 if summary["distinct_failing_entries"] == 0 else 1)
