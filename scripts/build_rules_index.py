#!/usr/bin/env python3
"""Build a consolidated rules index from rules/ for the marketplace page.

Reads YARA JSON packs and Sigma YAML rules, outputs site/rules-index.json
consumed by site/rules.html at runtime.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    import yaml  # type: ignore
except ImportError:
    yaml = None

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "rules-index.json"


def load_yara_pack(path: Path, pack: str) -> list[dict]:
    out: list[dict] = []
    for entry in json.loads(path.read_text()):
        meta = entry.get("meta", {}) or {}
        out.append({
            "kind": "yara",
            "pack": pack,
            "name": entry.get("name", "?"),
            "description": meta.get("description", ""),
            "severity": meta.get("severity", "medium"),
            "mitre": list(meta.get("mitre_ids") or []),
            "author": meta.get("author", ""),
            "created": meta.get("created", ""),
            "enabled": bool(entry.get("enabled", True)),
        })
    return out


def load_sigma_rules(path: Path) -> list[dict]:
    if yaml is None:
        return []
    try:
        docs = list(yaml.safe_load_all(path.read_text()))
    except yaml.YAMLError:
        return []
    out: list[dict] = []
    for doc in docs:
        if not isinstance(doc, dict):
            continue
        tags = doc.get("tags") or []
        mitre = [t.split(".", 1)[1].upper() for t in tags if isinstance(t, str) and t.startswith("attack.t")]
        out.append({
            "kind": "sigma",
            "pack": path.stem,
            "name": doc.get("title", path.stem),
            "description": doc.get("description", "") or "",
            "severity": doc.get("level", "medium"),
            "mitre": mitre,
            "author": doc.get("author", "") or "",
            "created": doc.get("date", "") or "",
            "enabled": True,
        })
    return out


def main() -> int:
    rules: list[dict] = []

    for pack_file in sorted((ROOT / "rules" / "yara").glob("*.json")):
        rules.extend(load_yara_pack(pack_file, pack_file.stem))

    for sigma_file in sorted((ROOT / "rules" / "sigma").glob("*.yml")):
        rules.extend(load_sigma_rules(sigma_file))
    for sigma_file in sorted((ROOT / "rules" / "sigma").glob("*.yaml")):
        rules.extend(load_sigma_rules(sigma_file))

    # Stable ordering
    rules.sort(key=lambda r: (r["kind"], r["pack"], r["name"]))

    counts = {
        "total": len(rules),
        "yara": sum(1 for r in rules if r["kind"] == "yara"),
        "sigma": sum(1 for r in rules if r["kind"] == "sigma"),
        "packs": sorted({r["pack"] for r in rules}),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"meta": counts, "rules": rules}, indent=2, ensure_ascii=False))
    print(f"wrote {OUT} — {counts['total']} rules ({counts['yara']} YARA, {counts['sigma']} Sigma)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
