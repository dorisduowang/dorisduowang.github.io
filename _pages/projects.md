---
layout: page
title: Projects
permalink: /projects/
description: Research on strategic interaction under incomplete information and institutional design.
nav: true
nav_order: 1
display_categories: [research, coursework]
horizontal: false
---

I study strategic interaction under incomplete information. Each project holds the decision problem fixed and changes one institutional margin. The
current public goods experiment changes what the enforcement rule can use. The matched-team study changes who deliberates over the same evidence. The
supply chain project changes the capability of the agent representing a firm. Each design traces that change into behavior and payoffs.

Start with the [research portfolio](/portfolio/#research) for the connected story and interactive evidence.

<div class="projects">
{% if site.enable_project_categories and page.display_categories %}
  {% for category in page.display_categories %}
  <a id="{{ category }}" href=".#{{ category }}"><h2 class="category">{{ category }}</h2></a>
  {% assign categorized_projects = site.projects | where: "category", category %}
  {% assign sorted_projects = categorized_projects | sort: "importance" %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}{% include projects.liquid %}{% endfor %}
  </div>
  {% endfor %}
{% else %}
  {% assign sorted_projects = site.projects | sort: "importance" %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_projects %}{% include projects.liquid %}{% endfor %}
  </div>
{% endif %}
</div>
