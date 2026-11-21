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

const photoDialog = document.querySelector("[data-about-photo-dialog]");
if (typeof photoDialog?.showModal === "function") setupPhotoSpread(photoDialog);

function setupPhotoSpread(dialog) {
  const spread = document.querySelector(".about-photo-spread");
  const enlarged = dialog.querySelector(".about-photo-enlarged");
  const dismiss = dialog.querySelector("[data-about-photo-dismiss]");
  const frame = dialog.querySelector("[data-about-photo-frame]");
  const caption = dialog.querySelector("[data-about-photo-caption]");
  const description = dialog.querySelector("[data-about-photo-description]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let opener;
  let activeCard;
  let movement;
  let pressedBackdrop = false;

  spread.querySelectorAll("[data-about-photo-open]").forEach((button) => {
    const image = button.querySelector("img");
    button.setAttribute("aria-label", `Enlarge photo: ${image.alt}`);
    button.disabled = false;
  });

  function slotTransform() {
    if (reducedMotion.matches || typeof enlarged.animate !== "function") return null;

    const slot = activeCard.getBoundingClientRect();
    const view = enlarged.getBoundingClientRect();
    if (!slot.width || !view.width || slot.bottom < 0 || slot.top > window.innerHeight) return null;

    const dx = slot.x + slot.width / 2 - (view.x + view.width / 2);
    const dy = slot.y + slot.height / 2 - (view.y + view.height / 2);
    const transform = getComputedStyle(activeCard).transform;
    const rotation = new DOMMatrixReadOnly(transform === "none" ? undefined : transform);
    const angle = Math.atan2(rotation.b, rotation.a);
    const scale = Math.min(slot.width / view.width, slot.height / view.height);
    return `translate(${dx}px, ${dy}px) rotate(${angle}rad) scale(${scale})`;
  }

  spread.addEventListener("click", (event) => {
    const button = event.target.closest("[data-about-photo-open]");
    if (!button || button.disabled || opener) return;

    opener = button;
    activeCard = opener.closest(".about-photo-card");
    const source = opener.querySelector("img");
    const preview = source.cloneNode();
    preview.classList.add("about-photo-preview");
    preview.loading = "eager";
    preview.alt = "";
    frame.replaceChildren(preview);
    enlarged.style.setProperty("--card-photo-position", getComputedStyle(source).objectPosition);
    caption.textContent = activeCard.querySelector("figcaption").textContent;
    description.textContent = source.alt;
    const [corner, reversed] = activeCard.querySelectorAll(".about-card-corner");
    dismiss.prepend(corner.cloneNode(true));
    dismiss.append(reversed.cloneNode(true));

    dialog.showModal();
    activeCard.dataset.detached = "";
    const from = slotTransform();
    if (from) movement = enlarged.animate([{ transform: from }, { transform: "none" }], { duration: 310, easing: "cubic-bezier(.2,.76,.3,1)" });
  });

  function closePhoto() {
    activeCard?.removeAttribute("data-detached");
    dialog.close();
  }

  function returnPhoto() {
    if (!dialog.open || dialog.hasAttribute("data-returning")) return;

    const current = getComputedStyle(enlarged).transform;
    movement?.cancel();
    const to = slotTransform();
    if (!to) {
      closePhoto();
      return;
    }

    dialog.dataset.returning = "";
    movement = enlarged.animate([{ transform: current }, { transform: to }], {
      duration: 240,
      easing: "cubic-bezier(.54,.1,.68,.46)",
      fill: "forwards",
    });
    movement.finished.then(closePhoto, () => {});
  }

  dismiss.addEventListener("click", returnPhoto);
  dialog.addEventListener("pointerdown", (event) => {
    pressedBackdrop = event.target === dialog;
  });
  dialog.addEventListener("click", (event) => {
    if (pressedBackdrop && event.target === dialog) returnPhoto();
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    returnPhoto();
  });
  dialog.addEventListener("close", () => {
    movement?.cancel();
    movement = undefined;
    dialog.removeAttribute("data-returning");
    activeCard?.removeAttribute("data-detached");
    opener?.focus({ preventScroll: true });
    opener = undefined;
    activeCard = undefined;
    pressedBackdrop = false;
    dismiss.querySelectorAll(".about-card-corner").forEach((corner) => corner.remove());
    frame.replaceChildren();
  });

  // A change in viewport size invalidates an in-flight position. Resolve it using the final layout.
  window.addEventListener("resize", () => {
    if (movement?.playState === "running") movement.finish();
  });
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
  const messageRegion = panel.querySelector(".pgg-message");
  const messageLabel = panel.querySelector("[data-pgg-message-label]");
  const messageText = panel.querySelector("[data-pgg-message]");
  const next = panel.querySelector("[data-pgg-next]");
  const playerCount = rounds[0].contributions?.length ?? 0;
  const endowment = 20;
  const agentRows = [];
  let activeIndex = Number(input.value) - 1;
  let activePlayer = Math.max(0, playerCount - 1);
  let timer;

  if (agents) {
    for (let i = 0; i < playerCount; i += 1) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      const player = document.createElement("span");
      const bar = document.createElement("span");
      const value = document.createElement("span");
      const name = rounds[0].messages?.[i]?.player ?? `P${i + 1}`;
      button.type = "button";
      button.className = "pgg-agent";
      player.className = "pgg-agent-name";
      player.textContent = name;
      bar.className = "pgg-agent-bar";
      bar.setAttribute("aria-hidden", "true");
      value.className = "pgg-agent-value";
      button.addEventListener("click", () => {
        stopPlayback();
        activePlayer = i;
        showMessage(rounds[activeIndex]);
      });
      button.append(player, bar, value);
      item.append(button);
      agents.append(item);
      agentRows.push({ button, value, name });
    }
  }

  input.max = rounds.length;
  activeIndex = Math.min(activeIndex, rounds.length - 1);
  figure.classList.add("is-interactive");
  panel.hidden = false;

  function showMessage(row) {
    const selected = agentRows[activePlayer];
    messageRegion.hidden = !selected;
    if (!selected) return;

    const spoken = row.messages?.find(({ player }) => player === selected.name);
    const contribution = row.contributions?.[activePlayer];
    agentRows.forEach(({ button }, i) => button.setAttribute("aria-pressed", String(i === activePlayer)));
    messageLabel.textContent = Number.isFinite(contribution)
      ? `${selected.name}’s message · contributed ${contribution} tokens`
      : `${selected.name}’s message`;
    messageText.textContent = spoken?.message ?? "No public message recorded.";
  }

  function selectRound(index) {
    activeIndex = index;
    const row = rounds[index];
    const rule = row.active ? "punishment active" : "punishment inactive";
    input.value = row.round;
    input.setAttribute("aria-valuetext", `Round ${row.round} of ${rounds.length}`);
    position.textContent = `${row.round} / ${rounds.length}`;
    output.value = `Round ${row.round} · ${row.mean_contribution} tokens per player · ${rule}`;
    agentRows.forEach(({ button, value, name }, i) => {
      const contribution = row.contributions?.[i];
      value.textContent = Number.isFinite(contribution) ? contribution : "Unavailable";
      button.style.setProperty("--contribution", `${Number.isFinite(contribution) ? (contribution / endowment) * 100 : 0}%`);
      button.setAttribute(
        "aria-label",
        Number.isFinite(contribution) ? `${name} contributed ${contribution} tokens. Read message.` : `${name}. Read message.`
      );
    });
    showMessage(row);
    if (next) {
      const nextRound = rounds[index + 1];
      next.textContent = nextRound
        ? `Round ${nextRound.round} · ${nextRound.mean_contribution} tokens per player · punishment ${nextRound.active ? "active" : "inactive"}`
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
    messageRegion.setAttribute("aria-live", "polite");
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
    messageRegion.setAttribute("aria-live", "off");
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
