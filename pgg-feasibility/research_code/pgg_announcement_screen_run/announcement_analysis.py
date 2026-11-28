"""Pure stage-1 analysis; no network, credentials, model/scorer, or file writes.

The t critical value is frozen from the already reviewed offline calculation:
pgg_announcement_review_20261127/staged_screen_review/statistics/
TWO_STAGE_ERROR_REVIEW.json (sha256 recorded below). Stage 1 alone is implemented;
changing this module to analyze cumulative160 requires a separate study decision.
"""
from itertools import product
import math
from statistics import mean, stdev

ARMS = ("H", "SHADOW", "LIVE")
PLAYERS = ("P1", "P2", "P3", "P4")
TAU = 4.620724508132623
N_BLOCKS = 60
CI_LEVEL = .9875
ALPHA = .0125
T_CRITICAL_DF59 = 2.576587568681405
TCRITICAL_SOURCE_SHA256 = "1a39f6724d3a403fa9a9ccb9e5e995aee2939d7c22499d76fdc99f73c374d7e7"
COMPLETE_STATUS = "opening_checkpoint_complete"


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def _finite(value):
    require(type(value) in (int, float) and math.isfinite(value), "Finite number required")
    return float(value)


def _same(actual, expected, label):
    if isinstance(expected, list):
        require(isinstance(actual, list) and len(actual) == len(expected), label + ": length")
        for a, b in zip(actual, expected):
            _same(a, b, label)
    elif type(expected) is bool or expected is None or isinstance(expected, str):
        require(type(actual) is type(expected) and actual == expected, label + ": value/type")
    else:
        require(abs(_finite(actual) - expected) <= 1e-7, label + ": value")


def _OFF_ledger(contributions):
    """Independent integer-tenth accounting, only for the forced-OFF opening."""
    require(isinstance(contributions, list) and len(contributions) == 4
            and all(type(c) is int and 0 <= c <= 20 for c in contributions), "Illegal contribution vector")
    s = sum(contributions)
    net10 = [200 - 10*c + 4*s for c in contributions]
    return {"contributions": contributions, "punishment_active": False,
            "total_contribution": s, "sanction_levels": [0]*4,
            "sender_costs": [0]*4, "recipient_fines": [0]*4,
            "base_payoffs": [n/10 for n in net10], "net_payoffs": [n/10 for n in net10],
            "group_enforcement_cost": 0, "group_net_payoff": sum(net10)/10}


def _audit_settled_rounds(game):
    records = game.get("rounds", [])
    require(isinstance(records, list) and len(records) <= 3, "Only settled opening rounds1..3 allowed")
    arm = game["arm"]
    cumulative10 = [0]*4
    rows = []
    events = [e for e in game.get("host_only_events", []) if e.get("event") == "policy_check"]
    require(len({e.get("round") for e in events}) == len(events), "Duplicate policy event")
    event_by_t = {e.get("round"): e for e in events}
    complete = game.get("status") == COMPLETE_STATUS
    require(not complete or set(event_by_t) == {1, 2, 3}, "Complete checkpoint needs exactly3 policy audits")
    for t, record in enumerate(records, 1):
        require(record.get("round") == t, "Settled rounds must be an ordered prefix")
        messages = record.get("messages")
        require(isinstance(messages, dict) and set(messages) == set(PLAYERS)
                and all(type(x) is str and 1 <= len(x.split()) <= 40 for x in messages.values()),
                "Missing/invalid actual messages")
        ledger = _OFF_ledger(record.get("contributions"))
        actual = record.get("ledger")
        require(isinstance(actual, dict), "Missing settled ledger")
        for key, value in ledger.items():
            _same(actual.get(key), value, "ledger." + key)
        cumulative10 = [old + round(v*10) for old, v in zip(cumulative10, ledger["net_payoffs"])]
        _same(record.get("cumulative_net_earnings"), [v/10 for v in cumulative10], "cumulative ledger")
        if t not in event_by_t:
            # A crash between durable completed_round and policy_check writes
            # must not erase the observed contribution/settlement. It also must
            # not make that game usable in the matched first3 primary result.
            require(not complete and t == len(records), "Settled round lacks complete policy audit")
            rows.append({"round": t, "contributions": list(record["contributions"]),
                         "group_net": ledger["group_net_payoff"], "policy_audit_complete": False})
            continue
        e = event_by_t[t]
        h = min(record["contributions"]) <= 7
        score, lang = None, None
        if arm in ("SHADOW", "LIVE") and t >= 2:
            scores = e.get("message_scores")
            require(isinstance(scores, list) and len(scores) == 4
                    and all(_finite(v) >= 0 for v in scores), "Missing/invalid audit scores")
            score = max(scores)
            lang = score > TAU
        else:
            require(e.get("message_scores") is None, "Unexpected H or round1 scores")
        following = t == 3 and (h or (arm == "LIVE" and lang is True))
        for key, value in {"round": t, "eligible": t == 3, "history_warning": h,
                "language_warning": lang, "language_score": score,
                "threshold": TAU if arm in ("SHADOW", "LIVE") else None,
                "next_active": following}.items():
            _same(e.get(key), value, "policy." + key)
        _same(record.get("punishment_active_next"), following, "saved next state")
        rows.append({"round": t, "contributions": list(record["contributions"]),
                     "group_net": ledger["group_net_payoff"], "policy_audit_complete": True})
    return rows


