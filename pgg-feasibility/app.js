const $ = (selector) => document.querySelector(selector);
const NS = "http://www.w3.org/2000/svg";
const colors = { ink: "#333", blue: "#347c9c", orange: "#b67239", pale: "#faf1e7", gray: "#aaa" };
let data,
  selectedRound = 10,
  selectedPlayer = "P4",
  stage = 0,
  showStates = false,
  masked = false,
  maskMessage;
let pathScale;
let punishmentView = "recorded";
const fmt = (v, d = 3) => (v == null ? "Not scored" : v.toFixed(d));
const sign = (v) => (v == null ? "No next round" : `${v > 0 ? "+" : ""}${fmt(v)}`);

function svgNode(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (text !== undefined) node.textContent = text;
  return node;
}
function add(parent, tag, attrs = {}, text) {
  const node = svgNode(tag, attrs, text);
  parent.append(node);
  return node;
}
function canvas(id, height) {
  const parent = $(id),
    width = Math.max(280, parent.clientWidth);
  const svg = svgNode("svg", { viewBox: `0 0 ${width} ${height}`, role: "group" });
  parent.replaceChildren(svg);
  return { svg, width, height };
}
function line(svg, x1, y1, x2, y2, attrs = {}) {
  return add(svg, "line", { x1, y1, x2, y2, ...attrs });
}
function label(svg, x, y, text, attrs = {}) {
  const node = add(svg, "text", { x, y, ...attrs }, text);
  if (attrs.fill) node.style.fill = attrs.fill;
  return node;
}
function path(rows, x, y, key) {
  return rows
    .filter((r) => r[key] != null)
    .map((r, i) => `${i ? "L" : "M"}${x(r.round)},${y(r[key])}`)
    .join(" ");
}
function accessible(node, text, activate) {
  node.setAttribute("tabindex", "0");
  node.setAttribute("role", "button");
  node.setAttribute("aria-label", text);
  add(node, "title", {}, text);
  node.addEventListener("pointerenter", activate);
  node.addEventListener("focus", activate);
  node.addEventListener("click", activate);
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  });
}

function actor(svg, x, y, kind, size = 32, color = colors.ink) {
  return add(svg, "use", { href: `#${kind}-icon`, x: x - size / 2, y, width: size, height: size * 1.3, color });
}
function agentBadge(text) {
  const badge = svgNode("svg", { viewBox: "0 0 40 52", class: "inline-actor", "aria-hidden": "true" });
  add(badge, "use", { href: "#agent-icon" });
  const span = document.createElement("span");
  span.className = "actor-label";
  span.append(badge, document.createTextNode(text));
  return span;
}

function drawPayoff() {
  const contribution = Number($("#payoffControl").value),
    total = contribution + 30,
    sharedReturn = 0.4 * total;
  const { svg, width } = canvas("#payoffChart", 372),
    center = width / 2,
    column = width / 4;
  const defs = add(svg, "defs");
  ["in", "out"].forEach((name, i) => {
    const marker = add(defs, "marker", { id: `fund-${name}`, viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: "auto" });
    add(marker, "path", { d: "M0 0 L8 4 L0 8", fill: i ? colors.blue : "#b6b6b6" });
  });
  [contribution, 10, 10, 10].forEach((c, i) => {
    const x = (i + 0.5) * column,
      kept = 20 - c,
      barWidth = Math.min(160, column * 0.7),
      barLeft = x - barWidth / 2;
    actor(svg, x, 13, "person", 35, i === 0 ? colors.blue : "#888");
    label(svg, x, 78, `P${i + 1}`, { "text-anchor": "middle", class: "panel-label" });
    label(svg, x, 100, "20 tokens", { "text-anchor": "middle" });
    label(svg, x, 126, `Give ${c}`, { "text-anchor": "middle", fill: i === 0 ? colors.blue : "#777" });
    line(svg, x, 137, center - 30 + i * 20, 164, { stroke: "#b6b6b6", "marker-end": "url(#fund-in)" });
    line(svg, center - 30 + i * 20, 224, x, 253, { stroke: "#9ebfce", "marker-end": "url(#fund-out)" });
    label(svg, x, 276, `Keep ${kept}`, { "text-anchor": "middle" });
    label(svg, x, 297, `Return ${sharedReturn.toFixed(1)}`, { "text-anchor": "middle", fill: colors.blue });
    add(svg, "rect", { x: barLeft, y: 313, width: (barWidth * kept) / 40, height: 10, fill: "#a5a5a5" });
    add(svg, "rect", { x: barLeft + (barWidth * kept) / 40, y: 313, width: (barWidth * sharedReturn) / 40, height: 10, fill: colors.blue });
    label(svg, x, 350, `Net ${(kept + sharedReturn).toFixed(1)}`, { "text-anchor": "middle", class: "panel-label" });
  });
  add(svg, "ellipse", { cx: center, cy: 193, rx: Math.min(116, width * 0.32), ry: 34, fill: "white", stroke: "#9ebfce" });
  label(svg, center, 180, "Shared fund", { "text-anchor": "middle", "font-size": 14 });
  label(svg, center, 203, `${total} × 1.6 = ${(1.6 * total).toFixed(1)}`, { "text-anchor": "middle", class: "panel-label" });
  $("#payoffOutput").textContent = contribution;
  $("#payoffSummary").textContent =
    `P1 earns ${(20 - contribution + sharedReturn).toFixed(1)} tokens this round, and the group earns ${(80 + 0.6 * total).toFixed(1)} tokens in total.`;
}

