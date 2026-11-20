const hero = document.querySelector("[data-hero]");
const canMoveArt = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");

if (hero) {
  hero.addEventListener("pointermove", (event) => {
    if (!canMoveArt.matches) return;
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    hero.style.setProperty("--painting-x", `${x * 32}px`);
    hero.style.setProperty("--painting-y", `${y * 24}px`);
  });

  hero.addEventListener("pointerleave", () => {
    hero.style.removeProperty("--painting-x");
    hero.style.removeProperty("--painting-y");
  });
}

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
  let activeIndex = Number(input.value) - 1;
  let timer;

  input.max = rounds.length;
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

  const left = 26;
  const right = width - 10;
  const top = 16;
  const bottom = height - 34;
  const max = Math.max(10, Math.ceil(Math.max(...rounds.map((row) => row.mean_contribution)) / 5) * 5);
  const step = (right - left) / rounds.length;
  const x = (index) => left + (index + 0.5) * step;
  const y = (value) => bottom - (value / max) * (bottom - top);

  rounds.forEach((row, index) => {
    if (!row.active) return;
    context.fillStyle = "#f2d8d3";
    context.fillRect(x(index) - step / 2, top, step, bottom - top);
  });

  context.font = '12px "DM Sans", sans-serif';
  context.textBaseline = "middle";
  context.textAlign = "right";
  context.lineWidth = 1;
  context.strokeStyle = "#ddcfc3";
  context.fillStyle = "#655852";

  for (let value = 0; value <= max; value += max / 2) {
    context.beginPath();
    context.moveTo(left, y(value));
    context.lineTo(right, y(value));
    context.stroke();
    context.fillText(value, left - 6, y(value));
  }

  const selectedX = x(activeIndex);
  context.beginPath();
  context.strokeStyle = "#9d524b";
  context.setLineDash([3, 3]);
  context.moveTo(selectedX, top);
  context.lineTo(selectedX, bottom);
  context.stroke();
  context.setLineDash([]);

  context.beginPath();
  context.strokeStyle = "#812f31";
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
    context.fillStyle = selected ? "#812f31" : "#fcf8f0";
    context.strokeStyle = "#812f31";
    context.lineWidth = selected ? 2.5 : 1.35;
    context.arc(x(index), y(row.mean_contribution), selected ? 5 : 2.6, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    if (index === 0 || index === rounds.length - 1 || row.round % 3 === 0) {
      context.fillStyle = "#655852";
      context.fillText(row.round, x(index), bottom + 13);
    }
  });

  context.fillText("Round", (left + right) / 2, bottom + 27);
}