def _validate_plan(plan):
    groups, blocks = plan.get("groups"), plan.get("block_order")
    require(isinstance(groups, list) and len(groups) == 180, "Fixed180 assigned openings required")
    require(isinstance(blocks, list) and len(blocks) == len(set(blocks)) == N_BLOCKS,
            "Fixed60 blocks required")
    require(plan.get("groups_per_arm") == 60 and plan.get("max_generation_calls") == 6480,
            "Stage1 scale changed")
    by_id = {row["group_id"]: row for row in groups}
    require(len(by_id) == 180, "Duplicate assigned game ID")
    order = plan.get("group_execution_order")
    require(isinstance(order, list) and len(order) == 180 and set(order) == set(by_id),
            "Complete frozen execution order required")
    require({r["block_id"] for r in groups} == set(blocks), "Unknown/missing assigned block")
    for i, block in enumerate(blocks):
        rows = [r for r in groups if r["block_id"] == block]
        require(len(rows) == 3 and {r["arm"] for r in rows} == set(ARMS)
                and len({r["slot_id"] for r in rows}) == 3
                and set(order[3*i:3*i+3]) == {r["group_id"] for r in rows},
                "Blocks must run consecutively with one random slot per arm")
        for r in rows:
            require(r.get("institution") == ("history_language" if r["arm"] == "LIVE" else "history"),
                    "Arm/institution mismatch")
    return by_id, blocks, order


def relative_position(I1, I2):
    """Conservative rectangle propagation; same priority as reviewed stage plan."""
    for interval in (I1, I2):
        require(len(interval) == 2 and all(math.isfinite(_finite(v)) for v in interval)
                and interval[0] <= interval[1], "Invalid interval")
    total = [I1[0]+I2[0], I1[1]+I2[1]]
    out = {"LIVE_minus_H_interval": total, "r_interval": None,
           "closeness_is_equivalence": False, "ratio_is_mediation_share": False}
    if total[0] <= 0 <= total[1]:
        out["classification"] = "endpoint_separation_unresolved"
        return out
    values = [a/(a+b) for a, b in product(I1, I2)]
    lo, hi = min(values), max(values)
    out.update(r_interval=[lo, hi], SHADOW_outside_H_LIVE_range_possible=lo <= 0 or hi >= 1)
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
    out["classification"] = tag
    return out