function drawRepeat() {
  const { svg, width } = canvas("#repeatDiagram", 112),
    small = width < 540,
    size = small ? 16 : 24,
    spacing = small ? 18 : 28;
  const positions = [0.16, 0.5, 0.84].map((v) => v * width);
  positions.forEach((x, i) => {
    for (let p = 0; p < 4; p++) actor(svg, x + (p - 1.5) * spacing, 21, "person", size, p === 0 ? colors.blue : "#888");
    label(svg, x, 85, `Round ${[1, 2, 15][i]}`, { "text-anchor": "middle", "font-size": 14 });
    if (i < 2) {
      const start = x + spacing * 2.1,
        end = positions[i + 1] - spacing * 2.1;
      line(svg, start, 41, end, 41, { stroke: "#bbb" });
      add(svg, "path", { d: `M${end - 5} 37 l5 4 l-5 4`, fill: "none", stroke: "#999" });
      if (i === 1) label(svg, (start + end) / 2, 29, "...", { "text-anchor": "middle" });
    }
  });
}

function drawClock() {
  const svg = $("#clockDiagram"),
    width = svg.clientWidth || 900;
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${width} 110`);
  const positions = [0.125, 0.375, 0.625, 0.875].map((n) => n * width);
  for (let i = 0; i < 3; i++) {
    line(svg, positions[i] + 13, 42, positions[i + 1] - 15, 42, { stroke: "#ccc" });
    add(svg, "path", { d: `M${positions[i + 1] - 21},38 l6,4 l-6,4`, fill: "none", stroke: "#aaa" });
  }
  positions.forEach((x, i) => {
    add(svg, "circle", {
      cx: x,
      cy: 42,
      r: i === stage ? 12 : 7,
      fill: i === stage ? colors.ink : "white",
      stroke: i === stage ? colors.ink : "#bbb",
      "stroke-width": 1.3,
    });
    label(svg, x, 84, ["Before choices", "Hidden choices", "Public record", "t + 1"][i], {
      "text-anchor": "middle",
      fill: "#888",
      "font-size": width < 500 ? 10 : 12,
    });
  });
  const readings = [
    [
      "At message time",
      "the current punishment state is fixed. Each player knows the completed history, but the other current messages and contribution choices are not yet visible.",
    ],
    [
      "At contribution time",
      "all 4 current messages have been broadcast. Actual current choices remain hidden until everyone submits a contribution, preserving simultaneous decisions.",
    ],
    [
      "At settlement",
      "the current contributions and net payoffs are revealed. The history rule also announces the next punishment state, making it known at the forecast origin.",
    ],
    [
      "In the next round",
      "players enter under the state already announced. The next contribution change is observed after this round completes, keeping it out of the earlier information set.",
    ],
  ];
  $("#stageReading").replaceChildren();
  const strong = document.createElement("strong");
  strong.textContent = readings[stage][0] + ", ";
  $("#stageReading").append(strong, document.createTextNode(readings[stage][1]));
  document.querySelectorAll("[data-stage]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.stage) === stage)));
}

function punishmentLedger(contributions, active) {
  const levels = contributions.map((c) => (active ? Math.floor(Math.max(0, 10 - c) / 3) : 0));
  const total = contributions.reduce((a, b) => a + b, 0),
    points = levels.reduce((a, b) => a + b, 0);
  return contributions.map((c, i) => {
    const base = 20 - c + 0.4 * total,
      sender = points - levels[i],
      fine = 9 * levels[i];
    return { contribution: c, level: levels[i], base, sender, fine, net: base - sender - fine };
  });
}

function drawPunishmentGate(t, illustration) {
  const small = innerWidth < 650,
    { svg, width } = canvas("#punishmentGate", illustration ? 80 : small ? 223 : 167);
  if (illustration) {
    label(svg, width / 2, 30, "Hypothetical calculation", { "text-anchor": "middle", class: "panel-label" });
    label(svg, width / 2, 56, "Punishment assumed active", { "text-anchor": "middle", fill: colors.orange });
    return;
  }
  const current = data.rounds[t - 1],
    previous = data.rounds[t - 2],
    left = small ? width / 2 : width * 0.25,
    right = width * 0.75;
  label(svg, left, 20, previous ? `After round ${t - 1}` : "Start of the game", { "text-anchor": "middle", class: "panel-label" });
  if (previous) {
    previous.contributions.forEach((c, i) => {
      const x = left + (i - 1.5) * 48;
      actor(svg, x, 35, "agent", 24);
      label(svg, x, 88, `P${i + 1} ${c}`, { "text-anchor": "middle" });
    });
    label(svg, left, 115, `Minimum ${Math.min(...previous.contributions)}`, { "text-anchor": "middle" });
    if (!small) label(svg, left, 140, t - 1 >= 3 ? "Eligible to warn" : "Before eligibility", { "text-anchor": "middle", fill: "#888" });
  } else label(svg, left, 85, "No previous contributions", { "text-anchor": "middle" });
  if (small) {
    line(svg, left, 126, left, 146, { stroke: "#aaa" });
    add(svg, "path", { d: `M${left - 4} 140 l4 6 l4 -6`, fill: "none", stroke: "#aaa" });
  } else {
    line(svg, left + 120, 70, right - 92, 70, { stroke: "#aaa" });
    add(svg, "path", { d: `M${right - 98} 66 l6 4 l-6 4`, fill: "none", stroke: "#aaa" });
  }
  const x = small ? left : right,
    y = small ? 171 : 54;
  label(svg, x, y, `Round ${t}`, { "text-anchor": "middle", class: "panel-label" });
  label(svg, x, y + 26, current.active ? "Punishment active" : "Punishment inactive", {
    "text-anchor": "middle",
    fill: current.active ? colors.orange : "#777",
  });
  if (!small) label(svg, x, 123, "State fixed before choices", { "text-anchor": "middle", fill: "#888" });
}

function drawPunishment() {
  const illustration = punishmentView === "illustration",
    t = Number($("#punishmentRound").value),
    row = data.rounds[t - 1];
  const choice = Number($("#sanctionContribution").value),
    contributions = illustration ? [10, 10, choice, 10] : row.contributions;
  const active = illustration || row.active,
    ledger = punishmentLedger(contributions, active);
  const costs = ledger.reduce((s, p) => s + p.sender + p.fine, 0),
    net = ledger.reduce((s, p) => s + p.net, 0);
  $("#recordedPunishmentControls").hidden = illustration;
  $("#rulePunishmentControls").hidden = !illustration;
  $("#punishmentRoundOutput").textContent = t;
  $("#sanctionContributionOutput").textContent = choice;
  document
    .querySelectorAll("[data-punishment-view]")
    .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.punishmentView === punishmentView)));
  drawPunishmentGate(t, illustration);
  const previous = data.rounds[t - 2];
  $("#activationReading").textContent = illustration
    ? "The other 3 agents each contribute 10, and the active state is held fixed as P3 changes its contribution. These are illustrative payoffs from the frozen rule, with no new agent decisions generated."
    : !previous
      ? "Round 1 begins with punishment inactive, and no earlier contribution can activate it."
      : t <= 3
        ? `The minimum in round ${t - 1} is ${Math.min(...previous.contributions)}, but that round cannot activate punishment for round ${t}. Rounds 1 through 3 are always inactive, keeping this round protected.`
        : `The minimum in round ${t - 1} is ${Math.min(...previous.contributions)}, ${row.active ? "meeting" : "above"} the trigger of 7 or less. Punishment is announced ${row.active ? "active" : "inactive"} for round ${t}, before its contributions are chosen.`;
  const { svg, width } = canvas("#deductionChart", 365),
    column = width / 4;
  const defs = add(svg, "defs"),
    marker = add(defs, "marker", { id: "deduction-arrow", viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: "auto" });
  add(marker, "path", { d: "M0 0 L8 4 L0 8", fill: colors.orange });
  ledger.forEach((p, i) => {
    const x = (i + 0.5) * column,
      removed = p.sender + p.fine;
    const g = add(svg, "g", {
      "data-ledger-agent": `P${i + 1}`,
      "data-contribution": p.contribution,
      "data-level": p.level,
      "data-base": p.base,
      "data-sender": p.sender,
      "data-fine": p.fine,
      "data-net": p.net,
    });
    actor(g, x, 8, "agent", 34, p.fine ? "#9c4e45" : p.sender ? colors.orange : colors.ink);
    label(g, x, 74, `P${i + 1}`, { "text-anchor": "middle", class: "panel-label" });
    label(g, x, 98, `Give ${p.contribution}`, { "text-anchor": "middle" });
    label(g, x, 121, `Base ${fmt(p.base, 1)}`, { "text-anchor": "middle" });
    label(g, x, 149, `Send cost ${p.sender}`, { "text-anchor": "middle", fill: p.sender ? colors.orange : "#888" });
    label(g, x, 172, `Own fine ${p.fine}`, { "text-anchor": "middle", fill: p.fine ? "#9c4e45" : "#888" });
    const end = width / 2 + (i - 1.5) * 18;
    line(g, x, 192, end, 254, {
      stroke: removed ? colors.orange : "#ddd",
      "stroke-dasharray": removed ? "none" : "3 4",
      ...(removed ? { "marker-end": "url(#deduction-arrow)" } : {}),
    });
    if (removed) {
      const cx = x + (end - x) * 0.43,
        cy = 219;
      add(g, "circle", { cx, cy, r: 13, fill: "white", stroke: colors.orange });
      label(g, cx, cy + 4, removed, { "text-anchor": "middle", fill: colors.orange });
    }
    label(g, x, 350, `Net ${fmt(p.net, 1)}`, { "text-anchor": "middle", class: "panel-label" });
  });
  const edge = Math.min(132, width * 0.4);
  line(svg, width / 2 - edge, 262, width / 2 + edge, 262, { stroke: costs ? colors.orange : "#ccc" });
  label(svg, width / 2, 285, costs ? "Removed from group payoff" : "No tokens removed", { "text-anchor": "middle" });
  label(svg, width / 2, 308, `${costs} tokens`, { "text-anchor": "middle", class: "panel-label" });
  const gap = Math.max(0, 10 - contributions[2]),
    q = ledger[2].level;
  const outcome = illustration
    ? `P3 has a contribution gap of ${gap}, giving floor(${gap} / 3) = ${q} punishment point${q === 1 ? "" : "s"} from each partner. Each partner pays ${q} token${q === 1 ? "" : "s"}, and P3 loses ${ledger[2].fine} tokens in recipient fines. Group net payoff is ${fmt(net, 1)} after ${costs} tokens leave the group.`
    : `Round ${t} is ${active ? "active" : "inactive"}, and the observed contributions are ${contributions.join(", ")}. Sender costs total ${ledger.reduce((s, p) => s + p.sender, 0)} and recipient fines total ${ledger.reduce((s, p) => s + p.fine, 0)}, leaving group net payoff at ${fmt(net, 1)} tokens. ` +
      (!row.has_next_round
        ? "The game ends here, so these contributions cannot activate another round."
        : `Round ${t + 1} is announced ${row.next_active ? "active" : "inactive"} after this settlement.`);
  $("#punishmentReading").textContent = outcome;
  const basis = "Base combines kept tokens with the public fund return, and net subtracts both sender costs and recipient fines. ";
  $("#punishmentCaption").textContent = illustration
    ? basis + "Solid arrows show hypothetical deductions leaving the group, with the amount inside each token symbol giving the deduction."
    : basis + "The recorded view uses the original choices, and dashed paths mark zero penalty deductions.";
}

function drawPath() {
  const mobile = innerWidth < 540,
    height = mobile ? 410 : 470;
  const { svg, width } = canvas("#pathChart", height),
    left = mobile ? 40 : 58,
    right = 22;
  const top = 30,
    bottom = mobile ? 182 : 226,
    scoreTop = mobile ? 244 : 285,
    scoreBottom = mobile ? 340 : 393;
  const x = (t) => left + ((t - 1) * (width - left - right)) / 14;
  const cy = (v) => bottom - (v / 20) * (bottom - top),
    sy = (v) => scoreBottom - (v / 4.7) * (scoreBottom - scoreTop);
  pathScale = { x, cy, sy, top, scoreBottom };
  data.rounds
    .filter((r) => r.active)
    .forEach((r) =>
      add(svg, "rect", {
        x: x(r.round) - ((width - left - right) / 14) * 0.43,
        y: top,
        width: ((width - left - right) / 14) * 0.86,
        height: bottom - top,
        fill: colors.pale,
      })
    );
  [0, 5, 10, 15, 20].forEach((v) => {
    line(svg, left, cy(v), width - right, cy(v), { class: "grid" });
    label(svg, left - 10, cy(v) + 4, v, { "text-anchor": "end" });
  });
  [0, 2, 4].forEach((v) => {
    line(svg, left, sy(v), width - right, sy(v), { class: "grid" });
    label(svg, left - 10, sy(v) + 4, v, { "text-anchor": "end" });
  });
  label(svg, left, 16, "Contribution in tokens", { class: "panel-label" });
  label(svg, left, scoreTop - 15, "Maximum message loss", { class: "panel-label" });
  $("#agentLegend").hidden = !$("#individuals").checked;
  if (!mobile) label(svg, width - right, scoreTop - 15, "Nats per target token", { "text-anchor": "end", fill: "#888", "font-size": 12 });
  data.rounds.forEach((r) => {
    const band = add(svg, "rect", {
      x: x(r.round) - (width - left - right) / 14 / 2,
      y: top,
      width: (width - left - right) / 14,
      height: scoreBottom - top,
      fill: "transparent",
    });
    band.addEventListener("pointerenter", () => selectRound(r.round));
    if (!mobile || r.round % 2 === 1) label(svg, x(r.round), scoreBottom + 22, r.round, { "text-anchor": "middle" });
    if (r.has_next_round) {
      const dot = add(svg, "circle", {
        cx: x(r.round),
        cy: height - 21,
        r: 4.5,
        fill: r.next_active ? colors.orange : "white",
        stroke: r.next_active ? colors.orange : "#aaa",
      });
      accessible(dot, `Round ${r.round}, announced next state ${r.next_active ? "active" : "inactive"}`, () => selectRound(r.round));
    } else label(svg, x(r.round), height - 17, "End", { "text-anchor": "middle", "font-size": 11, fill: "#888" });
  });
  if ($("#individuals").checked) {
    $("#agentLegend").replaceChildren();
    ["#999", "#a1a9b5", "#97b3aa", "#b9a58f"].forEach((color, i) => {
      const d = data.rounds.map((r, j) => `${j ? "L" : "M"}${x(r.round)},${cy(r.contributions[i])}`).join(" ");
      add(svg, "path", { d, fill: "none", stroke: color, "stroke-width": 1.2, "pointer-events": "none" });
      const badge = agentBadge(`P${i + 1}`);
      badge.style.borderBottom = `2px solid ${color}`;
      $("#agentLegend").append(badge);
    });
  }
  add(svg, "path", {
    d: path(data.rounds, x, cy, "mean_contribution"),
    fill: "none",
    stroke: colors.ink,
    "stroke-width": 2.4,
    "pointer-events": "none",
  });
  data.rounds.forEach((r) =>
    add(svg, "circle", {
      cx: x(r.round),
      cy: cy(r.mean_contribution),
      r: 3.4,
      fill: "white",
      stroke: colors.ink,
      "stroke-width": 1.8,
      "pointer-events": "none",
    })
  );
  add(svg, "path", { d: path(data.rounds, x, sy, "score_max"), fill: "none", stroke: colors.blue, "stroke-width": 2.1, "pointer-events": "none" });
  data.rounds.slice(1).forEach((r) =>
    r.messages.forEach((m) => {
      const point = add(svg, "circle", {
        cx: x(r.round),
        cy: sy(m.score),
        r: m.player === r.max_player ? 4 : 3,
        fill: m.player === r.max_player ? colors.blue : "#c6d7de",
        stroke: "white",
        "stroke-width": 0.7,
        "data-score-point": `${r.round}-${m.player}`,
      });
      accessible(point, `Round ${r.round} ${m.player}, loss ${fmt(m.score)}`, () => selectRound(r.round, m.player));
    })
  );
  line(svg, x(selectedRound), top, x(selectedRound), scoreBottom, {
    id: "pathGuide",
    stroke: "#999",
    "stroke-dasharray": "3 4",
    "pointer-events": "none",
  });
  add(svg, "circle", { id: "contributionFocus", cx: 0, cy: 0, r: 6, fill: "white", stroke: colors.ink, "stroke-width": 2, "pointer-events": "none" });
  updatePathFocus();
}

function updatePathFocus() {
  if (!pathScale) return;
  const row = data.rounds[selectedRound - 1],
    { x, cy } = pathScale;
  $("#pathGuide").setAttribute("x1", x(selectedRound));
  $("#pathGuide").setAttribute("x2", x(selectedRound));
  $("#contributionFocus").setAttribute("cx", x(selectedRound));
  $("#contributionFocus").setAttribute("cy", cy(row.mean_contribution));
  document.querySelectorAll("[data-score-point]").forEach((p) => {
    const yes = p.dataset.scorePoint === `${selectedRound}-${selectedPlayer}`;
    p.setAttribute("r", yes ? 6 : 3.5);
    p.setAttribute("stroke", yes ? colors.ink : "white");
  });
}

function selectRound(t, player) {
  selectedRound = Number(t);
  const row = data.rounds[selectedRound - 1];
  selectedPlayer = player || row.max_player || "P1";
  $("#roundControl").value = selectedRound;
  $("#roundOutput").textContent = selectedRound;
  const next = row.has_next_round ? `the announced next state is ${row.next_active ? "active" : "inactive"}` : "the game ends after this round";
  const score = row.score_max == null ? "No language score is defined for round 1." : `The group score is ${fmt(row.score_max)}.`;
  $("#roundAnnotation").textContent =
    `Round ${selectedRound} has a mean contribution of ${fmt(row.mean_contribution)}. Current punishment is ${row.active ? "active" : "inactive"}, and ${next}. ${score}`;
  const body = $("#messages");
  body.replaceChildren();
  row.messages.forEach((m) => {
    const tr = document.createElement("tr");
    if (m.player === selectedPlayer) tr.className = "selected";
    const td = document.createElement("td"),
      b = document.createElement("button");
    b.append(agentBadge(m.player));
    b.setAttribute("aria-label", `Inspect round ${selectedRound} agent ${m.player}`);
    b.addEventListener("click", () => selectRound(selectedRound, m.player));
    td.append(b);
    tr.append(td);
    [m.message, fmt(m.score, 6), String(m.contribution)].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      tr.append(cell);
    });
    body.append(tr);
  });
  const notes = {
    1: "There is no preceding public-message round, so the first 4 messages remain unscored.",
    10: "P4 requests 5 but chooses 10. Under the current active rule, a contribution of 5 would incur a recipient fine of 9, making the public claim about avoiding sanctions inconsistent with that rule.",
    14: "All 4 messages are identical, and their small loss differences arise under the fixed player-specific headers. The following mean contribution falls by 9.500 tokens.",
    15: "Every player chooses 0. The terminal messages remain text observations, with no round 16 to predict.",
  };
  $("#messageReading").textContent =
    notes[selectedRound] ||
    `The observed next contribution change is ${sign(row.next_change)} tokens. The language score did not activate punishment in this game.`;
  updatePathFocus();
}

function showExample(t) {
  const round = Number(t),
    row = data.rounds[round - 1],
    player = round === 10 ? "P4" : round === 15 ? "P2" : "P3";
  const m = row.messages.find((x) => x.player === player);
  $("#exampleLabel").replaceChildren(agentBadge(`Round ${round}, ${player}`));
  $("#exampleText").textContent = m.message;
  const description =
    round === 10
      ? "This message scores 4.237 while its author contributes 10. The next state is inactive, and the next mean falls by 7.500 tokens."
      : round === 14
        ? "The group score is 2.144 before the mean falls from 9.5 to 0. The next inactive state and the final-round boundary are already known."
        : "This explicit free-riding appeal scores 3.974, and all players contribute 0. Its score is below the round 10 cooperative-sounding request.";
  $("#exampleNote").textContent = description;
  document.querySelectorAll("[data-text-example]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.textExample) === round)));
}

function drawTransitions() {
  const mobile = innerWidth < 540,
    { svg, width } = canvas("#transitionChart", mobile ? 330 : 395);
  const left = mobile ? 43 : 62,
    right = 24,
    top = 30,
    bottom = mobile ? 268 : 323;
  const x = (v) => left + ((v - 1.5) / 3.2) * (width - left - right),
    y = (v) => bottom - ((v + 11) / 22) * (bottom - top);
  [-10, -5, 0, 5, 10].forEach((v) => {
    line(svg, left, y(v), width - right, y(v), { class: v === 0 ? "baseline" : "grid" });
    label(svg, left - 10, y(v) + 4, v, { "text-anchor": "end" });
  });
  [2, 2.5, 3, 3.5, 4, 4.5].forEach((v) => {
    if (!mobile || Number.isInteger(v)) label(svg, x(v), bottom + 22, v, { "text-anchor": "middle" });
  });
  label(svg, left, 14, "Next mean contribution change", { class: "panel-label" });
  label(svg, (left + width - right) / 2, bottom + 47, "Current group surprisal", { "text-anchor": "middle", class: "axis-label" });
  const rows = data.rounds.filter((r) => r.round >= 3 && r.round <= 14);
  rows.forEach((r) => {
    const group = add(svg, "g", { "data-transition": r.round });
    const c = add(group, "circle", {
      cx: x(r.score_max),
      cy: y(r.next_change),
      r: 6.5,
      fill: showStates ? (r.next_active ? colors.blue : colors.orange) : "#888",
      stroke: "white",
      "stroke-width": 1.2,
    });
    const dx = mobile && r.round === 5 ? 5 : mobile && r.round === 9 ? -5 : 0;
    label(group, x(r.score_max) + dx, y(r.next_change) + (r.next_active ? -12 : 22), r.round, {
      "text-anchor": dx > 0 ? "start" : dx < 0 ? "end" : "middle",
      "font-size": mobile ? 11 : 12,
    });
    accessible(c, `Round ${r.round}, score ${fmt(r.score_max)}, next change ${sign(r.next_change)}`, () => {
      $("#pointReading").textContent =
        `Round ${r.round} has a score of ${fmt(r.score_max)}, and the next mean changes by ${sign(r.next_change)} tokens. The announced next state is ${r.next_active ? "active" : "inactive"}.`;
      document.querySelectorAll("[data-transition]").forEach((g) => g.setAttribute("opacity", Number(g.dataset.transition) === r.round ? 1 : 0.35));
    });
    group.addEventListener("pointerleave", () => document.querySelectorAll("[data-transition]").forEach((g) => g.setAttribute("opacity", 1)));
  });
  if (showStates) {
    label(svg, width - right, 18, "Blue active next round", { "text-anchor": "end", fill: colors.blue, "font-size": mobile ? 10 : 12 });
    label(svg, width - right, 36, "Ochre inactive next round", { "text-anchor": "end", fill: colors.orange, "font-size": mobile ? 10 : 12 });
  }
  $("#stateColor").setAttribute("aria-pressed", String(showStates));
  $("#stateColor").textContent = showStates ? "Hide the next-state annotation" : "Reveal the announced next state";
}

const numberPattern =
  /\b(?:\d+(?:\.\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi;
function maskReading() {
  $("#maskLabel").replaceChildren(agentBadge(`Round ${maskMessage.round}, ${maskMessage.player}`));
  $("#maskText").replaceChildren();
  if (masked) {
    let start = 0;
    for (const match of maskMessage.message.matchAll(numberPattern)) {
      $("#maskText").append(document.createTextNode(maskMessage.message.slice(start, match.index)));
      const mark = document.createElement("mark");
      mark.textContent = "NUMBER";
      $("#maskText").append(mark);
      start = match.index + match[0].length;
    }
    $("#maskText").append(document.createTextNode(maskMessage.message.slice(start)));
  } else $("#maskText").textContent = maskMessage.message;
  $("#maskNumbers").textContent = `Original loss ${fmt(maskMessage.score)}. Quantity-masked loss ${fmt(maskMessage.quantity_masked_score)}.`;
}

function drawMask() {
  const { svg, width } = canvas("#maskChart", 340),
    left = 48,
    right = 18,
    top = 20,
    bottom = 280;
  const x = (v) => left + ((v - 0.6) / 4) * (width - left - right),
    y = (v) => bottom - ((v - 0.6) / 4) * (bottom - top);
  [1, 2, 3, 4].forEach((v) => {
    line(svg, left, y(v), width - right, y(v), { class: "grid" });
    label(svg, left - 9, y(v) + 4, v, { "text-anchor": "end" });
    label(svg, x(v), bottom + 22, v, { "text-anchor": "middle" });
  });
  line(svg, x(0.6), y(0.6), x(4.6), y(4.6), { stroke: "#bbb", "stroke-dasharray": "3 4" });
  label(svg, left, 13, masked ? "Quantity-masked loss" : "Original loss", { class: "panel-label" });
  label(svg, (left + width - right) / 2, bottom + 48, "Original message loss", { "text-anchor": "middle", class: "axis-label" });
  data.rounds
    .flatMap((r) => r.messages)
    .filter((m) => m.score != null)
    .forEach((m) => {
      const selected = m.round === maskMessage.round && m.player === maskMessage.player;
      const dot = add(svg, "circle", {
        cx: x(m.score),
        cy: y(masked ? m.quantity_masked_score : m.score),
        r: selected ? 6 : 3.5,
        fill: selected ? colors.blue : "#9cbdcc",
        stroke: selected ? colors.ink : "white",
        "stroke-width": selected ? 1.2 : 0.6,
        opacity: 0.85,
      });
      accessible(dot, `Round ${m.round} ${m.player}, original loss ${fmt(m.score)}, masked loss ${fmt(m.quantity_masked_score)}`, () => {
        maskMessage = m;
        maskReading();
        [...svg.querySelectorAll("circle")].forEach((c) => {
          c.setAttribute("r", c === dot ? 6 : 3.5);
          c.setAttribute("fill", c === dot ? colors.blue : "#9cbdcc");
          c.setAttribute("stroke", c === dot ? colors.ink : "white");
        });
      });
    });
  document.querySelectorAll("[data-mask]").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.mask === "masked") === masked)));
  maskReading();
}

function codeExcerpts(snippets) {
  document.querySelectorAll("[data-code]").forEach((code) => {
    const snippet = snippets[code.dataset.code];
    snippet.text.split("\n").forEach((text, i) => {
      const line = document.createElement("span");
      line.className = "code-line";
      line.dataset.line = snippet.first_line + i;
      line.textContent = text || " ";
      code.append(line);
    });
  });
  document.querySelectorAll("[data-source]").forEach((meta) => {
    const s = snippets[meta.dataset.source],
      link = document.createElement("a");
    link.href = s.file;
    link.textContent = s.file;
    link.setAttribute("download", "");
    meta.append(link, document.createTextNode(`, original lines ${s.first_line} through ${s.last_line}`));
  });
  $("#originCode").textContent = [
    "round  next_active  score_max  next_change",
    ...data.rounds
      .filter((r) => r.round >= 3 && r.round <= 14)
      .map((r) => `${String(r.round).padEnd(7)}${String(r.next_active).padEnd(13)}${fmt(r.score_max).padEnd(11)}${sign(r.next_change)}`),
  ].join("\n");
}

async function init() {
  const responses = await Promise.all([fetch("data.json"), fetch("code.json")]);
  if (responses.some((r) => !r.ok)) throw new Error("Article data unavailable");
  const values = await Promise.all(responses.map((r) => r.json()));
  data = values[0];
  maskMessage = data.rounds[9].messages[3];
  codeExcerpts(values[1]);
  drawPayoff();
  drawRepeat();
  drawClock();
  drawPunishment();
  drawPath();
  selectRound(10, "P4");
  showExample(10);
  drawTransitions();
  drawMask();
  $("#payoffControl").addEventListener("input", drawPayoff);
  $("#punishmentRound").addEventListener("input", drawPunishment);
  $("#sanctionContribution").addEventListener("input", drawPunishment);
  document.querySelectorAll("[data-punishment-view]").forEach((b) =>
    b.addEventListener("click", () => {
      punishmentView = b.dataset.punishmentView;
      drawPunishment();
    })
  );
  $("#roundControl").addEventListener("input", (e) => selectRound(e.target.value));
  $("#individuals").addEventListener("change", drawPath);
  $("#stateColor").addEventListener("click", () => {
    showStates = !showStates;
    drawTransitions();
  });
  document.querySelectorAll("[data-stage]").forEach((b) => {
    const show = () => {
      stage = Number(b.dataset.stage);
      drawClock();
    };
    b.addEventListener("pointerenter", show);
    b.addEventListener("focus", show);
    b.addEventListener("click", show);
  });
  document.querySelectorAll("[data-text-example]").forEach((b) => b.addEventListener("click", () => showExample(b.dataset.textExample)));
  document.querySelectorAll("[data-example]").forEach((b) =>
    b.addEventListener("click", () => {
      showExample(b.dataset.example);
      $(".text-figure").scrollIntoView({ behavior: "smooth", block: "center" });
    })
  );
  document.querySelectorAll("[data-mask]").forEach((b) =>
    b.addEventListener("click", () => {
      masked = b.dataset.mask === "masked";
      drawMask();
    })
  );
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawPayoff();
      drawRepeat();
      drawClock();
      drawPunishment();
      drawPath();
      drawTransitions();
      drawMask();
    }, 100);
  });
}
init()
  .then(() => {
    const linkedSection = document.getElementById(window.location.hash.slice(1));
    if (linkedSection) linkedSection.scrollIntoView({ block: "start" });
  })
  .catch((error) => {
    console.error(error);
    $("#loadError").hidden = false;
  });
