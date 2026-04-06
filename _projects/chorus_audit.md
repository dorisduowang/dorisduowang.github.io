---
layout: page
title: Auditing Text-Based Reward Signals
description: Testing whether text-based rewards track scientific value in AI-driven scientific discovery
img: # TODO: assets/img/project_chorus.jpg
importance: 3
category: research
---

## Overview

Developed for the **AI Agents for Social Science and Society** course, this project audits the reliability of text-based reward signals used in AI-driven scientific discovery systems. Specifically, I test whether the Chorus system's text-based rewards track genuine scientific value or merely reflect citation-neutral linguistic surprise.

## Approach

- Built a **directed hypergraph** over papers, researcher profiles, and concepts
- Designed **three-persona simulations** (Consolidator, Disruptor, and Connector agents) to compare how alternative surprise regimes change recommendation quality
- Evaluated ranking stability and recovery of high-impact papers across reward specifications

## Key Findings

- Audited **443 publications** and identified **three systematic reward inversions** where text-based signals misaligned with scientific impact
- Proposed a **multimodal ranking metric** that successfully surfaced high-impact papers missed by baseline text-only reward signals
