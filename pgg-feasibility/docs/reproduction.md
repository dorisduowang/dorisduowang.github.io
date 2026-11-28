# Data and reproducibility

## Quick verification

```bash
python3 reproduce.py
```

Only Python's standard library is required. The command checks 6 separate
saved-data studies and prints a compact summary. Use `--full` for all
recomputed group values and prediction tables. It does not generate agent
responses, read credentials, load a language scorer, or download weights.

Each study also has a standalone entry:

```bash
python3 studies/announcement_screen/reproduce.py
python3 studies/current_policy/reproduce.py
python3 studies/reference_inheritance/reproduce.py
python3 studies/early_warning/reproduce.py
python3 studies/enforcement_demand/reproduce.py
python3 studies/mixed_model/reproduce.py
```

The scripts reconstruct integer-tenth-token payoff ledgers, routing and
study-specific values, or recompute prediction errors from saved held-out
predictions. They compare their outputs with released summaries and stop on
inconsistency. They reproduce analyses of recorded stochastic games, not the
same stochastic responses from a newly queried model.

## Optional prediction refit

The early-warning audit can also rebuild its features from the released
current-policy games and refit the exact local statistical procedure:

```bash
python3 -m pip install -r requirements-analysis.txt
python3 studies/early_warning/refit.py
```

This is local scikit-learn fitting, not generative-model inference. It
reconstructs 72 decision-time feature rows and verifies 720 held-out predictions
against the saved audit. Preprocessing and vocabularies are fitted only on the
training games of each fold. The script uses fixed parameters and does not
search for a better result. Its small verification output goes under that
study's ignored `tmp/` directory.

The audit was designed after this batch's outcomes had been inspected. Both
whole-game and trajectory-family leave-outs are exploratory. Current and
previous message features enter the implementation; numerical mentions are
not newly elicited structured reports or next-round intention reports.

## Public data

`studies/*/data.json` files contain explicit field-whitelisted scientific
exports. Depending on the study, these include:

- synthetic agents' public messages, contributions and complete payoff ledgers;
- policy states, saved language scores and branch probabilities;
- experimental assignments and independent-unit identifiers;
- prediction feature rows, fold membership and out-of-fold predictions;
- historical diagnostic aggregate results, with version and status labels.

Provider request/response envelopes, private reasoning, private calculator
state, credentials, financial/authorization records, application documents and
private correspondence are not included. The public export is therefore not
an exact copy of every local execution log.

Every primary study has a `PROVENANCE.json` recording relative source
identifiers, hashes and the export transformation. Source identifiers describe
the original research record; they are not links to files promised in this
checkout. No unavailable raw record is required by the public reproduction
entry points. Public per-study rules and schema descriptions explain the
fields that are distributed.

## Versioned source

`research_code/` preserves selected byte-identical scientific source snapshots
and their hashes. They document executed game, payoff, policy and diagnostic
implementations, while portable study reproductions are the supported default
workflow. Credential brokers and paid execution entry points are excluded.

The root legacy Qwen scoring files and archived article retain their earlier
rule version. Re-scoring that archive requires the separately pinned local
scorer described in its own README. It is not part of the zero-model-call
verification above.

## Study units

The announcement primary has 60 block differences from 180 fresh openings.
The earlier complete-policy study has 6 block differences from 12 full games.
The reference experiment has four producer-pair blocks from a shared prefix;
its branches are dependent counterfactual continuations. The warning audit
reuses six H games, adding no behavioral sample. The mixed-model screen is a
conditional paired-state screen, not a full-policy experiment. Historical
diagnostics remain separate from all these primary quantities.

See the [study registry](../data/research_registry.json),
[research history](study-history.md), and study README files for details.
