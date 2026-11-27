/* Public research registry UI. Local artifacts only; no model or scoring calls. */
"use strict";
const $ = (selector) => document.querySelector(selector);
const REGISTRY = "data/research_registry.json";
const REPO = "https://github.com/dorisduowang/pgg-feasibility";
const state = { studies: [], status: "all", query: "", limit: 8, loaded: false };
const statusNames = { completed: "Completed", archived: "Archived", planned: "Planned" };
const scopeNames = { screening: "Screening evidence", shelved: "Shelved design", planned_concept: "Concept only", planned: "Prepared, not executed" };

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}
function text(value) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(" ");
  return "";
}
function fmt(value, digits = 3) {
  if (typeof value !== "number" || !Number.isFinite(value)) return text(value);
  return value.toLocaleString("en-US", { maximumFractionDigits: digits }).replace(/^-/, "−");
}
function safeHref(value) {
  if (typeof value !== "string" || !value || value.startsWith("/Users/") || value.startsWith("/scratch/")) return null;
  try {
    const url = new URL(value, document.baseURI);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return value;
  } catch {
    return null;
  }
}
function readableHref(value) {
  const safe = safeHref(value);
  if (!safe) return null;
  if (!/^(https?:)?\/\//.test(safe)) {
    const hashAt = safe.indexOf("#");
    const pathname = hashAt < 0 ? safe : safe.slice(0, hashAt);
    if (pathname.endsWith("/")) return `${REPO}/tree/main/${safe.replace(/^\.\//, "")}`;
    if (/\.(?:md|py)$/i.test(pathname) || /^(?:studies|reproducibility|source)\//.test(pathname))
      return `${REPO}/blob/main/${safe.replace(/^\.\//, "")}`;
  }
  return safe;
}
function link(value, label, className = "") {
  const href = readableHref(value);
  if (!href) return null;
  const node = element("a", className, label);
  node.href = href;
  if (/^https?:\/\//.test(href)) node.rel = "noopener noreferrer";
  return node;
}
function renderLinks(container, study, extra = {}) {
  container.replaceChildren();
  const labels = {
    report: "Report",
    data: "Data",
    code: "Code",
    reproduce: "Reproduce",
    reproduction: "Reproduce",
    protocol: "Protocol",
    overview: "Overview",
    diagnostics: "Diagnostics",
    ledger: "Ledger",
  };
  const links = { ...(study?.links || {}), ...extra };
  const seen = new Set();
  for (const key of Object.keys(labels)) {
    const value = typeof links[key] === "object" ? links[key]?.url : links[key];
    if (!value || seen.has(value)) continue;
    const node = link(value, labels[key]);
    if (node) {
      container.append(node);
      seen.add(value);
    }
  }
}
function renderFeatured(studies, project) {
  const primary = studies.find((s) => ["current-policy", "current_policy"].includes(s.id));
  const reference = studies.find((s) => ["reference-inheritance", "reference_inheritance"].includes(s.id));
  const forecast = studies.find((s) => ["early-warning", "early_warning"].includes(s.id));
  if (project?.updated) {
    const date = new Date(project.updated);
    if (Number.isFinite(date.getTime())) {
      $("#updated-date").textContent = date.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
      $("#updated-date").dateTime = project.updated;
    }
  }
  if (primary) {
    const a = primary.aggregate_results || {};
    const delta = a.mean_difference_HL_minus_H ?? primary.primary_result?.value;
    if (typeof delta === "number" && typeof a.H_mean_net_payoff === "number" && a.H_mean_net_payoff !== 0) {
      $("#headline-number").textContent = `${fmt((delta / a.H_mean_net_payoff) * 100, 2)}%`;
    }
    $("#primary-H-payoff").textContent = fmt(a.H_mean_net_payoff, 1);
    $("#primary-HL-payoff").textContent = fmt(a.HL_mean_net_payoff, 1);
    $("#primary-delta").textContent = fmt(delta, 1);
    $("#headline-sample").textContent = `${a.games ?? 12} fresh games · ${a.independent_blocks ?? 6} randomized blocks · 15 rounds per game`;
    $("#primary-summary").textContent = [text(primary.summary), text(primary.design)].filter(Boolean).join(" ");
    renderLinks($("#primary-evidence-links"), primary);
    $("#primary-findings").replaceChildren(...(primary.findings || []).slice(0, 3).map((item) => element("li", "", text(item))));
    $("#primary-limit").textContent = (primary.limits || []).map(text).filter(Boolean).join(" ");
  }
  if (reference) {
    const metric = reference.primary_result || {};
    const value = metric.value ?? reference.aggregate_results?.primary_mean_delta_ref;
    $("#reference-value").textContent = `${fmt(value)} group tokens`;
    $("#reference-summary").textContent = [text(reference.summary), text(reference.sample)].filter(Boolean).join(" ");
    $("#reference-limit").textContent = (reference.limits || []).map(text).filter(Boolean).join(" ");
    renderLinks($("#reference-links"), reference);
  }
  if (forecast) {
    $("#forecast-summary").textContent = [text(forecast.summary), text(forecast.design)].filter(Boolean).join(" ");
    $("#forecast-limit").textContent = (forecast.limits || []).map(text).filter(Boolean).join(" ");
    renderLinks($("#forecast-links"), forecast);
  }
}
function createStudy(study) {
  const item = element("article", "registry-entry");
  item.id = `study-${study.id}`;
  const meta = element("div", "entry-meta");
  meta.append(element("span", `status-label ${study.status}`, statusNames[study.status] || study.status));
  if (scopeNames[study.research_status]) meta.append(element("span", "research-status", scopeNames[study.research_status]));
  const body = element("div", "entry-body");
  body.append(element("h3", "", text(study.title)));
  if (study.sample) body.append(element("p", "entry-sample", text(study.sample)));
  if (study.summary) body.append(element("p", "entry-summary", text(study.summary)));
  const result = study.primary_result;
  if (result && result.label !== "Scope") {
    const value = typeof result.value === "number" ? fmt(result.value) : text(result.value);
    body.append(element("p", "entry-result", `${result.label}: ${value}${result.unit ? ` ${result.unit}` : ""}`));
  }
  const links = element("div", "artifact-links");
  renderLinks(links, study);
  body.append(links);
  if (Array.isArray(study.limits) && study.limits.length) {
    const details = element("details", "study-scope");
    details.append(element("summary", "", "Design and scope"));
    if (study.design) details.append(element("p", "", text(study.design)));
    for (const limit of study.limits) details.append(element("p", "", text(limit)));
    body.append(details);
  }
  item.append(meta, body);
  return item;
}
function renderStudies() {
  const query = state.query.trim().toLowerCase();
  const matches = state.studies.filter(
    (s) =>
      (state.status === "all" || s.status === state.status) &&
      [s.id, s.version, s.title, s.summary, s.sample, s.design, s.research_status, ...(s.findings || [])]
        .map(text)
        .join(" ")
        .toLowerCase()
        .includes(query)
  );
  const shown = matches.slice(0, state.limit);
  $("#study-list").replaceChildren(...shown.map(createStudy));
  const label = state.status === "all" ? "studies" : `${state.status} studies`;
  $("#registry-count").textContent = `${shown.length} of ${matches.length} ${label}${query ? " matching your search" : ""}`;
  if (!matches.length) $("#study-list").append(element("p", "empty-results", "No studies match these filters."));
  const more = $("#registry-more");
  more.replaceChildren();
  if (shown.length < matches.length) {
    const button = element("button", "text-control show-more", `Show ${Math.min(8, matches.length - shown.length)} more studies`);
    button.addEventListener("click", () => {
      state.limit += 8;
      renderStudies();
    });
    more.append(button);
  }
  document.querySelectorAll("[data-status]").forEach((button) => {
    const selected = button.dataset.status === state.status;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}
function installControls() {
  document.querySelectorAll("[data-status]").forEach((button) =>
    button.addEventListener("click", () => {
      state.status = button.dataset.status;
      state.limit = 8;
      renderStudies();
    })
  );
  $("#study-search").addEventListener("input", (event) => {
    state.query = event.target.value;
    state.limit = 8;
    renderStudies();
  });
  const tabs = [...document.querySelectorAll("[data-figure]")];
  const selectTab = (tab) => {
    tabs.forEach((button) => {
      const selected = button === tab;
      button.setAttribute("aria-selected", String(selected));
      button.setAttribute("aria-pressed", String(selected));
      button.tabIndex = selected ? 0 : -1;
      button.classList.toggle("active", selected);
      $(`#${button.getAttribute("aria-controls")}`).hidden = !selected;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      if (event.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (event.key === "Home") next = tabs[0];
      if (event.key === "End") next = tabs[tabs.length - 1];
      if (next) {
        event.preventDefault();
        selectTab(next);
        next.focus();
      }
    });
  });
}
async function init() {
  installControls();
  try {
    const response = await fetch(REGISTRY, { cache: "no-store" });
    if (!response.ok) throw new Error("Registry unavailable");
    const registry = await response.json();
    if (!Array.isArray(registry.studies)) throw new Error("Invalid study registry");
    const ids = new Set();
    for (const study of registry.studies) {
      if (!study.id || ids.has(study.id) || !Object.hasOwn(statusNames, study.status)) throw new Error("Invalid study identity or status");
      ids.add(study.id);
    }
    state.studies = registry.studies;
    state.loaded = true;
    renderFeatured(state.studies, registry.project);
    for (const value of ["all", "completed", "archived", "planned"]) {
      $(`#count-${value}`).textContent = value === "all" ? state.studies.length : state.studies.filter((s) => s.status === value).length;
    }
    renderStudies();
    document.documentElement.dataset.registryLoaded = "true";
  } catch (error) {
    $("#registry-count").textContent = "Registry unavailable";
    $("#registry-error").hidden = false;
    document.documentElement.dataset.registryLoaded = "error";
  }
}
init();
