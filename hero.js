(() => {
  const landing = document.querySelector("[data-landing]");
  if (!landing) return;

  const portfolioSections = new Set(["#about", "#graduation", "#contact"]);

  function followPortfolioBookmark() {
    if (!landing.dataset.portfolioUrl || !portfolioSections.has(window.location.hash)) return false;

    const destination = new URL(landing.dataset.portfolioUrl, window.location.href);
    destination.search = window.location.search;
    destination.hash = window.location.hash;
    window.location.replace(destination);
    return true;
  }

  if (followPortfolioBookmark()) return;
  window.addEventListener("hashchange", followPortfolioBookmark);

  const menu = landing.querySelector(".mobile-menu");
  const menuControl = menu?.querySelector("summary");
  menu?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !menu.open) return;
    menu.open = false;
    menuControl?.focus();
  });
  menu?.addEventListener("click", (event) => {
    if (event.target.closest("a")) menu.open = false;
  });

  const roundReader = landing.querySelector("[data-round-reader]");
  if (roundReader) {
    loadRoundReader(roundReader).catch(() => {
      // The recorded round 10 example and study link remain available without the data request.
    });
  }

  const video = landing.querySelector(".landing-video");
  const motionToggle = landing.querySelector("[data-motion-toggle]");
  if (!video?.dataset.source || !motionToggle) return;

  const motionLabel = motionToggle.querySelector("span");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false;
  let mediaFailed = false;
  let autoplayBlocked = false;
  let userChoice = null;
  let playAttempt = 0;

  function wantsMotion() {
    return userChoice ?? (!reducedMotion.matches && !autoplayBlocked);
  }

  function shouldPlay() {
    return wantsMotion() && visible && !document.hidden && !mediaFailed;
  }

  function stopPlayback() {
    playAttempt += 1;
    video.pause();
    landing.dataset.motion = "paused";
  }

  function synchronizePlayback() {
    motionLabel.textContent = wantsMotion() ? "Pause motion" : "Play motion";
    if (!shouldPlay()) {
      stopPlayback();
      return;
    }

    // Avoid loading the portrait video until it can play on screen.
    if (!video.getAttribute("src")) video.src = video.dataset.source;
    if (!video.paused) return;

    const attempt = ++playAttempt;
    video.play().catch((error) => {
      if (attempt !== playAttempt || error.name === "AbortError") return;

      autoplayBlocked = true;
      if (userChoice === true) userChoice = false;
      synchronizePlayback();
    });
  }

  video.muted = true;
  video.addEventListener("playing", () => {
    if (shouldPlay()) landing.dataset.motion = "running";
    else stopPlayback();
  });
  video.addEventListener("pause", () => {
    landing.dataset.motion = "paused";
  });
  video.addEventListener("error", () => {
    if (!video.hasAttribute("src")) return;

    mediaFailed = true;
    stopPlayback();
    video.removeAttribute("src");
    video.load();
    motionToggle.hidden = true;
  });

  motionToggle.hidden = false;
  motionToggle.addEventListener("click", () => {
    userChoice = !wantsMotion();
    synchronizePlayback();
  });
  reducedMotion.addEventListener("change", ({ matches }) => {
    if (matches) {
      if (userChoice === true) userChoice = null;
      stopPlayback();
      video.removeAttribute("src");
      video.load();
    }
    synchronizePlayback();
  });
  document.addEventListener("visibilitychange", synchronizePlayback);
  window.addEventListener("pagehide", stopPlayback);
  window.addEventListener("pageshow", synchronizePlayback);

  if ("IntersectionObserver" in window) {
    const viewportObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio > 0;
        synchronizePlayback();
      },
      { threshold: [0, 0.02] }
    );
    viewportObserver.observe(video);
  } else {
    visible = true;
  }

  synchronizePlayback();

  async function loadRoundReader(reader) {
    const response = await fetch(reader.dataset.roundSource);
    if (!response.ok) return;

    const { rounds } = await response.json();
    if (!Array.isArray(rounds)) return;

    const select = reader.querySelector("#hero-round");
    const rule = reader.querySelector("[data-hero-rule]");
    const speaker = reader.querySelector("[data-hero-speaker]");
    const message = reader.querySelector("[data-hero-message]");
    const study = reader.querySelector("[data-hero-study]");
    const players = Array.from(reader.querySelectorAll("[data-hero-player]"), (button) => ({
      button,
      id: button.dataset.heroPlayer,
      amount: button.querySelector("strong"),
    }));
    const records = new Map(rounds.map((round) => [String(round.round), round]));
    const defaultRound = select.value;
    if (!records.has(defaultRound)) return;

    const studyUrl = new URL(study.href);
    let selectedPlayer = players.find(({ button }) => button.getAttribute("aria-pressed") === "true");

    function showSelection() {
      const round = records.get(select.value);
      if (!round) return;

      rule.textContent = round.active ? "Punishment active" : "Punishment inactive";
      players.forEach(({ button, amount }, index) => {
        const contribution = round.contributions?.[index];
        amount.textContent = Number.isFinite(contribution) ? contribution : "Unavailable";
        button.setAttribute("aria-pressed", String(button === selectedPlayer.button));
      });
      const publicMessage = round.messages?.find(({ player }) => player === selectedPlayer.id);
      speaker.textContent = selectedPlayer.id + " said";
      renderQuote(message, publicMessage?.message ?? "No public message recorded.");
      studyUrl.searchParams.set("round", String(round.round));
      studyUrl.searchParams.set("player", selectedPlayer.id);
      study.href = studyUrl.href;
    }

    select.replaceChildren(...rounds.map(({ round }) => new Option("Round " + round, round)));
    select.value = defaultRound;
    select.disabled = false;
    select.addEventListener("change", showSelection);
    players.forEach((player) => {
      player.button.disabled = false;
      player.button.addEventListener("click", () => {
        selectedPlayer = player;
        showSelection();
      });
    });
    showSelection();
  }

  function renderQuote(element, quote) {
    const recommendation = /\b(?:contribute|put in)\s+(\d+(?:\.\d+)?)\b/i.exec(quote);
    if (!recommendation) {
      element.textContent = quote;
      return;
    }

    const [, amount] = recommendation;
    const end = recommendation.index + recommendation[0].length;
    const mark = document.createElement("mark");
    mark.textContent = amount;
    element.replaceChildren(quote.slice(0, end - amount.length), mark, quote.slice(end));
  }
})();
