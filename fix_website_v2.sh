#!/usr/bin/env bash
set -e

echo "Step 1: Deleting template files..."
rm -f _pages/about_einstein.md _pages/profiles.md _pages/books.md
rm -rf _books/
rm -f _teachings/data-science-fundamentals.md _teachings/introduction-to-machine-learning.md
rm -f assets/pdf/example_pdf.pdf
rm -rf readme_preview/ assets/video/ assets/audio/ lighthouse_results/
echo "Done"

echo "Step 2: Fixing cv.yml..."
cat > _data/cv.yml << 'CVEOF'
cv:
  name: Duo (Doris) Wang
  email: dorisduowang@uchicago.edu
  phone: "+1 (773) 457-7102"
  location: Chicago, IL

  sections:
    Education:
      - institution: University of Chicago
        location: Chicago, IL
        studyType: M.A. in Computational Social Science, Economics Specialization
        startDate: 2025-09-01
        endDate: 2027-06-01
        highlights:
          - "Selected Coursework: Introduction to Empirical Analysis I and II; Social Interactions and Inequality; Large-Scale Computing for the Social Sciences; Analysis in Rn I; Probability and Statistics; AI Agents for Social Science and Society"
      - institution: King's College London
        location: London, UK
        studyType: "B.Sc., Political Economy (Grade: 2:1)"
        startDate: 2022-09-01
        endDate: 2025-07-01
        highlights:
          - "Selected Coursework: Game Theory; Experimental Economics; Quantitative Methods; Mathematics for Economists; Econometrics"
    Experience:
      - name: Auditing Text-Based Reward Signals in Scientific Discovery
        position: Research Project, AI Agents for Social Science and Society
        location: University of Chicago
        startDate: 2026-01-01
        endDate: 2026-03-01
        highlights:
          - Built a directed hypergraph over papers, researcher profiles, and concepts to test whether Chorus text-based rewards tracked scientific value
          - Ran three-persona simulations with Consolidator, Disruptor, and Connector agents to compare alternative surprise regimes
          - Audited 443 publications, identified three systematic reward inversions, and proposed a multimodal ranking metric
      - name: FOMC Communication Dynamics, Media Narratives, and S&P 500 Volatility
        position: Research Project, Computational Social Science
        location: University of Chicago
        startDate: 2026-01-01
        endDate: 2026-03-01
        highlights:
          - Built a 2021-2025 dataset covering 40 FOMC meetings, 2,740 NYT articles, 11 FRED series, and S&P 500 event-window measures
          - Constructed a 40-observation meeting-level panel merging hawkish-dovish text scores, macro controls, and post-meeting volatility
          - Estimated OLS models and lead-lag correlations to test whether media tone tracked or anticipated shifts in Fed communication
      - name: Large-Scale Behavioral Analysis of Cooperation Mechanisms
        position: Undergraduate Researcher, B.Sc. Dissertation
        location: King's College London
        startDate: 2024-09-01
        endDate: 2025-05-01
        highlights:
          - Built a panel with more than 1.5 million interaction observations on about 135,000 agents
          - Compared static grouping with dynamic regrouping across enforcement regimes
          - Estimated interaction models with cluster-robust inference on the full panel
      - name: UK Structural Inequality Analysis
        position: Research Analyst, Econometrics Empirical Project
        location: King's College London
        startDate: 2023-01-01
        endDate: 2023-04-01
        highlights:
          - Built an analytical sample from large-scale UK census microdata for gender disparity analysis
          - Estimated multivariate OLS wage regressions with variance-inflation and heteroskedasticity diagnostics
          - Separated unconditional gender gaps from conditional pay differentials
      - name: Comparative Analysis of Sequence Modeling Architectures (LSTM vs. ARIMA)
        position: Research Program
        location: Massachusetts Institute of Technology
        startDate: 2022-06-01
        endDate: 2022-09-01
        highlights:
          - Implemented ARIMA and LSTM models to forecast gold log returns from 2000 to 2020
          - Built an end-to-end Python pipeline with standardized preprocessing and hyperparameter search
          - Wrote a 5,000-word technical report comparing model approaches
    Teaching:
      - name: "ECON 17100: Introduction to International Trade"
        position: Teaching Assistant (Prof. Timothy Hersey)
        location: University of Chicago
        startDate: 2026-01-01
        endDate: 2026-03-01
        highlights:
          - Led weekly 50-minute discussion sections on Ricardian and Heckscher-Ohlin trade models
          - Provided weekly office hours and Ed Discussion support
          - Drafted solution sets and grading rubrics
    Awards:
      - title: Gargoyle Research Scholarship
        date: 2025
        awarder: University of Chicago
      - title: Social Science Promise Scholarship
        date: 2025
        awarder: University of Chicago
      - title: M.A. Director's Scholarship
        date: 2025
        awarder: University of Chicago
    Skills:
      - name: Core Analysis
        keywords:
          - "Python (pandas, NumPy, scikit-learn, PyTorch/TensorFlow)"
          - "R (tidyverse)"
          - SQL
          - Stata
      - name: Modeling and Simulation
        keywords:
          - Java
          - C++
          - MATLAB
      - name: Empirical and Causal Inference
        keywords:
          - "OLS regression"
          - "Causal inference (DiD, RD)"
          - Experimental design
      - name: Statistical Modeling and ML
        keywords:
          - "Time-series forecasting (ARIMA, LSTM)"
          - Machine learning
          - "NLP / text-as-data"
    Languages:
      - language: Mandarin
        fluency: Native
      - language: English
        fluency: Advanced
      - language: French
        fluency: Intermediate
      - language: Japanese
        fluency: Intermediate
      - language: Korean
        fluency: Basic
