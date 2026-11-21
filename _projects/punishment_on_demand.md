---
layout: page
title: Punishment on Demand
description: Using Transformer Surprisal to Time Peer Sanctions in Repeated Public Goods Games
img: assets/img/project_punishment/v5_main_results.png
importance: 1
category: research
---

## Overview

When should a group use peer punishment? In a repeated public goods simulation, I used **surprisal scores** from a frozen DistilGPT-2 model to detect changes in chat and time sanctions.

## Key Results (v5)

|                   | Adaptive punishment | Always on punishment |
| ----------------- | ------------------: | -------------------: |
| Cooperation       |               0.763 |                0.695 |
| Punishment points |                 132 |                  306 |

Adaptive punishment had the highest efficiency at **106.1**. Constant punishment was less efficient than leaving punishment off.

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

_Working paper in progress._
