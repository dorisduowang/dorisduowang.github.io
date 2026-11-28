# Related work

A monitor can change the behavior it observes even when its model stays fixed.
Ponde et al. examine monitoring awareness and feedback while holding models,
activation probes and thresholds fixed in
[You Can't Escape Your Activations](https://arxiv.org/html/2609.03035v2).
Kaushik et al. study a consequential observer in
[Who Else Is In?](https://arxiv.org/html/2610.37984v1), where a cop deducts points
based on a message. Their cop versus no-cop comparison shows how enforcement
pressure changes expression, and message ablations examine what the words add
to coordination. Strategic responses to monitoring are already an empirical
research topic.

Communication and punishment also have direct precedents in LLM public goods
games. [Corrupted by Reasoning](https://arxiv.org/html/2506.23276v2) studies costly
sanctioning and institutional choice without communication between players. In
[The Politician, the Liar, and the Obedient Worker](https://arxiv.org/html/2608.09574v1),
a manager allocates punishment after observing contributions and can also see
public messages and private messages addressed to it. Language can therefore
influence discretionary enforcement. Madmoun and Lahlou's
[Communication Enables Cooperation](https://aclanthology.org/2026.eacl-short.23.pdf)
reports that communication raises contributions while lowering payoffs in its
standard public goods treatment with peer punishment. A welfare loss from
communication is already an observed result.

The [60-block experiment](../studies/announcement_screen/) focuses on the
opening response to adding a language-triggered enforcement route. SHADOW
records the monitor's scores but excludes them from punishment and
payoff rules, while LIVE gives its warning a role in future punishment decisions.
All arms retain public communication, with punishment unavailable during the
3 observed opening rounds. The comparison measures the effect of the announced
policy arrangement on cooperation and net earnings before realized sanctions
can contribute to the difference. LIVE adds both a connection from the group's
own messages to punishment and another enforcement route. The current result
does not separate a language-specific response from general anticipated
enforcement, within the documented model and rules.

History-dependent monitoring has precedents too. Who Else Is In? includes a
stateful monitor with a private scratchpad, while
[Kloft and Laskov](https://proceedings.mlr.press/v9/kloft10a.html) study manipulation
of an adaptive anomaly reference. The
[reference-inheritance experiment](../studies/reference_inheritance/) intervenes
on this feedback by showing recipients both candidate text sets and changing
only the selected scoring reference before fresh behavior. Its controlled
continuation-value effect is reported separately from the announcement and
complete-game comparisons.

Frey and Ethayarajh's [Mecha-nudges for Machines](https://arxiv.org/html/2603.23433v4)
connects this work to decision environments that adapt to AI agents. It combines
Bayesian persuasion with usable information and studies changes in Etsy listings
around the release of ChatGPT. The Etsy evidence is observational, and the paper
also discusses agent-to-agent mecha-nudging. The shared question concerns an
endogenous decision environment, with enforcement-control and reference
interventions providing this project's particular experimental setting.

The economic benchmark includes
[delegated enforcement](https://econweb.ucsd.edu/~jandreon/Publications/JPUBE2012-A%26G.pdf)
and [the hidden costs of control](https://www.iza.org/publications/dp/1203/distrust-the-hidden-cost-of-control).
The latter supplies a human precedent for lower voluntary effort under control,
which motivates examining responses to an announced institution. The agent
experiment measures its own contribution and earnings response rather than
assuming the same psychological explanation.

## Broader framework

[Strategic classification](https://arxiv.org/pdf/1506.06980v2) studies how people
change inputs in response to decision rules, and
[How Strategic Agents Respond](https://arxiv.org/html/2501.16355v2) uses LLMs to
simulate structured effort allocation in that setting.
[Performative prediction](https://proceedings.mlr.press/v119/perdomo20a.html)
formalizes deployment-induced changes in data distributions, with
[stateful extensions](https://proceedings.mlr.press/v151/brown22a.html) addressing
responses that depend on policy and current state. Related work on
[classification externalities](https://procaccia.info/wp-content/uploads/2024/10/strategic.pdf)
and [collective data control](https://proceedings.mlr.press/v202/hardt23a.html)
helps frame how one agent's expression changes the decision environment faced
by others.

[Monitoring reasoning models](https://arxiv.org/html/2503.11926v1) studies
obfuscation under monitoring optimization. Other public goods work examines
[observation networks](https://arxiv.org/html/2611.11714v1), while
[CoopEval](https://arxiv.org/html/2604.15267v2) compares mechanisms for LLM
cooperation. [Integrative human experiments](https://arxiv.org/pdf/2508.17151)
study how punishment's welfare effects depend on the surrounding game design.
These provide context for evaluating an enforcement rule through economic
outcomes after agents respond.

The [next comparison](future-mechanism.md) would retain an additional
enforcement channel while sourcing its warnings from either the group's own
messages or a paired group's messages. It would test whether behavior depends
on that connection. The current announcement result and separate controlled
reference effect provide outcomes to explain without establishing a unified
mechanism.
