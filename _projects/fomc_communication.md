---
layout: page
title: News Metadata and Market Volatility Around FOMC Meetings
description: Separating exploratory timing patterns from holdout validation around Fed meetings
img:
importance: 6
category: research
github: https://github.com/dorisduowang/fomc-media-alignment/tree/analysis/temporal-validation
---

## Research question

Does news metadata around a Fed meeting contain information about later market volatility?

This is joint work with Yuzhao (Jerry) Jin.

The project processes more than 2 million GDELT metadata records around an 88-meeting FOMC calendar. The writing sample uses 33 meetings. Volatility is reconstructed from 5 strictly later log returns so the outcome cannot leak into the news window.

## Identification

The analysis separates the exploratory lag from later validation. The current branch evaluates 7 archived dates with 20,000 permutations and preserves prior return dates as distinct controls.

In the writing sample, a 1 standard deviation increase in alignment was associated with 3.92 annualized volatility percentage points before controls. After prior volatility and VIX entered the model, the estimate was negative 1.12 points with a 95% interval from negative 6.75 to 4.51.

[Open the latest analysis branch](https://github.com/dorisduowang/fomc-media-alignment/tree/analysis/temporal-validation)
