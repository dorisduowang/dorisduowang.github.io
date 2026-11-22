---
layout: page
title: Projects
permalink: /projects/
description: Research on information, strategic behavior, and institutional design.
nav: true
nav_order: 1
display_categories: [research, coursework]
horizontal: false
---

My projects follow one sequence. I identify the information available to strategic actors, hold the decision problem fixed, and change one
institutional margin. That margin may be the enforcement rule, the team roster, or the capability of an agent representing a firm. I then trace the
change into behavior and payoffs.

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
