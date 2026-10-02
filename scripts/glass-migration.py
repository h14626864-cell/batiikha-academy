#!/usr/bin/env python3
"""Glass design migration: rounded + glass + color cleanup across all views."""
import os, re, sys

ROOT = "/home/z/my-project/src/components"
# files already hand-edited (glass primitives) — skip entirely
SKIP = {
    "ui/card.tsx", "ui/button.tsx", "ui/input.tsx", "ui/textarea.tsx",
    "ui/badge.tsx", "ui/select.tsx", "ui/dialog.tsx", "ui/tabs.tsx",
}

# ordered replacements (substring-based, applied in order)
UI_RULES = [  # safe subset for remaining ui primitives
    ("rounded-md", "rounded-lg"),
    ("border-slate-200", "border-white/70"),
    ("border-slate-100", "border-white/60"),
]
VIEW_RULES = [
    # buttons first (pair with hover)
    ("bg-teal-600 hover:bg-teal-700", "bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 shadow-lg shadow-teal-500/25"),
    ("hover:bg-teal-700", "hover:brightness-110"),
    # shells / big surfaces -> transparent so aurora shows
    ("min-h-screen flex flex-col bg-slate-50", "min-h-screen flex flex-col"),
    ("min-h-screen flex flex-col bg-white", "min-h-screen flex flex-col"),
    ("min-h-screen bg-slate-50", "min-h-screen"),
    ("min-h-screen bg-white", "min-h-screen"),
    # headers / navs
    ("bg-white/90 backdrop-blur border-b border-slate-200", "glass-nav"),
    ("bg-white/85 backdrop-blur-md border-b border-slate-100", "glass-nav"),
    ("sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-200", "sticky top-0 z-40 glass-nav"),
    ("border-b border-slate-200 bg-white", "glass-nav"),
    ("border-t border-slate-200 bg-white", "glass-soft border-t border-white/60"),
    ("border-t border-slate-100 bg-white", "glass-soft border-t border-white/60"),
    ("border-b border-slate-100 bg-white", "glass-nav"),
    # sidebars & panels
    ("border-l border-slate-200 bg-white", "border-l border-white/60 bg-white/45 backdrop-blur-2xl"),
    ("bg-white p-4 overflow-y-auto", "glass-strong p-4 overflow-y-auto"),
    ("bg-white p-4 sticky", "bg-white/45 backdrop-blur-2xl border-l border-white/60 p-4 sticky"),
    ("bg-slate-900 text-white", "glass-strong text-slate-800"),
    ("bg-slate-800 text-white", "glass-strong text-slate-800"),
    # cards & boxes
    ("bg-white border border-slate-200", "glass-strong"),
    ("border border-slate-200 bg-white", "glass-strong"),
    ("border border-slate-100 bg-white", "glass"),
    ("bg-white rounded-2xl shadow", "glass rounded-2xl shadow"),
    ("bg-white shadow", "glass shadow"),
    # generic chips / fills
    ("bg-slate-50", "bg-white/50"),
    ("bg-slate-100", "bg-white/60"),
    ("bg-slate-200", "bg-white/80"),
    ("hover:bg-slate-50", "hover:bg-white/70"),
    ("hover:bg-slate-100", "hover:bg-white/80"),
    # teal tints -> translucent glassy tints
    ("bg-teal-50", "bg-teal-500/10"),
    ("hover:bg-teal-50", "hover:bg-teal-500/10"),
    ("bg-teal-100", "bg-teal-500/15"),
    ("border-teal-100", "border-teal-500/20"),
    ("border-teal-200", "border-teal-500/25"),
    ("border-teal-300", "border-teal-500/30"),
    # teal solid chips -> gradient chips
    ("bg-teal-600", "bg-gradient-to-br from-teal-500 to-emerald-600"),
    ("bg-teal-700", "bg-gradient-to-br from-teal-600 to-emerald-700"),
    ("hover:border-teal-300", "hover:border-teal-400/50"),
    # borders + dividers
    ("border-slate-300", "border-white/80"),
    ("border-slate-200", "border-white/70"),
    ("border-slate-100", "border-white/60"),
    ("divide-slate-200", "divide-white/70"),
    ("divide-slate-100", "divide-white/60"),
    # radius bump (largest first to avoid double-bump)
    ("rounded-2xl", "rounded-3xl"),
    ("rounded-xl", "rounded-2xl"),
    ("rounded-lg", "rounded-xl"),
    ("rounded-md", "rounded-lg"),
]

def rules_for(rel):
    return UI_RULES if rel.startswith("ui/") else VIEW_RULES

changed = 0
for dirpath, _dirs, files in os.walk(ROOT):
    for fn in files:
        if not fn.endswith(".tsx"):
            continue
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, ROOT)
        if rel in SKIP:
            continue
        with open(full, encoding="utf-8") as f:
            src = f.read()
        out = src
        for old, new in rules_for(rel):
            out = out.replace(old, new)
        if out != src:
            with open(full, "w", encoding="utf-8") as f:
                f.write(out)
            changed += 1
            print("migrated:", rel)
print(f"\n{changed} files migrated")