CVEOF
echo "Done"

echo "Step 3: Fixing socials..."
cat > _data/socials.yml << 'EOF'
cv_pdf: /assets/pdf/Duo_Wang_CV.pdf
email: dorisduowang@uchicago.edu
github: dorisduowang
rss_icon: true
EOF
echo "Done"

echo "Step 4: Fixing repositories..."
cat > _data/repositories.yml << 'EOF'
github_users:
  - dorisduowang
repo_description_lines_max: 2
EOF
echo "Done"

echo "Step 5: Clearing coauthors..."
echo "" > _data/coauthors.yml
echo "Done"

echo "Step 6: Fixing papers.bib..."
cat > _bibliography/papers.bib << 'BIBEOF'
@article{wang2023gold,
  title     = {Prediction Model of Gold Yield Time Series Based on ARIMA and LSTM},
  author    = {Wang, Duo},
  journal   = {BCP Business \& Management},
  volume    = {38},
  pages     = {2479--2489},
  year      = {2023},
  doi       = {10.54691/bcpbm.v38i.4123},
  url       = {https://bcpublication.org/index.php/BM/article/view/4123},
  abstract  = {This paper selects ARIMA and LSTM forecasting models to establish a more suitable forecasting method for gold returns, using gold return data from January 2000 to April 2020.},
  selected  = {true},
  bibtex_show = {true}
}

@unpublished{wang2026punishment,
  title     = {Punishment on Demand: Using Transformer Surprisal to Time Peer Sanctions in Repeated Public Goods Games},
  author    = {Wang, Duo},
  year      = {2026},
  note      = {Working paper},
  abstract  = {This paper investigates whether language-based monitoring can improve the efficiency of peer punishment in sustaining cooperation. The adaptive approach achieves a cooperation rate of 0.763 compared to 0.695 under always-on punishment, while reducing enforcement costs from 306 to 132 punishment points.},
  selected  = {true},
  bibtex_show = {true}
}
BIBEOF
echo "Done"

echo "Step 7: Fixing about.md..."
cat > _pages/about.md << 'EOF'
---
layout: about
title: About
permalink: /
subtitle: M.A. in Computational Social Science (Economics) · <a href='https://macss.uchicago.edu/'>University of Chicago</a>

profile:
  align: right
  image: prof_pic.jpg
  image_circular: false
  more_info: >
    <p>Chicago, IL</p>
    <p>dorisduowang@uchicago.edu</p>

selected_papers: true
social: true
news: true
latest_posts: false
---

I am a first-year M.A. student in [Computational Social Science (Economics)](https://macss.uchicago.edu/) at the **University of Chicago**. I received my B.Sc. in Political Economy from [King's College London](https://www.kcl.ac.uk/) in 2025.

My research sits at the intersection of **behavioral economics**, **computational social science**, and **institutional design**. I am broadly interested in how cooperation emerges and is sustained in strategic environments, and how language-based monitoring can improve the efficiency of enforcement mechanisms.

Currently, I am working on two projects. **Punishment on Demand** uses transformer-based surprisal scores to adaptively trigger peer punishment in repeated public goods games — achieving higher cooperation at less than half the enforcement cost. I am also developing components of **Chorus**, a surprise-driven knowledge system for [KnowledgeLab](https://www.knowledgelab.org/) at UChicago, where I audit and redesign text-based reward signals for AI-driven scientific discovery.

Prior to UChicago, my undergraduate dissertation at King's College London examined cooperation dynamics and institutional design in large-scale repeated games, analyzing over 1.5 million interaction observations across approximately 135,000 agents.

**Research Interests:** Behavioral and experimental economics of cooperation · Strategic communication in repeated games · Language-based monitoring and selective enforcement · LLM-based simulation of economic behavior
EOF
echo "Done"

echo "Step 8: Fixing cv.md..."
cat > _pages/cv.md << 'EOF'
---
layout: cv
title: CV
permalink: /cv/
description: Academic Curriculum Vitae
nav: true
nav_order: 3
cv_pdf: /assets/pdf/Duo_Wang_CV.pdf
toc:
  sidebar: left
---
EOF
echo "Done"

echo "Step 9: Fixing publications.md..."
cat > _pages/publications.md << 'EOF'
---
layout: page
title: Publications
permalink: /publications/
description: Published papers and working papers.
nav: true
nav_order: 2
years: [2026, 2023]
---

<div class="publications">
{% bibliography %}
</div>
EOF
echo "Done"

echo "Step 10: Fixing projects.md..."
cat > _pages/projects.md << 'EOF'
---
layout: page
title: Projects
permalink: /projects/
description: Research projects in behavioral economics, computational social science, and AI system design.
nav: true
nav_order: 1
display_categories: [research, coursework]
horizontal: false
---

<div class="projects">
{% if site.enable_project_categories and page.display_categories %}
  {% for category in page.display_categories %}
  <a id="{{ category }}" href=".#{{ category }}">
    <h2 class="category">{{ category }}</h2>
  </a>
  {% assign categorized_projects = site.projects | where: "category", category %}
  {% assign sorted_projects = categorized_projects | sort: "importance" %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
  {% endfor %}
{% else %}
  {% assign sorted_projects = site.projects | sort: "importance" %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
{% endif %}
</div>
EOF
echo "Done"

echo "Step 11: Updating punishment project..."
mkdir -p assets/img/project_punishment
cat > _projects/punishment_on_demand.md << 'PROJEOF'
---
layout: page
title: Punishment on Demand
description: Using Transformer Surprisal to Time Peer Sanctions in Repeated Public Goods Games
img: assets/img/project_punishment/v5_main_results.png
importance: 1
category: research
---

## Overview

This project investigates whether language-based monitoring can improve the efficiency of peer punishment in sustaining cooperation. Rather than imposing punishment in every round, I use **transformer-based surprisal scores** from a frozen DistilGPT-2 model to detect unexpected behavioral shifts and trigger punishment selectively.

## Key Results (v5 Simulations)

- **Adaptive punishment** achieves a cooperation rate of **0.763**, compared to **0.695** under always-on punishment
- Enforcement cost dramatically reduced: **132 punishment points** (adaptive) vs. **306** (always-on)
- Adaptive yields the highest efficiency (**106.1**), while always-on drops below the no-punishment baseline (88.9 vs. 107.4)

### Main Results

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/project_punishment/v5_main_results.png" title="v5 Main Results" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Cooperation dynamics, system efficiency, punishment exposure, surprisal dynamics, punishment cost, and cooperation vs. punishment trade-off across 7 conditions.
</div>

### Evaluation Heatmap

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/project_punishment/v5_evaluation_heatmap.png" title="Evaluation Heatmap" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

### Per-Group Trajectories

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/project_punishment/v5_group_trajectories.png" title="Group Trajectories" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

## Methods

- Repeated public goods game with LLM agents (GPT-4.1-mini) and 7 diverse behavioral personas
- DistilGPT-2 surprisal scores over group chat history to detect behavioral ruptures
- Adaptive trigger: punishment activated when rupture score exceeds within-group threshold
- Comparison across 7 enforcement regimes

## Status

*Working paper in progress.*
PROJEOF
echo "Done"

echo "Step 12: Updating FOMC project..."
cat > _projects/fomc_communication.md << 'EOF'
---
layout: page
title: FOMC Communication & S&P 500 Volatility
description: Analyzing how Fed communication dynamics and media narratives drive financial market volatility
img:
importance: 2
category: research
github: https://github.com/macs30112-winter26/final-project-makkapakka
---

## Overview

This project (co-led with Yuzhao Jin) examines the relationship between **FOMC communication**, **New York Times media narratives**, and **S&P 500 volatility** over the 2021-2025 period.

## Data

- **40 FOMC meetings** (2021-2025)
- **2,740 New York Times articles** via NYT API
- **11 FRED macroeconomic series**
- S&P 500 event-window volatility measures

## Links

- [GitHub Repository](https://github.com/macs30112-winter26/final-project-makkapakka)
EOF
echo "Done"

echo "Step 13: Fixing teaching.md..."
cat > _pages/teaching.md << 'EOF'
---
layout: page
title: Teaching
permalink: /teaching/
description: Teaching experience at the University of Chicago.
nav: true
nav_order: 4
---

## University of Chicago

### ECON 17100: Introduction to International Trade
**Teaching Assistant** · Winter 2026 · Prof. Timothy Hersey

- Led weekly 50-minute discussion sections translating Ricardian and Heckscher-Ohlin trade models into quantitative problem-solving exercises
- Provided weekly office hours and Ed Discussion support
- Drafted solution sets and grading rubrics with the instructor
EOF
echo "Done"

echo "Step 14: Fixing _config.yml..."
sed -i 's|You can even add a little note about which of these is the best way to reach you.|The best way to reach me is by email.|' _config.yml
sed -i 's|blog_name: al-folio|blog_name: Doris Wang|' _config.yml
sed -i 's|blog_description: a simple whitespace theme for academics|blog_description: Research notes and updates|' _config.yml
sed -i 's|disqus_shortname: al-folio|disqus_shortname:|' _config.yml
echo "Done"

echo ""
echo "ALL DONE!"
echo ""
echo "Next: copy your photo, CV, and notebook images, then git push."
echo "See instructions above."
