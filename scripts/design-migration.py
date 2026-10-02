#!/usr/bin/env python3
"""بطيخه design migration: strip AI-look tokens → professional brand system."""
import re, pathlib

ROOT = pathlib.Path("/home/z/my-project/src")

# ordered (literal, before regex passes)
LITERAL = [
    # emojis in copy
    (" مبروك! شهادتك جاهزة 🎉", "شهادتك جاهزة"),
    ("ناجح — مبروك! 🎉", "ناجح — مبروك"),
    ("🎉", ""), ("👋", ""), ("🚀", ""), ("🛡️", ""), ("👇", ""), ("🎓 ", ""), ("🎓", ""), ("✨ ", ""), ("✨", ""), ("⚠️ ", ""), ("⚠️", ""),
    # weights: plex arabic caps at 700
    ("font-extrabold", "font-bold"),
    ("font-black", "font-bold"),
    # radii: max 10px
    ("rounded-3xl", "rounded-xl"),
    ("rounded-2xl", "rounded-lg"),
    # shadows: flat
    ("shadow-xl", "shadow-sm"),
    ("shadow-lg", "shadow-sm"),
    ("shadow-md", "shadow-xs"),
    # brand panel
    ("hero-gradient", "panel-dark"),
    # blur stacks (AI tell)
    (" backdrop-blur-md", ""), (" backdrop-blur-lg", ""), (" backdrop-blur-sm", ""),
    ("backdrop-blur-md ", ""), ("backdrop-blur-lg ", ""), ("backdrop-blur-sm ", ""),
    (" backdrop-blur", ""), ("backdrop-blur ", ""),
]

TEAL = {"50":"brand-50","100":"brand-100","200":"brand-200","300":"brand-300","400":"brand-500",
        "500":"brand-600","600":"brand-700","700":"brand-800","800":"brand-900","900":"brand-950","950":"brand-950"}
AMBER = {"50":"gold-50","100":"gold-100","200":"gold-200","300":"gold-300","400":"gold-400",
         "500":"gold-500","600":"gold-600","700":"gold-700","800":"gold-800","900":"gold-900","950":"gold-900"}
SLATE_PRE = [  # ordered
    ("bg-slate-50", "bg-paper"),
    ("bg-slate-100", "bg-paper"),
    ("border-slate-100", "border-line"),
    ("border-slate-200", "border-line"),
    ("text-slate-900", "text-ink"),
    ("text-slate-800", "text-ink"),
    ("bg-slate-900", "bg-ink"),
    ("bg-slate-800", "bg-ink"),
]

def color_map(text, mapping, name):
    def rep(m):
        step = m.group(2)
        return f"{m.group(1)}{mapping.get(step, name + '-' + step)}"
    return re.sub(r"([a-z-]:" if False else rf"((?:[a-z-]+)?){name}-(\d{{2,3}})", rep, text)

changed = []
for p in sorted(ROOT.rglob("*.tsx")):
    t = orig = p.read_text()
    for a, b in LITERAL:
        t = t.replace(a, b)
    # colored shadows out
    t = re.sub(r"(?<=\s)shadow-(?:teal|slate|amber)-\d+(?:/\d+)?\s*", " ", t)
    t = t.replace("shadow-teal-600/20", "").replace("shadow-teal-600/25", "")
    # teal scale (also inside gradient stops from-teal-600 etc.)
    t = color_map(t, TEAL, "teal")
    # amber → gold
    t = color_map(t, AMBER, "amber")
    # slate pre-maps
    for a, b in SLATE_PRE:
        t = t.replace(a, b)
    # remaining slate → stone 1:1
    t = re.sub(r"slate-(\d{2,3})", r"stone-\1", t)
    # cleanup doubled spaces introduced by removals
    t = re.sub(r'className="([^"]*)"', lambda m: 'className="' + re.sub(r"\s{2,}", " ", m.group(1)) + '"', t)
    if t != orig:
        p.write_text(t)
        changed.append(str(p.relative_to(ROOT)))

print(f"migrated {len(changed)} files")
for f in changed:
    print(" -", f)
