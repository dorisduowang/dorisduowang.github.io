---
layout: page
title: Agentic Supply Chains
description: Testing how unequal AI capabilities change bargaining and coordination across a multi-tier economy
img:
importance: 3
category: research
---

## Research question

When firms use agents of unequal capability, who captures the surplus and where does coordination fail?

The experiment uses a 4-tier economy. Each firm has a distinct network position, a permitted information set, and an operating constraint. I hold those role instructions fixed while agent capability changes. This separates capability from prompt wording.

## Design contribution

I translated each firm's observations and constraints into one executable policy that adapts to its network position. The policy does not expose hidden state. Regression tests verify that each position receives feasible guidance without crossing an information boundary.

The outcome is not only whether the supply chain reaches agreement. I compare who captures surplus, where bargaining stalls, and whether stronger agents improve coordination for the network or only for the firm that deploys them.