def _contrast(values):
    require(len(values) == 60, "No unplanned partial-stage inference")
    m, sd = mean(values), stdev(values)
    se = sd/math.sqrt(60)
    half = T_CRITICAL_DF59*se
    return {"blocks": 60, "mean": m, "sample_SD": sd, "standard_error": se,
            "confidence_level": CI_LEVEL, "two_sided_alpha": ALPHA,
            "critical_t_df59": T_CRITICAL_DF59, "confidence_interval": [m-half, m+half],
            "zero_observed_difference_variance": sd == 0,
            "zero_variance_note": ("Point-width formula, no evidence of universal determinism; "
                "the t approximation requires a defensible sampling distribution." if sd == 0 else None),
            "p_value": None}


def analyze(plan, games, *, integrity_verified=False):
    """Audit settled data and report a full fixed-stage analysis only after N60.

    ``games`` maps allocated IDs to saved complete/partial game dictionaries;
    absent or not_started games are not failures and never assigned zero payoff.
    ``integrity_verified`` must be an independently obtained literal True; this
    module's arithmetic checks do not certify transport/source/response integrity.
    """
    require(type(integrity_verified) is bool, "Literal independent integrity flag required")
    by_id, blocks, order = _validate_plan(plan)
    require(isinstance(games, dict) and set(games) <= set(by_id), "Unassigned game data")
    kinds = set()
    game_rows, completed = [], {}
    seen_noncomplete = False
    serial_order_intact = True
    for gid in order:
        assignment, game = by_id[gid], games.get(gid)
        if game is None or game.get("status") == "not_started":
            if game is not None:
                require(game.get("rounds", []) == [] and game.get("completed_rounds", 0) == 0
                        and game.get("host_only_events", []) == [], "not_started cannot hide existing observations")
            seen_noncomplete = True
            game_rows.append({"group_id": gid, "block_id": assignment["block_id"],
                              "arm": assignment["arm"], "status": "not_started", "W1_3": None,
                              "full12_contributions_equal20": None, "settled_rounds": []})
            continue
        for key in ("group_id", "block_id", "arm", "slot_id", "institution"):
            _same(game.get(key), assignment[key], "assignment." + key)
        kind, fixture = game.get("data_kind"), game.get("software_fixture")
        require(kind in ("research_data", "software_fixture") and type(fixture) is bool
                and fixture == (kind == "software_fixture"), "Explicit consistent fixture label required")
        kinds.add(kind)
        rows = _audit_settled_rounds(game)
        is_complete = game.get("status") == COMPLETE_STATUS
        require(not is_complete or len(rows) == 3 and game.get("completed_rounds") == 3,
                "Completed checkpoint needs all3 rounds")
        if seen_noncomplete:
            serial_order_intact = False
        if not is_complete:
            seen_noncomplete = True
        W, full20 = None, None
        if is_complete:
            W = sum(r["group_net"] for r in rows)
            _same(game.get("group_cumulative_net_payoff"), W, "opening total")
            _same(game.get("next_ON"), game["rounds"][-1]["punishment_active_next"], "checkpoint nextON")
            full20 = all(c == 20 for r in rows for c in r["contributions"])
            completed[gid] = {"group_id": gid, "block_id": assignment["block_id"],
                              "arm": assignment["arm"], "W1_3": W,
                              "full12_contributions_equal20": full20}
        game_rows.append({"group_id": gid, "block_id": assignment["block_id"],
                          "arm": assignment["arm"], "status": game.get("status"), "W1_3": W,
                          "full12_contributions_equal20": full20, "settled_rounds": rows})
    require(len(kinds) <= 1, "Research and software fixture data cannot be mixed")
    if kinds:
        require(type(plan.get("software_fixture")) is bool and
                next(iter(kinds)) == ("software_fixture" if plan["software_fixture"] else "research_data"),
                "Observation fixture label differs from frozen plan")
    block_rows, complete_ids, prefix_ids = [], [], []
    prefix_ended = False
    for bid in blocks:
        ids = {r["arm"]: r["group_id"] for r in plan["groups"] if r["block_id"] == bid}
        complete = all(gid in completed for gid in ids.values())
        row = {"block_id": bid, "complete_three_arm_block": complete,
               "games_by_arm": ids, "W_by_arm": {arm: completed[gid]["W1_3"] if gid in completed else None
                                                    for arm, gid in ids.items()},
               "missing_complete_arms": [arm for arm, gid in ids.items() if gid not in completed]}
        if complete:
            complete_ids.append(bid)
            if not prefix_ended:
                prefix_ids.append(bid)
            w = row["W_by_arm"]
            row["descriptive_differences"] = {"SHADOW-H": w["SHADOW"]-w["H"],
                "LIVE-SHADOW": w["LIVE"]-w["SHADOW"], "LIVE-H": w["LIVE"]-w["H"]}
        else:
            prefix_ended = True
            row["descriptive_differences"] = None
        block_rows.append(row)
    full = len(complete_ids) == 60 and serial_order_intact
    ready = full and integrity_verified
    descriptive_arms = {}
    matched_ids = {row["games_by_arm"][arm] for row in block_rows if row["complete_three_arm_block"] for arm in ARMS}
    for arm in ARMS:
        arm_games = [row for row in completed.values() if row["arm"] == arm]
        descriptive_arms[arm] = {"completed_openings": len(arm_games),
            "full20_openings": sum(row["full12_contributions_equal20"] for row in arm_games),
            "mean_W_completed_openings_descriptive_only": mean([row["W1_3"] for row in arm_games]) if arm_games else None,
            "completed_games_in_incomplete_blocks": [row["group_id"] for row in arm_games if row["group_id"] not in matched_ids]}
    result = {"kind": "announcement_first3_stage1_analysis", "data_kind": next(iter(kinds), "no_observations"),
        "software_fixture": kinds == {"software_fixture"}, "fixed_required_blocks": 60,
        "complete_blocks": len(complete_ids), "complete_block_ids": complete_ids,
        "complete_prefix_block_ids": prefix_ids, "serial_execution_order_intact": serial_order_intact,
        "independent_integrity_verified": integrity_verified,
        "fixed_stage_complete": full, "formal_inference_available": ready,
        "analysis_status": ("complete_fixed_stage_inference" if ready else
            "awaiting_independent_integrity_verification" if full else "interrupted_or_unfinished_descriptive_only"),
        "descriptive_arm_counts_and_values": descriptive_arms, "games": game_rows, "blocks": block_rows,
        "formal_inference": None, "relative_position": None,
        "no_partial_game_zero_imputation": True, "no_old12_pooled": True,
        "primary_uses_all60_complete_blocks_only": True,
        "scientific_scope": "Randomized announcement bundles in this fixed model and wording; not actual ON treatment, latent psychological mediation, full15 welfare, or language-information increment.",
        "interpretation_rule": "Relative closeness does not identify an exclusive psychological cause. Do not infer equality from nonsignificance.",
        "automatic_expansion_or_retry_authorized": False}
    if ready:
        d1 = [r["descriptive_differences"]["SHADOW-H"] for r in block_rows]
        d2 = [r["descriptive_differences"]["LIVE-SHADOW"] for r in block_rows]
        inf = {"SHADOW-H": _contrast(d1), "LIVE-SHADOW": _contrast(d2)}
        result["formal_inference"] = inf
        result["relative_position"] = relative_position(inf["SHADOW-H"]["confidence_interval"],
                                                          inf["LIVE-SHADOW"]["confidence_interval"])
        result["inference_validity"] = "Two looks x two contrasts; four potential intervals each98.75%; union-bound family coverage >=95% only if the fixed-N intervals are valid. Independent block t/CLT approximation; not distribution-free or conditional-on-continuation coverage."
    else:
        result["interruption_rule"] = "No p-values, confidence intervals or formal location classification at an unplanned incomplete-stage stop. Retain complete blocks and partial material; no replacements or automatic restart. Exact resumption requires later authorization and preservation of successful responses."
    return result
