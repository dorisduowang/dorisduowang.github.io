const filters = document.querySelector(".filters");

if (filters) {
  const buttons = [...filters.querySelectorAll("[data-filter]")];
  const cards = [...document.querySelectorAll(".work-card")];
  const status = document.querySelector("#filter-status");

  filters.hidden = false;
  filters.addEventListener("click", (event) => {
    const selected = event.target.closest("[data-filter]");
    if (!selected) return;

    const topic = selected.dataset.filter;
    buttons.forEach((button) => button.setAttribute("aria-pressed", String(button === selected)));
    let visible = 0;

    cards.forEach((card) => {
      card.hidden = topic !== "all" && topic !== card.dataset.topic;
      if (!card.hidden) visible += 1;
    });

    status.textContent = `${visible} ${visible === 1 ? "project" : "projects"} shown.`;
  });
}

const marketChart = document.querySelector("[data-market-chart]");

if (marketChart) {
  const days = [...marketChart.querySelectorAll("[data-market-day]")];
  const label = marketChart.querySelector("[data-market-selected-day]");
  const correlation = marketChart.querySelector("[data-market-selected-r]");
  const summary = marketChart.querySelector("[data-market-selected-summary]");
  let activeDay = days.find((day) => day.getAttribute("aria-pressed") === "true");

  marketChart.addEventListener("click", (event) => {
    const day = event.target.closest("[data-market-day]");
    if (!day || day === activeDay) return;

    activeDay?.setAttribute("aria-pressed", "false");
    day.setAttribute("aria-pressed", "true");
    activeDay = day;
    label.textContent = day.dataset.marketDay;
    correlation.textContent = `r = ${day.dataset.marketR}`;
    summary.textContent = day.dataset.marketSummary;
  });

  days.forEach((day) => (day.disabled = false));
  marketChart.querySelector("[data-market-hint]").hidden = false;
}

const pggChartInset = { left: 26, right: 10, top: 16, bottom: 34 };
const pggSource = document.querySelector("[data-pgg-source]");

if (pggSource) {
  loadPgg(pggSource.dataset.pggSource).catch(() => {
    // The original trajectory image remains visible if the data cannot be loaded.
  });
}

async function loadPgg(source) {
  const canvas = document.querySelector("#pgg-chart");
  const context = canvas.getContext("2d");
  if (!context) return;

  const response = await fetch(source);
  if (!response.ok) return;

  const { rounds } = await response.json();
  if (!Array.isArray(rounds) || rounds.length < 2) return;

  const figure = canvas.closest(".pgg-figure");
  const panel = figure.querySelector(".round-panel");
  const input = panel.querySelector("#round-input");
  const play = panel.querySelector(".round-play");
  const playIcon = play.querySelector("span");
  const position = panel.querySelector(".round-position");
  const output = panel.querySelector(".round-detail");
  const agents = panel.querySelector("[data-pgg-agents]");
  const next = panel.querySelector("[data-pgg-next]");
  const playerCount = rounds[0].contributions?.length ?? 0;
  const endowment = 20;
  const agentRows = [];
  let activeIndex = Number(input.value) - 1;
  let timer;

  if (agents) {
    for (let i = 0; i < playerCount; i += 1) {
      const item = document.createElement("li");
      const player = document.createElement("span");
      const bar = document.createElement("span");
      const value = document.createElement("span");
      item.className = "pgg-agent";
      player.className = "pgg-agent-name";
      player.textContent = rounds[0].messages?.[i]?.player ?? `P${i + 1}`;
      bar.className = "pgg-agent-bar";
      bar.setAttribute("aria-hidden", "true");
      value.className = "pgg-agent-value";
      item.append(player, bar, value);
      agents.append(item);
      agentRows.push({ item, value });
    }
  }

  input.max = rounds.length;
  activeIndex = Math.min(activeIndex, rounds.length - 1);
  figure.classList.add("is-interactive");
  panel.hidden = false;

  function selectRound(index) {
    activeIndex = index;
    const row = rounds[index];
    const rule = row.active ? "punishment active" : "punishment inactive";
    input.value = row.round;
    input.setAttribute("aria-valuetext", `Round ${row.round} of ${rounds.length}`);
    position.textContent = `${row.round} / ${rounds.length}`;
    output.value = `Round ${row.round} · ${row.mean_contribution} tokens per player · ${rule}`;
    agentRows.forEach(({ item, value }, i) => {
      const contribution = row.contributions?.[i];
      value.textContent = Number.isFinite(contribution) ? contribution : "Unavailable";
      item.style.setProperty("--contribution", `${Number.isFinite(contribution) ? (contribution / endowment) * 100 : 0}%`);
    });
    if (next) {
      const nextRound = rounds[index + 1];
      next.textContent = nextRound
        ? `Round ${nextRound.round} averaged ${nextRound.mean_contribution} tokens per player.`
        : `Round ${row.round} was the final round.`;
    }
    if (canvas.clientWidth) drawContributionChart(canvas, context, rounds, activeIndex);
  }

  function stopPlayback() {
    window.clearInterval(timer);
    timer = undefined;
    play.setAttribute("aria-label", "Play rounds");
    playIcon.textContent = "▶";
    output.removeAttribute("aria-live");
  }

  input.addEventListener("input", () => {
    stopPlayback();
    selectRound(Number(input.value) - 1);
  });

  canvas.addEventListener("click", (event) => {
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * canvas.clientWidth;
    const y = ((event.clientY - bounds.top) / bounds.height) * canvas.clientHeight;
    const plotWidth = canvas.clientWidth - pggChartInset.left - pggChartInset.right;
    const xInPlot = x - pggChartInset.left;
    if (xInPlot < 0 || xInPlot >= plotWidth || y < pggChartInset.top || y >= canvas.clientHeight - pggChartInset.bottom) return;

    stopPlayback();
    selectRound(Math.floor((xInPlot / plotWidth) * rounds.length));
  });

  play.addEventListener("click", () => {
    if (timer !== undefined) {
      stopPlayback();
      return;
    }

    output.setAttribute("aria-live", "off");
    if (activeIndex === rounds.length - 1) selectRound(0);
    play.setAttribute("aria-label", "Pause rounds");
    playIcon.textContent = "Ⅱ";
    timer = window.setInterval(() => {
      selectRound(activeIndex + 1);
      if (activeIndex === rounds.length - 1) stopPlayback();
    }, 760);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && timer !== undefined) stopPlayback();
  });

  const redraw = () => {
    if (canvas.clientWidth) drawContributionChart(canvas, context, rounds, activeIndex);
  };

  if ("ResizeObserver" in window) {
    new ResizeObserver(redraw).observe(canvas);
  } else {
    window.addEventListener("resize", redraw);
  }

  selectRound(activeIndex);
}

