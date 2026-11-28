const fs = require("fs");
const vm = require("vm");
const assert = require("node:assert/strict");
const root = process.argv[2] || require("path").resolve(__dirname, "..");
class Node {
  constructor(tag = "div") {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.textContent = "";
    this.classList = { toggle() {} };
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes) {
    this.children = [...nodes];
  }
  setAttribute(key, value) {
    this.attributes[key] = String(value);
  }
  addEventListener(key, fn) {
    this.listeners[key] = fn;
  }
  querySelectorAll() {
    return [];
  }
}
const nodes = new Map();
const filters = ["all", "completed", "archived", "planned"].map((s) => {
  const n = new Node("button");
  n.dataset.status = s;
  return n;
});
const document = {
  baseURI: "https://dorisduowang.github.io/pgg-feasibility/",
  createElement: (tag) => new Node(tag),
  createTextNode: (text) => String(text),
  querySelector: (selector) => {
    if (!nodes.has(selector)) nodes.set(selector, new Node());
    return nodes.get(selector);
  },
  querySelectorAll: (selector) => (selector === "[data-status]" ? filters : []),
  documentElement: { dataset: {} },
};
const context = vm.createContext({ document, URL, console });
const source = fs.readFileSync(root + "/research.js", "utf8").replace(/\ninit\(\);\s*$/, "");
vm.runInContext(source + "\nthis.ui={state,renderStudies,renderFeatured,readableHref,safeHref};", context);
const { ui } = context;
const registry = JSON.parse(fs.readFileSync(root + "/data/research_registry.json", "utf8"));
ui.state.studies = registry.studies;
const passed = [];
function check(name, fn) {
  fn();
  passed.push(name);
}
check("all registry renders eight of 34", () => {
  ui.renderStudies();
  assert.equal(nodes.get("#registry-count").textContent, "8 of 34 studies");
  assert.equal(nodes.get("#study-list").children.length, 8);
});
check("featured renderer uses the completed announcement study", () => {
  ui.renderFeatured(registry.studies, registry.project);
  assert.equal(nodes.get("#primary-H-payoff").textContent, "325.28");
  assert.equal(nodes.get("#primary-SHADOW-payoff").textContent, "329.51");
  assert.equal(nodes.get("#primary-LIVE-payoff").textContent, "275.32");
  assert.equal(nodes.get("#primary-delta").textContent, "−54.19");
  assert.equal(nodes.get("#headline-number").textContent, "−16.45%");
  assert.match(nodes.get("#headline-sample").textContent, /^60 randomized blocks with 180 fresh game openings/);
  assert.doesNotMatch(nodes.get("#primary-summary").textContent, /367/);
});
check("ID search opacity finds shelved design", () => {
  ui.state.query = "opacity";
  ui.renderStudies();
  assert.equal(nodes.get("#study-list").children.length, 1);
  assert.equal(nodes.get("#study-list").children[0].id, "study-opacity-shelved");
});
check("version search finds registered version text", () => {
  ui.state.query = "controlled reference inheritance; original threshold";
  ui.renderStudies();
  assert.equal(nodes.get("#study-list").children.length, 1);
  assert.equal(nodes.get("#study-list").children[0].id, "study-reference-inheritance");
});
check("planned status displays exactly two unrun studies", () => {
  ui.state.query = "";
  ui.state.status = "planned";
  ui.renderStudies();
  assert.equal(nodes.get("#registry-count").textContent, "2 of 2 planned studies");
  assert.equal(nodes.get("#study-list").children.length, 2);
});
check("archived status paginates 16 correctly", () => {
  ui.state.status = "archived";
  ui.state.limit = 8;
  ui.renderStudies();
  assert.equal(nodes.get("#registry-count").textContent, "8 of 16 archived studies");
  ui.state.limit = 16;
  ui.renderStudies();
  assert.equal(nodes.get("#registry-count").textContent, "16 of 16 archived studies");
  assert.equal(nodes.get("#registry-more").children.length, 0);
});
check("unmatched query displays explicit empty state", () => {
  ui.state.status = "all";
  ui.state.query = "not-a-real-study-identifier";
  ui.renderStudies();
  assert.equal(nodes.get("#registry-count").textContent, "0 of 0 studies matching your search");
  assert.equal(nodes.get("#study-list").children[0].textContent, "No studies match these filters.");
});
check("GitHub deep reading works for mirrored site", () => {
  for (const path of ["docs/overview.md", "studies/current_policy/data.json", "studies/current_policy/code/ledger.py"])
    assert.equal(ui.readableHref(path), "https://github.com/dorisduowang/pgg-feasibility/blob/main/" + path);
  assert.equal(
    ui.readableHref("studies/current_policy/code/"),
    "https://github.com/dorisduowang/pgg-feasibility/tree/main/studies/current_policy/code/"
  );
});
check("registry figures and archive remain local", () => {
  for (const p of ["data/research_registry.json", "figures/full_policy_comparison.svg", "archive/qwen-20261120/index.html"])
    assert.equal(ui.readableHref(p), p);
});
check("non-web schemes and machine paths rejected", () => {
  for (const p of ["javascript:alert(1)", "file:///Users/example", "/Users/example", "/scratch/private"]) assert.equal(ui.safeHref(p), null);
});
const result = {
  kind: "PURE_STATIC_UI_CHECK_NOT_MODEL_DATA",
  passed: passed.length,
  checks: passed,
  registry_counts: {
    all: registry.studies.length,
    ...Object.fromEntries(["completed", "archived", "planned"].map((s) => [s, registry.studies.filter((x) => x.status === s).length])),
  },
  limitations: ["Minimal DOM stubs test renderer behavior and URL rewriting; browser visual interaction is checked separately."],
};
fs.writeFileSync(root + "/docs/SITE_UI_STATIC_CHECK.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
