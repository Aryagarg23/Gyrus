"""
Explanatory diagram of Gyrus's shipped routing architecture: how a browsing
signal turns into an intent, and how that intent picks a crew and a set of
assist actions.

This is a concept sketch, not a measurement -- there is no benchmark data
behind it, just the pipeline as built (see backend/src/fivedvector.py,
backend/tools/chaap_anonymize.py, backend/src/query_orch.py,
backend/MCP/newscrew_http.py, researchcrew.py).

Run: MPLCONFIGDIR=/home/arya/projects/hackathons/.mplcache \
     /home/arya/projects/hackathons/.venv/bin/python prototype/crew_routing.py
"""
import os

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

plt.style.use("/home/arya/projects/hackathons/.style/garg-paper.mplstyle")

FIGDIR = os.path.join(os.path.dirname(__file__), "figures")
os.makedirs(FIGDIR, exist_ok=True)

INK = "#282215"
EDGE = "#c6b99f"
TECH = "#3b42db"
WARN = "#e85b30"
SEC = "#c2491d"
PURP = "#6f2f96"


def box(ax, cx, cy, w, h, title, subtitle=None, edgecolor=INK, lw=1.4):
    rect = Rectangle((cx - w / 2, cy - h / 2), w, h,
                      facecolor="none", edgecolor=edgecolor, linewidth=lw,
                      zorder=3)
    ax.add_patch(rect)
    if subtitle:
        ax.text(cx, cy + h * 0.16, title, ha="center", va="center",
                 fontsize=10, fontweight="medium", color=INK, zorder=4)
        ax.text(cx, cy - h * 0.28, subtitle, ha="center", va="center",
                 fontsize=8, color=INK, zorder=4, wrap=True)
    else:
        ax.text(cx, cy, title, ha="center", va="center", fontsize=10,
                 fontweight="medium", color=INK, zorder=4)
    return (cx, cy - h / 2), (cx, cy + h / 2)


def arrow(ax, xy_from, xy_to, color=INK, lw=1.4):
    ax.annotate("", xy=xy_to, xytext=xy_from,
                arrowprops=dict(arrowstyle="->", color=color, linewidth=lw,
                                shrinkA=2, shrinkB=2), zorder=2)


def main():
    fig, ax = plt.subplots(figsize=(8.5, 12))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 15.5)
    ax.axis("off")

    ax.set_title(
        "Gyrus routing: from a browsing signal to an assist action",
        fontsize=13, loc="left", pad=14)
    ax.text(0.0, 15.05, "concept sketch of the shipped architecture",
            fontsize=9, color=WARN, style="italic")

    # 1. signals
    bottom1, top1 = box(ax, 5, 14.0, 8.6, 1.1,
                         "browsing signals",
                         "history  ·  current tabs  ·  queries",
                         edgecolor=INK)

    # 2. PII obfuscation layer
    bottom2, top2 = box(ax, 5, 12.2, 6.4, 1.1,
                         "PII obfuscation layer (CHAAP)",
                         "strips emails, phone, SSN, card numbers, names",
                         edgecolor=WARN)
    arrow(ax, bottom1, top2)

    # 3a/3b. memory graph + intent classifier, parallel
    bottom3a, top3a = box(ax, 2.6, 10.2, 4.0, 1.3,
                           "Neo4j memory graph",
                           "Concept / Query / Link\nnodes, SEARCHED_BY edges",
                           edgecolor=PURP)
    bottom3b, top3b = box(ax, 7.4, 10.2, 4.0, 1.3,
                           "zero-shot intent classifier",
                           "DeBERTa, 4 hypothesis\ntemplates ensembled",
                           edgecolor=SEC)
    arrow(ax, bottom2, top3a)
    arrow(ax, bottom2, top3b)

    # 4. intent
    bottom4, top4 = box(ax, 5, 8.2, 8.6, 1.1,
                         "intent",
                         "research  ·  study  ·  shop  ·  doomscroll",
                         edgecolor=TECH)
    arrow(ax, bottom3a, (5 - 8.6 / 2 + 1.4, top4[1]), color=PURP)
    arrow(ax, bottom3b, (5 + 8.6 / 2 - 1.4, top4[1]), color=SEC)

    # 5. crew
    bottom5, top5 = box(ax, 5, 6.3, 6.0, 1.0,
                         "matching crew of agents",
                         "CrewAI, tracked with Weave",
                         edgecolor=TECH)
    arrow(ax, bottom4, top5)

    # 6. sources
    bottom6, top6 = box(ax, 5, 4.5, 8.6, 1.1,
                         "sources",
                         "arXiv  ·  Semantic Scholar  ·  Exa  ·  GDELT  ·  NewsAPI",
                         edgecolor=INK)
    arrow(ax, bottom5, top6)

    # 7. assist actions
    bottom7, top7 = box(ax, 5, 2.6, 8.6, 1.3,
                         "assist actions",
                         "surface papers  ·  quiz  ·  block-the-feed nudge",
                         edgecolor=TECH)
    arrow(ax, bottom6, top7)

    ax.text(5, 0.9,
            "Everything outside \"research\" / \"news\" intents passes through\n"
            "without a crew call -- the crew step only fires when it's warranted.",
            ha="center", va="center", fontsize=8.5, color=INK, style="italic")

    out_path = os.path.join(FIGDIR, "crew_routing.png")
    fig.savefig(out_path, dpi=200)
    plt.close(fig)
    print(f"wrote {out_path}")


if __name__ == "__main__":
    main()
