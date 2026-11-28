"""Draw the released announcement result using saved data, without model calls."""
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
d = json.loads((ROOT / "studies/announcement_screen/summary.json").read_text())
plt.rcParams.update({"font.family": "serif", "font.size": 12, "svg.fonttype": "none"})
fig, axes = plt.subplots(1, 2, figsize=(13.6, 6.5), gridspec_kw={"width_ratios": [1, 1.25]})
fig.patch.set_facecolor("white")
colors = ["#8b959a", "#1597ce", "#ba6d45"]
means = [d["arm_means"][a] for a in ("H", "SHADOW", "LIVE")]
ax = axes[0]
ax.bar([0, 1, 2], means, color=colors, width=.55)
for i, value in enumerate(means):
    ax.text(i, value + 7, f"{value:.2f}", ha="center", fontsize=13)
ax.set(xticks=[0, 1, 2], xticklabels=["H", "SHADOW", "LIVE"], ylim=(0, 390), ylabel="Mean group net earnings, rounds 1 to 3")
ax.set_title("Cooperation before any punishment", loc="left", pad=24)
ax = axes[1]
for y, name, color in [(1, "SHADOW-H", colors[1]), (0, "LIVE-SHADOW", colors[2])]:
    c = d["contrasts"][name]
    lo, hi = c["confidence_interval"]
    ax.errorbar(c["mean"], y, xerr=[[c["mean"] - lo], [hi - c["mean"]]], fmt="o", color=color, capsize=6, markersize=8, linewidth=2)
    ax.text(c["mean"], y + .17, f"{c['mean']:+.2f}  [{lo:.2f}, {hi:.2f}]", ha="center", fontsize=12)
ax.axvline(0, color="#899094", linewidth=1, linestyle=":")
ax.set(yticks=[0, 1], yticklabels=["LIVE minus SHADOW", "SHADOW minus H"], ylim=(-.45, 1.5), xlim=(-90, 45), xlabel="Within-block earnings difference, tokens")
ax.set_title("Pre-specified 98.75% intervals", loc="left", pad=24)
for ax in axes:
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color("#a6adb0")
    ax.tick_params(length=3, color="#a6adb0")
    ax.set_axisbelow(True)
fig.text(.07, .08, "60 randomized blocks, 180 fresh openings. All observed rounds had punishment OFF.", fontsize=12)
fig.text(.07, .04, "SHADOW and LIVE describe the same monitor. Their announced future punishment control differs.", fontsize=11, color="#52595c")
fig.subplots_adjust(left=.07, right=.97, top=.84, bottom=.24, wspace=.62)
out = ROOT / "figures"
for suffix in ("svg", "png"):
    fig.savefig(out / ("announcement_comparison." + suffix), dpi=120)
