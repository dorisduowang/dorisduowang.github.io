#!/usr/bin/env python3
"""Verify the 60-block announcement study from released scientific data only."""
import json
import math
from itertools import product
from pathlib import Path
from statistics import mean, stdev

HERE = Path(__file__).resolve().parent
ARMS = ("H", "SHADOW", "LIVE")
CRITICAL = 2.576587568681405


def load(name):
    return json.loads((HERE / name).read_text())


def near(a, b):
    assert abs(a - b) < 1e-8, (a, b)


def contrast(values):
    assert len(values) == 60
    m = mean(values)
    half = CRITICAL * stdev(values) / math.sqrt(60)
    return {"mean": m, "confidence_interval": [m - half, m + half], "confidence_level": .9875}


def position(i1, i2):
    total = [i1[0] + i2[0], i1[1] + i2[1]]
    if total[0] <= 0 <= total[1]:
        return "endpoint_separation_unresolved", None
    corners = [a / (a + b) for a, b in product(i1, i2)]
    lo, hi = min(corners), max(corners)
    if hi < 0 or lo > 1:
        tag = "outside_H_LIVE_endpoints"
    elif hi < .5:
        tag = "relatively_closer_to_H"
    elif lo > .5:
        tag = "relatively_closer_to_LIVE"
    elif 0 < lo and hi < 1:
        tag = "between_endpoints_no_unique_closer_endpoint"
    else:
        tag = "relative_position_unresolved"
    return tag, [lo, hi]


