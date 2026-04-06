---
layout: page
title: Punishment on Demand
description: Using Transformer Surprisal to Time Peer Sanctions in Repeated Public Goods Games
img: assets/img/project_punishment/v5_main_results.png
importance: 1
category: research
---

## Overview

This project investigates whether language-based monitoring can improve the efficiency of peer punishment in sustaining cooperation. I use **transformer-based surprisal scores** from a frozen DistilGPT-2 model to detect unexpected behavioral shifts and trigger punishment selectively.

## Key Results (v5)

- **Adaptive punishment** achieves cooperation of **0.763** vs. **0.695** under always-on punishment
- Enforcement cost reduced: **132** vs. **306** punishment points
- Highest efficiency (**106.1**), while always-on drops below no-punishment baseline

### Main Results
<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/project_punishment/v5_main_results.png" title="v5 Main Results" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">Cooperation dynamics, system efficiency, punishment exposure, surprisal dynamics, punishment cost, and cooperation vs. punishment trade-off across 7 conditions.</div>

### Evaluation Heatmap
<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/project_punishment/v5_evaluation_heatmap.png" title="Evaluation Heatmap" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">Normalized metrics across conditions. Adaptive dominates on cooperation, endgame stability, and efficiency.</div>

### Per-Group Trajectories
<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/project_punishment/v5_group_trajectories.png" title="Group Trajectories" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">Per-group contribution trajectories and surprisal dynamics.</div>

## Methods

- Repeated public goods game with LLM agents (GPT-4.1-mini) and diverse personas
- DistilGPT-2 surprisal scores over group chat history to detect ruptures
- Comparison across 7 enforcement regimes

*Working paper in progress.*
