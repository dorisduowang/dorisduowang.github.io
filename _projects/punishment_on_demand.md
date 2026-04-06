---
layout: page
title: Punishment on Demand
description: Using Transformer Surprisal to Time Peer Sanctions in Repeated Public Goods Games
img: # TODO: assets/img/project_punishment.jpg (add a relevant image)
importance: 1
category: research
---

## Overview

This project investigates whether language-based monitoring can improve the efficiency of peer punishment in sustaining cooperation. Rather than imposing punishment in every round (which is costly and can reduce overall welfare), I use **transformer-based surprisal scores** from a frozen DistilGPT-2 model to detect unexpected behavioral shifts and trigger punishment selectively.

## Key Results

- **Adaptive punishment** achieves a cooperation rate of **0.763**, compared to **0.695** under always-on punishment
- Enforcement cost is dramatically reduced: **132 punishment points** (adaptive) versus **306 points** (always-on) in v5 simulations
- The surprisal-triggered mechanism provides a "deterrence under ambiguity" effect, where the possibility of punishment — rather than its constant application — sustains cooperative norms

## Methods

- Repeated public goods game simulation with multi-agent interactions
- DistilGPT-2 surprisal scores computed over behavioral sequences to detect deviations
- Comparison across enforcement regimes: no punishment, always-on punishment, and adaptive (surprisal-triggered) punishment
- Analysis of cooperation dynamics, enforcement costs, and welfare outcomes

## Status

*Working paper in progress.*

## Related Ideas

- Sparse autoencoder (SAE) decomposition of LLM internal representations for more precise punishment triggers
- Integration with agent architecture frameworks (e.g., Concordia) for richer strategic environments
- Connections to international relations literature on selective enforcement and shaming
