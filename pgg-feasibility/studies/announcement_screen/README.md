# Announcing language control changes cooperation before punishment

An automated monitor changes the game when players know their words can activate
punishment. This experiment separates that announced control from a monitor
whose scores are recorded but excluded from punishment and payoff rules.

Each of 60 randomized blocks contains 1 fresh game per condition. H uses the
original contribution-history rule. SHADOW describes the same monitoring
technology as LIVE while explicitly giving its outputs no control. LIVE permits
a language warning to activate future punishment. All games announce 15 rounds,
and collection pauses after round 3 without a terminal-round announcement.
Punishment is unavailable in all 3 observed rounds.

| Opening outcome                             |      H | SHADOW |   LIVE |
| ------------------------------------------- | -----: | -----: | -----: |
| Mean group net earnings, rounds 1 to 3      | 325.28 | 329.51 | 275.32 |
| Games with all 12 contributions equal to 20 |   9/60 |  13/60 |   0/60 |

LIVE minus SHADOW is **−54.19 tokens**, or **−16.45%** relative to SHADOW.
Its pre-specified 98.75% interval is [−70.37, −38.01]. SHADOW minus H is +4.23,
with interval [−14.61, 23.07]. The pre-specified position rule places SHADOW
closer to H. Equivalence between those conditions is not established.

The loss therefore begins before any realized punishment. In this model and
wording, announcing that language will influence future enforcement lowers
opening contributions relative to describing a monitor without that authority.
The result concerns the announcement arrangement rather than a uniquely
identified psychological mechanism.

## Relation to the complete-game pilot

The earlier 6-block study observed 12 full games. Its opening LIVE minus H
contrast was −91.8, compared with −49.96 here. Fully cooperative H openings were
4/6 in the earlier sample and 9/60 here. That comparison makes the earlier
opening estimate's small-sample sensitivity visible.

The earlier full-game result remains −367.0 tokens with its exploratory 95%
interval [−566.26, −167.74]. These new openings do not estimate rounds 4 to 15,
so they cannot supply a numerical correction to that full-game magnitude.
The new primary contrast of −54.19 is LIVE minus SHADOW, while −49.96 is LIVE
minus H. The samples and contrasts are kept separate.

## Reproduce

```bash
python3 studies/announcement_screen/reproduce.py
```

The standard-library script recomputes all 540 round ledgers and 180 game totals,
then verifies both pre-specified intervals and the position classification.
It also recomputes the matched old and new opening comparison from released
data. Repeated contribution trajectories remain in their assigned blocks.
The 98.75% intervals retain the plan's adjustment for 2 contrasts and 2 possible
looks. Only the fixed 60-block stage was collected. Inference uses the
independent-block t approximation.

`data.json` contains public synthetic messages and actions with their payoff
ledgers. `public_rules.json` preserves the exact arm rules and common stage
instructions. `design.json` gives assignment and execution order. Private
calculator records and provider envelopes are excluded from this field-whitelisted
export, as documented in `PROVENANCE.json`.
