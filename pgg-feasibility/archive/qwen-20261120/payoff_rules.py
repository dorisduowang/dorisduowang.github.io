"""Independent public-reference rules for the bounded diagnostic only."""

REFERENCE = 10
WARNING_GAP = 3
ROUNDS = 15

RULES = (
    "You are one of 4 players in a public goods game lasting 15 rounds. "
    "Each player receives 20 new tokens every round and privately contributes an integer from 0 to 20. "
    "Current contributions are simultaneous and stay hidden until all 4 choices are submitted. "
    "Let S be the sum of all 4 contributions. The public fund is 1.6*S, and each player receives 0.4*S. "
    "Your base earnings are 20 minus your contribution plus 0.4*S. "
    "Your objective is to maximize your own cumulative net earnings. "
    "There is no assigned personality or prescribed contribution. "
    "The public sanction reference is 10 tokens and is the same for every player. "
    "When punishment is active, q_i = floor(max(0, 10 - c_i)/3). "
    "A shortfall below 3 tokens creates no sanction points, so the reference is not a strict minimum. "
    "Each of the 3 other players automatically sends q_i points to recipient i, with no self punishment. "
    "Each point costs its sender 1 token and removes 3 tokens from its recipient. "
    "Recipient i therefore loses 9*q_i. Let Q be the sum of all 4 sanction levels. "
    "Player i also pays sender cost Q - q_i, including payments to punish every other recipient. "
    "Net earnings are 20 - c_i + 0.4*S - (Q - q_i) - 9*q_i. "
    "When punishment is inactive, every sanction level and every punishment cost is 0. "
    "Group gross payoff is the sum of all 4 base earnings, equal to 80 + 0.6*S. "
    "Total sender charges are 3*Q, and total recipient losses are 9*Q. "
    "group_total_deduction includes both amounts and equals 12*Q. "
    "Sender charges and recipient losses both leave the group, with no transfer to another player. "
    "Group net payoff equals group gross payoff minus group_total_deduction, and also equals "
    "the sum of all 4 individual net earnings. "
    "Let R be the sum of the 3 partners' contributions, so S = c_i + R. "
    "Base earnings equal (20 - c_i) + 0.4*c_i + 0.4*R. "
    "The calculator displays own_retained_tokens = 20 - c_i and "
    "return_from_own_contribution = 0.4*c_i as separate known pieces. "
    "These pieces exclude the partner return 0.4*R and every punishment cost. "
    "Neither piece is total base or net earnings, and displaying them does not determine R. "
    "Under the fixed reference, your own recipient fine is known from your candidate and the current "
    "punishment state even when the partners' contributions are unknown. "
    "If punishment is active, unknown partner contributions leave sender cost and total net earnings unknown. "
    "If punishment is inactive, sender cost is known to be 0 but total base and net earnings still depend on partners. "
    "A numeric 0 is a determined amount, and JSON null denotes an undetermined quantity. "
    "Determine the information status of each quantity separately, since unknown partner returns "
    "do not make an inactive punishment charge unknown. "
    "The sender_cost field is fixed by the inactive state, undetermined with active punishment and "
    "unresolved partners, or conditional on a supplied hypothetical partner vector. "
    "A missing partner vector never means that the partners contributed 0. "
    "Calculator partner vectors are hypothetical assumptions, not observations of simultaneous current choices. "
    "partner_input_kind is unresolved when no partner vector was supplied, and hypothetical_assumption "
    "when a supplied vector is used for a conditional calculation. "
    "Only an explicit completed-round observation record reports actual choices for that recorded round. "
    "The current punishment state is already fixed for the current round. "
    "For a completed-round calculation, use the punishment state supplied for that round, "
    "without recomputing it from that round's warning. "
    "A current warning can affect only the next eligible round and cannot cancel or activate current punishment. "
    "At the end of round t, the history warning is true when 10 minus the lowest current contribution is at least 3. "
    "Punishment is unconditionally off during rounds 1 through 3. "
    "Only a warning after round 3 through round 14 can activate punishment in the following round. "
    "Activation lasts 1 round and expires unless a fresh eligible warning occurs. "
    "Round 15 cannot create round 16. No language warning is enabled in this diagnostic. "
    "Net earnings may be negative, and the next round still starts with 20 new tokens. "
    "Return only the JSON requested for the current question, without prose or code fences."
)


def _integer(value, low, high, name):
    if type(value) is not int or not low <= value <= high:
        raise ValueError(f"{name} must be an integer from {low} to {high}")
    return value


def _actions(values, size):
    if not isinstance(values, (list, tuple)) or len(values) != size:
        raise ValueError(f"Exactly {size} contributions are required")
    return [_integer(value, 0, 20, "Contribution") for value in values]


def _active(value):
    if type(value) is not bool:
        raise ValueError("Punishment state must be a boolean")
    return value


def settle(actions, active):
    """Settle one complete hypothetical vector under its already fixed state."""
    actions = _actions(actions, 4)
    active = _active(active)
    levels = [max(0, REFERENCE - c) // 3 if active else 0 for c in actions]
    sender = [sum(levels[j] for j in range(4) if j != i) for i in range(4)]
    fines = [9 * q for q in levels]
    base = [round(20 - c + 0.4 * sum(actions), 8) for c in actions]
    net = [round(gross - fee - fine, 8) for gross, fee, fine in zip(base, sender, fines)]
    return {"contributions": actions, "punishment_active": active,
            "total_contribution": sum(actions), "sanction_levels": levels,
            "sender_costs": sender, "recipient_fines": fines, "base_payoffs": base,
            "net_payoffs": net, "group_enforcement_cost": sum(sender) + sum(fines),
            "group_net_payoff": round(sum(net), 8)}


def quote(candidate, others, active):
    """Keep the own fine known without imputing missing partner contributions."""
    candidate = _integer(candidate, 0, 20, "Candidate contribution")
    active = _active(active)
    others = None if others is None else _actions(others, 3)
    own_level = max(0, REFERENCE - candidate) // 3 if active else 0
    result = {"candidate_contribution": candidate, "assumed_other_contributions": others,
              "partner_input_kind": "unresolved" if others is None else "hypothetical_assumption",
              "punishment_active": active,
              "own_retained_tokens": 20 - candidate,
              "return_from_own_contribution": round(0.4 * candidate, 8),
              "known_recipient_fine": 9 * own_level,
              "conditional_base_payoff": None,
              "sender_cost": None if active else 0,
              "sender_cost_status": ("fixed_by_inactive_state" if not active else
                                     "undetermined" if others is None else
                                     "conditional_on_hypothetical_partners"),
              "conditional_net_payoff": None}
    if others is not None:
        ledger = settle([candidate, *others], active)
        result.update(conditional_base_payoff=ledger["base_payoffs"][0],
                      sender_cost=ledger["sender_costs"][0],
                      conditional_net_payoff=ledger["net_payoffs"][0])
    return result


def next_active(actions, t):
    """Use a completed round only to determine its following eligible round."""
    actions = _actions(actions, 4)
    t = _integer(t, 1, ROUNDS, "Observed round")
    return 3 <= t <= 14 and REFERENCE - min(actions) >= WARNING_GAP