def reproduce():
    data, design, saved = load("data.json"), load("design.json"), load("summary.json")
    assert data["software_fixture"] is False
    assigned = {g["group_id"]: g for g in design["groups"]}
    assert set(assigned) == set(data["games"]) and len(assigned) == 180
    assert design["announced_horizon"] == 15 and design["collected_rounds"] == 3
    blocks, rows = {}, []
    for gid, game in data["games"].items():
        for key in ("group_id", "block_id", "slot_id", "arm", "institution"):
            assert game[key] == assigned[gid][key]
        assert game["status"] == "opening_checkpoint_complete"
        assert game["completed_rounds"] == 3 and len(game["rounds"]) == 3
        assert game["round4_generated"] is False and game["announced_horizon"] == 15
        cumulative = [0] * 4
        total = 0
        checks = {x["round"]: x for x in game["policy_checks"]}
        assert set(checks) == {1, 2, 3}
        for t, record in enumerate(game["rounds"], 1):
            assert record["round"] == t
            c = record["contributions"]
            assert len(c) == 4 and all(type(x) is int and 0 <= x <= 20 for x in c)
            assert set(record["messages"]) == {"P1", "P2", "P3", "P4"}
            ledger = record["ledger"]
            expected = [200 - 10 * x + 4 * sum(c) for x in c]
            assert ledger["contributions"] == c and ledger["punishment_active"] is False
            assert ledger["total_contribution"] == sum(c)
            for name in ("sanction_levels", "sender_costs", "recipient_fines"):
                assert ledger[name] == [0] * 4
            assert ledger["group_enforcement_cost"] == 0
            for name in ("base_payoffs", "net_payoffs"):
                for actual, wanted in zip(ledger[name], expected):
                    near(actual, wanted / 10)
            near(ledger["group_net_payoff"], sum(expected) / 10)
            total += sum(expected)
            cumulative = [x + y for x, y in zip(cumulative, expected)]
            for actual, wanted in zip(record["cumulative_net_earnings"], cumulative):
                near(actual, wanted / 10)
            e = checks[t]
            h = min(c) <= 7
            assert e["history_warning"] == h and e["eligible"] == (t == 3)
            scores = e["message_scores"]
            if game["arm"] != "H" and t >= 2:
                assert len(scores) == 4 and all(math.isfinite(x) and x >= 0 for x in scores)
                warning = max(scores) > data["threshold"]
                near(e["language_score"], max(scores))
                assert e["language_warning"] == warning
            else:
                assert scores is None and e["language_warning"] is None
                warning = False
            nxt = t == 3 and (h or (game["arm"] == "LIVE" and warning))
            assert e["next_active"] == nxt and record["punishment_active_next"] == nxt
        near(game["group_cumulative_net_payoff"], total / 10)
        for actual, wanted in zip(game["individual_cumulative_net_payoffs"], cumulative):
            near(actual, wanted / 10)
        assert game["next_ON"] == game["rounds"][-1]["punishment_active_next"]
        full = all(x == 20 for r in game["rounds"] for x in r["contributions"])
        row = {"game_id": gid, "block_id": game["block_id"], "arm": game["arm"],
               "W1_3": total / 10, "full20": full}
        assert game["arm"] not in blocks.setdefault(game["block_id"], {})
        blocks[game["block_id"]][game["arm"]] = row
        rows.append(row)
    assert len(blocks) == 60 and all(set(v) == set(ARMS) for v in blocks.values())
    means = {a: mean(r["W1_3"] for r in rows if r["arm"] == a) for a in ARMS}
    full20 = {a: sum(r["full20"] for r in rows if r["arm"] == a) for a in ARMS}
    differences = {"SHADOW-H": [], "LIVE-SHADOW": [], "LIVE-H": []}
    blockrows = []
    for bid in design["block_order"]:
        w = {a: blocks[bid][a]["W1_3"] for a in ARMS}
        for name, a, b in (("SHADOW-H", "SHADOW", "H"), ("LIVE-SHADOW", "LIVE", "SHADOW"), ("LIVE-H", "LIVE", "H")):
            differences[name].append(w[a] - w[b])
        blockrows.append({"block_id": bid, "W_by_arm": w})
    contrasts = {name: contrast(differences[name]) for name in ("SHADOW-H", "LIVE-SHADOW")}
    for name, value in contrasts.items():
        near(value["mean"], saved["contrasts"][name]["mean"])
        for x, y in zip(value["confidence_interval"], saved["contrasts"][name]["confidence_interval"]):
            near(x, y)
    tag, ratio = position(*(contrasts[n]["confidence_interval"] for n in ("SHADOW-H", "LIVE-SHADOW")))
    assert tag == saved["relative_position"]["classification"]
    for x, y in zip(ratio, saved["relative_position"]["r_interval"]):
        near(x, y)
    for arm in ARMS:
        near(means[arm], saved["arm_means"][arm])
        assert full20[arm] == saved["full20_openings"][arm]
    old = json.loads((HERE.parent / "current_policy/data.json").read_text())["games"]
    oldmeans = {a: mean(sum(r["ledger"]["group_net_payoff"] for r in g["rounds"][:3]) for g in old.values() if g["arm"] == a) for a in ("H", "HL")}
    oldfull = sum(all(c == 20 for r in g["rounds"][:3] for c in r["contributions"]) for g in old.values() if g["arm"] == "H")
    near(oldmeans["HL"] - oldmeans["H"], saved["old_opening_comparison"]["old_LIVE_minus_H"])
    assert oldfull == saved["old_opening_comparison"]["old_H_full20"]
    near(mean(differences["LIVE-H"]), saved["LIVE_minus_H_descriptive"])
    return {"study": "announcement_screen", "verified": True, "independent_blocks": 60,
            "fresh_openings": 180, "collected_rounds": 3, "all_observed_rounds_OFF": True,
            "arm_means": means, "full20_openings": full20, "contrasts": contrasts,
            "relative_position": tag, "ratio_interval": ratio,
            "old_LIVE_minus_H_opening": oldmeans["HL"] - oldmeans["H"],
            "new_LIVE_minus_H_opening": mean(differences["LIVE-H"]),
            "old_H_full20": oldfull, "new_H_full20": full20["H"], "blocks": blockrows}


if __name__ == "__main__":
    print(json.dumps(reproduce(), indent=2))
