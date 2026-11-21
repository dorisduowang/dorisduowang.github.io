---
layout: page
title: Auditing Text-Based Reward Signals
description: Testing whether text-based rewards track scientific value in AI-driven scientific discovery
img: # TODO: assets/img/project_chorus.jpg
importance: 3
category: research
---

## Overview

Can rewarding surprising text help an AI system find influential papers? For **AI Agents for Social Science and Society**, I simulated how Chorus would rank **443 publications** under different rewards.

## Approach

- Built a **directed hypergraph** over papers, researcher profiles, and concepts
- Designed **three-persona simulations** (Consolidator, Disruptor, and Connector agents) to compare how alternative surprise regimes change recommendation quality
- Evaluated ranking stability and recovery of high-impact papers across reward specifications

## Key Findings

- Found **3 systematic reward inversions** where rewards based on text misaligned with scientific impact
- Proposed a **multimodal ranking metric** that successfully surfaced high-impact papers missed by baseline text-only reward signals