function drawContributionChart(canvas, context, rounds, activeIndex) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const left = pggChartInset.left;
  const right = width - pggChartInset.right;
  const top = pggChartInset.top;
  const bottom = height - pggChartInset.bottom;
  const max = Math.max(10, Math.ceil(Math.max(...rounds.map((row) => row.mean_contribution)) / 5) * 5);
  const step = (right - left) / rounds.length;
  const x = (index) => left + (index + 0.5) * step;
  const y = (value) => bottom - (value / max) * (bottom - top);

  rounds.forEach((row, index) => {
    if (!row.active) return;
    context.fillStyle = "#e4e4e4";
    context.fillRect(x(index) - step / 2, top, step, bottom - top);
  });

  context.font = '12px "DM Sans", sans-serif';
  context.textBaseline = "middle";
  context.textAlign = "right";
  context.lineWidth = 1;
  context.strokeStyle = "#cecece";
  context.fillStyle = "#4a4a4a";

  for (let value = 0; value <= max; value += max / 2) {
    context.beginPath();
    context.moveTo(left, y(value));
    context.lineTo(right, y(value));
    context.stroke();
    context.fillText(value, left - 6, y(value));
  }

  const selectedX = x(activeIndex);
  context.beginPath();
  context.strokeStyle = "#656565";
  context.setLineDash([3, 3]);
  context.moveTo(selectedX, top);
  context.lineTo(selectedX, bottom);
  context.stroke();
  context.setLineDash([]);

  context.beginPath();
  context.strokeStyle = "#202020";
  context.lineWidth = 2.5;
  context.lineJoin = "round";
  rounds.forEach((row, index) => {
    const point = [x(index), y(row.mean_contribution)];
    if (index === 0) context.moveTo(...point);
    else context.lineTo(...point);
  });
  context.stroke();

  context.textAlign = "center";
  rounds.forEach((row, index) => {
    const selected = index === activeIndex;
    context.beginPath();
    context.fillStyle = selected ? "#202020" : "#ffffff";
    context.strokeStyle = "#202020";
    context.lineWidth = selected ? 2.5 : 1.35;
    context.arc(x(index), y(row.mean_contribution), selected ? 5 : 2.6, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    if (index === 0 || index === rounds.length - 1 || row.round % 3 === 0) {
      context.fillStyle = "#4a4a4a";
      context.fillText(row.round, x(index), bottom + 13);
    }
  });

  context.fillText("Round", (left + right) / 2, bottom + 27);
}
