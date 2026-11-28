# Public scientific data schema

Each study is separate. Identically named players and reused source histories do not imply independent new subjects or games. JSON numbers are game tokens unless labeled otherwise. `software_fixture: false` identifies actual completed collection; software tests never enter these datasets.

The standard `round` object contains:

- `round`: integer stage number; `messages`: public final text keyed `P1`–`P4`.
- `contributions`: four simultaneous settled integer actions.
- `ledger`: `contributions`, `punishment_active`, `total_contribution`, `sanction_levels`, `sender_costs`, `recipient_fines`, `base_payoffs`, `net_payoffs`, `group_enforcement_cost`, `group_net_payoff`.
- `cumulative_net_earnings`: archived game cumulative totals; their pre-checkpoint portion is not part of a branch estimand.
- `punishment_active_next`: saved next state, or `null` when not defined/generated. Some branch records additionally carry the redundant top-level `punishment_active`.

The ledger implements the executed fixed-reference-10 family, not the earlier mean-contribution proposal. Four players each receive 20 fresh tokens; the fund multiplier is 1.6; an active sanction level is `floor(max(0, 10-c_i)/3)`. Player i pays `Q-q_i` as sender and `9*q_i` as recipient. Group net is `80 + .6*sum(c) - 12*Q`. No live model or scorer is needed to recalculate this ledger.

## announcement_screen

`data.json` contains 180 fresh openings, each assigned to H, SHADOW or LIVE
within 1 of 60 randomized blocks. Every game has 3 public round records with
messages, contributions and payoff ledgers. Scientific policy checks retain
saved scalar scores and the following state. No round 4 action was generated.
The announced horizon remains 15 rounds in `public_rules.json`.

`design.json` records assignment, execution order and the fixed model/scorer
configuration. `summary.json` records both pre-specified paired contrasts and
the relative-position rule. The reproduction computes all opening payoffs in
integer tenths, reconstructs the 98.75% t intervals and compares the old and new
H-versus-LIVE openings using the separately released earlier games. It does not
regenerate scores or agent responses. The updated context ends at round 3.

## current_policy

`data.json = {schema, software_fixture, threshold, games}`. `games` maps ID to `{game_id, block_id, slot_id, arm, institution, model, data_kind, individual_cumulative_net_payoffs, group_cumulative_net_payoff, rounds, policy_checks}`. Each game has 15 rounds; the current state is in `round.ledger.punishment_active`.

Each `policy_check` holds the saved public-rule diagnostics `{round, institution, eligible, history_warning, language_warning, language_score, threshold, next_active, message_scores}`. Scores were not shown to players. H uses only the history warning; HL uses history OR a strict `max(message_scores) > threshold` language warning. These diagnostics are research outputs, not API raw responses.

There are 12 fresh independent game executions and six prespecified block contrasts. Blocks are randomized organizational pairs, not common-prefix forks or guaranteed common latent randomness. `design.json` preserves assignment order and the fixed scientific configuration. `public_rules.json` contains the exact disclosed public rules for both arms. `summary.json` preserves the audited scientific result.

## reference_inheritance

`data.json = {schema, software_fixture, threshold, source_prefix_sha256, checkpoints, nodes, cross_reference_diagnostics}`. Eight `checkpoints` contain `round13`, saved scores/warning, `p14`, and the natural draw. Thirty-two `nodes` hold producer/recipient metadata, both candidate message sets, the selected reference, `round14`, saved scores/warning, `q15`, history override, and `branches15` keyed `ON`/`OFF` only when probability is positive.

The reproduction computes each recipient's actual `W13 + p14*(W14_ON + E[W15|ON14]) + (1-p14)*(W14_OFF + E[W15|OFF14])`. It then contrasts L versus Y reference within recipient, averages the two recipient roles within block, and averages four blocks. It does not replace actual ledgers with equilibrium benchmarks. The two references were equally exposed to recipients; the active pointer changed. Saved cross scores diagnose whether alternative text changes routing under the same reference; they do not add behavioral samples or identify a mediator of current_policy.

## early_warning

`data.json = {schema, features_and_targets, predictions, fold_audits}`. `features_and_targets` has 72 rows from only the six current_policy H games. A row contains the public feature arrays (`public`, `numeric`, `lexical`), source text, `state_key`, trajectory `family`, decision/predicted rounds, candidate status, and realized next-round targets. `extraction_audit` describes public numeric mentions, not private intent reports.

`predictions` has 720 rows = 72 transitions x five fixed specifications x two holdout definitions. Each has `{split, held, id, game_id, decision_round, predicted_round, candidate, spec, predicted_risk, predicted_total_contribution, actual_risk, actual_total_contribution, matching_train_states, train_game_ids}`. `fold_audits` records training-only feature fit scopes. The stdlib command recomputes metrics from saved OOF predictions; it does not refit models. Metrics equally weight games even for family holdout. This is an exploratory reuse of the primary data, not independent validation or an identified welfare gain.

## enforcement_demand

`data.json = {schema, threshold, groups}`. Twenty groups each contain a scientific `summary`, `round14`, positive-probability `terminal` branches keyed lowercase `on`/`off`, and `terminal_branch_kind`. `summary.probability_on` is used to weight terminal actual payoffs. The five conditions per source/repetition include LIVE, matched YOKED, and DIRECT with valuable or guaranteed enforcement. Results are compared within source and repetition, not pooled across the two different histories.

## mixed_model

`data.json = {schema, source_prefix_sha256, source_prefix, model_labels, arms}`. The three-round archived prefix is reused rather than counted as new behavior. Twelve current-round-4 arm records add `{group_id, pair_id, composition, replicate, current_model_assignment, source_prefix_sha256, future_rounds_not_generated, next_state_reason}` to standard public round fields. Six ON/OFF pairs fix history and seat assignment. A/B identify the two specific pinned models; they are not random draws from model populations. No round 5 continuation or language increment is estimated.

## Exclusions and integrity

Each `PROVENANCE.json` records original relative research-artifact paths and SHA256 hashes. They identify transformation sources; the private source files themselves are not bundled. The export uses an explicit field whitelist. It omits request/response envelopes, private reasoning, private calculator requests/results, participant-private prompt state, authorization, credential/budget/account records, application materials, chats, private mentor feedback, personal email, reviewer identities, and local absolute paths. Public final messages, actions, saved scalar scores, and payoff ledgers remain available for independent inspection.
