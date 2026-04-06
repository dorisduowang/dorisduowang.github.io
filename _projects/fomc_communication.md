---
layout: page
title: FOMC Communication & S&P 500 Volatility
description: Analyzing how Fed communication dynamics and media narratives drive financial market volatility
img: # TODO: assets/img/project_fomc.jpg
importance: 2
category: research
---

## Overview

This project (co-led with Yuzhao Jin) examines the relationship between **FOMC communication**, **New York Times media narratives**, and **S&P 500 volatility** over the 2021–2025 period. We ask whether media tone tracks or anticipates shifts in Fed communication and post-announcement market volatility.

## Data

- **40 FOMC meetings** (2021–2025)
- **2,740 New York Times articles** collected via NYT API
- **11 FRED macroeconomic series**
- S&P 500 event-window volatility measures

## Methods

- TF-IDF and hawkish/dovish sentiment scoring of FOMC statements and NYT articles
- Construction of a 40-observation meeting-level panel merging text scores, macro controls, publication timing, and post-meeting S&P 500 volatility
- OLS regression and lead-lag correlation analysis across mixed-frequency textual and financial sources

## My Contributions

- Built the **NYT API data pipeline** for automated article collection and processing
- Designed **FRED data cleaning** workflows and panel construction
- Developed hawkish/dovish scoring methodology for textual analysis
- Co-authored academic paper outline targeting journal publication
