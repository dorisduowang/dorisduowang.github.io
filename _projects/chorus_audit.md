---
layout: page
title: Auditing Text-Based Reward Signals
description: Testing whether text-based rewards track scientific value in AI-driven scientific discovery
img: # TODO: assets/img/project_chorus.jpg
importance: 3
category: research
---

## Overview

Can a reward for surprising language help an AI system identify valuable scientific work? I audited how Chorus ranked 443 publications under alternative reward rules.

## Design

I built a directed hypergraph connecting papers to researcher profiles and scientific concepts. Three simulated researcher personas then searched the same graph under different surprise regimes. The comparison tracks ranking stability and the recovery of high-impact papers.

## Result

The audit identified 3 systematic reward inversions in which a text-based reward disagreed with scientific impact. I used those cases to propose a multimodal ranking metric that combines linguistic surprise with structure in the publication graph.
