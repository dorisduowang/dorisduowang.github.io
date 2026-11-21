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
  const smallScreen = window.matchMedia("(max-width: 767px)");
  const crystalCanvas = roundReader?.querySelector("[data-crystal-renderer]");
  const portrait = crystalCanvas?.closest(".portrait-plate");
  const smoothSource = video.dataset.smoothSource;
  let crystalModule;
  let portraitPoseAt;
  let crystalRenderer;
  let crystalOverlay;
  let overlayPlayPending = false;
  let crystalLoading = false;
  let crystalFailed = false;
  let crystalFrame = 0;
  let crystalSizeDirty = false;
  let paintedTime = -1;
  let visible = false;
  let mediaFailed = false;
  let smoothSourceFailed = false;
  let autoplayBlocked = false;
  let userChoice = null;
  let playAttempt = 0;

  function wantsMotion() {
    return userChoice ?? (!reducedMotion.matches && !autoplayBlocked);
  }

  function shouldPlay() {
    return wantsMotion() && visible && !document.hidden && !mediaFailed;
  }

  function shouldUseCrystal() {
    return crystalCanvas && !smallScreen.matches && !reducedMotion.matches && !mediaFailed && !crystalFailed;
  }

  function createCrystalOverlay() {
    const clip = document.createElement("video");
    clip.className = "portrait-crystal portrait-crystal-clip";
    clip.muted = true;
    clip.playsInline = true;
    clip.preload = "auto";
    clip.setAttribute("aria-hidden", "true");
    const sources = [
      ["/assets/video/crystal-overlay.webm", 'video/webm; codecs="vp9"'],
      ["/assets/video/crystal-overlay-hevc.mov", 'video/mp4; codecs="hvc1"'],
    ];
    if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) sources.reverse();
    for (const [src, type] of sources) {
      const source = document.createElement("source");
      source.src = src;
      source.type = type;
      clip.append(source);
    }
    clip.addEventListener("seeked", () => {
      if (video.paused && roundReader.dataset.crystal === "3d" && paintedTime >= 0) paintCrystal(paintedTime);
    });
    portrait.append(clip);
    return clip;
  }

  function synchronizeOverlay(time, loop) {
    if (!crystalOverlay) return false;
    const clip = crystalOverlay;
    if (time < loop.orbitEnd || time >= loop.duration || !Number.isFinite(clip.duration) || clip.duration <= 0) {
      clip.pause();
      clip.classList.remove("is-visible");
      return false;
    }

    // The alpha clip covers growth through return. Keep it phase-locked to the portrait media clock.
    const rate = clip.duration / (loop.duration - loop.orbitEnd);
    const frame = (time - loop.orbitEnd) * rate;
    const difference = Math.abs(clip.currentTime - frame);
    try {
      if (difference > 0.14 || (video.paused && difference > 0.02)) clip.currentTime = frame;
      if (!video.paused && clip.paused && !overlayPlayPending) {
        clip.playbackRate = rate;
        overlayPlayPending = true;
        clip
          .play()
          .catch((error) => {
            if (error.name === "AbortError") return;
            clip.remove();
            crystalOverlay = null;
          })
          .finally(() => {
            overlayPlayPending = false;
          });
      }
    } catch {
      clip.remove();
      crystalOverlay = null;
      return false;
    }
    const aligned = clip.readyState >= clip.HAVE_CURRENT_DATA && !clip.seeking && difference < 0.17;
    clip.classList.toggle("is-visible", aligned);
    return aligned;
  }

  function paintCrystal(time, sourceTime = video.currentTime) {
    const { heroCrystalConfig: config, crystalCentroid, placeOnPortrait } = crystalModule;
    const loop = config.timeline;
    const pose = portraitPoseAt(sourceTime);
    const place = (point) => placeOnPortrait(point, pose);
    roundReader.dataset.crystalTime = time.toFixed(3);
    const orbitPoints = [];
    const detail = { time, sourceTime, loop, crystalCentroid, anchors: config.anchors, orbitPoints, place, pose };
    roundReader.dispatchEvent(new CustomEvent("hero-crystal-frame", { detail }));
    const overlay = synchronizeOverlay(time, loop);
    crystalRenderer.setTime(time, orbitPoints, { crystals: !overlay, pose });
    paintedTime = time;
  }

  function crystalTick() {
    crystalFrame = 0;
    if (!crystalRenderer || roundReader.dataset.crystal !== "3d" || !shouldPlay() || video.paused) return;
    const time = (video.currentTime / video.duration) * crystalModule.heroCrystalConfig.timeline.duration;
    if (Number.isFinite(time) && time !== paintedTime) {
      try {
        paintCrystal(time);
      } catch {
        crystalFailed = true;
        synchronizeCrystal();
        return;
      }
    }
    crystalFrame = window.requestAnimationFrame(crystalTick);
  }

  function pauseCrystal() {
    window.cancelAnimationFrame(crystalFrame);
    crystalFrame = 0;
    crystalOverlay?.pause();
  }

  function resizeCrystal() {
    crystalRenderer.resize();
    crystalSizeDirty = false;
    if (paintedTime >= 0) paintCrystal(paintedTime);
  }

  function synchronizeCrystal() {
    const enabled = shouldUseCrystal() && crystalRenderer && Number.isFinite(video.duration);
    if (!enabled) {
      if (roundReader?.dataset.crystal === "3d") {
        pauseCrystal();
        delete roundReader.dataset.crystal;
        delete roundReader.dataset.crystalTime;
        video.defaultPlaybackRate = video.playbackRate = 1;
        roundReader.dispatchEvent(new Event("hero-crystal-mode"));
      }
      return;
    }
    if (roundReader.dataset.crystal !== "3d") {
      const rate = video.duration / crystalModule.heroCrystalConfig.timeline.duration;
      try {
        video.defaultPlaybackRate = video.playbackRate = rate;
      } catch {
        crystalFailed = true;
        return;
      }
      roundReader.dataset.crystal = "3d";
      roundReader.dispatchEvent(new Event("hero-crystal-mode"));
      paintedTime = -1;
    }
    if (shouldPlay() && !video.paused && !crystalFrame) {
      if (crystalSizeDirty) resizeCrystal();
      crystalFrame = window.requestAnimationFrame(crystalTick);
    }
  }

  async function loadCrystal() {
    if (!shouldUseCrystal() || crystalLoading || crystalRenderer) return;
    crystalLoading = true;
    try {
      const [rendererModule, poseModule] = await Promise.all([import(crystalCanvas.dataset.module), import(crystalCanvas.dataset.pose)]);
      crystalModule = rendererModule;
      portraitPoseAt = poseModule.portraitPoseAt;
      if (!shouldUseCrystal() || !shouldPlay()) return;
      crystalRenderer = crystalModule.createHeroCrystal(crystalCanvas, portrait);
      if (!crystalRenderer) {
        crystalFailed = true;
        return;
      }
      if (crystalModule.heroCrystalConfig.useOverlayVideo) crystalOverlay = createCrystalOverlay();
      window.heroCrystal = {
        setTime(time) {
          if (roundReader.dataset.crystal !== "3d" || !Number.isFinite(time)) return;
          const duration = crystalModule.heroCrystalConfig.timeline.duration;
          const frame = Math.max(0, Math.min(duration, time));
          const sourceTime = (frame / duration) * video.duration;
          video.currentTime = sourceTime;
          paintCrystal(frame, sourceTime);
        },
        setSelectedAgent(button) {
          if (button?.matches("[data-hero-player]") && roundReader.contains(button)) button.click();
        },
        resize() {
          if (roundReader.dataset.crystal === "3d") resizeCrystal();
        },
      };
      synchronizeCrystal();
    } catch {
      // Leave the original, canvas-based handoff runnable if the 3D module cannot initialize.
      crystalFailed = true;
      synchronizeCrystal();
    } finally {
      crystalLoading = false;
    }
  }

  function stopPlayback() {
    playAttempt += 1;
    video.pause();
    pauseCrystal();
    landing.dataset.motion = "paused";
  }

  function fallBackToOriginalVideo() {
    if (!smoothSource || video.getAttribute("src") !== smoothSource) return false;

    smoothSourceFailed = true;
    const position = video.currentTime;
    stopPlayback();
    video.removeAttribute("src");
    video.load();
    if (position > 0) {
      // Both encodes use the same clock, including the eye tracking and scan.
      video.addEventListener(
        "loadedmetadata",
        () => {
          video.currentTime = Math.min(position, video.duration);
        },
        { once: true }
      );
    }
    synchronizePlayback();
    return true;
  }

  function synchronizePlayback() {
    motionLabel.textContent = wantsMotion() ? "Pause motion" : "Play motion";
    if (!shouldPlay()) {
      stopPlayback();
      return;
    }

    // Avoid loading the portrait video until it can play on screen.
    loadCrystal();
    if (!video.getAttribute("src")) {
      const useSmoothSource = smoothSource && !smoothSourceFailed && !smallScreen.matches && !reducedMotion.matches;
      video.src = useSmoothSource ? smoothSource : video.dataset.source;
    }
    if (!video.paused) return;

    const attempt = ++playAttempt;
    video.play().catch((error) => {
      if (attempt !== playAttempt || error.name === "AbortError") return;
      if (error.name === "NotSupportedError" && fallBackToOriginalVideo()) return;

      autoplayBlocked = true;
      if (userChoice === true) userChoice = false;
      synchronizePlayback();
    });
  }

  video.muted = true;
  video.addEventListener("loadedmetadata", synchronizeCrystal);
  video.addEventListener("seeked", () => {
    if (roundReader?.dataset.crystal !== "3d" || !video.paused) return;
    paintCrystal((video.currentTime / video.duration) * crystalModule.heroCrystalConfig.timeline.duration);
  });
  video.addEventListener("playing", () => {
    if (shouldPlay()) {
      landing.dataset.motion = "running";
      synchronizeCrystal();
    } else stopPlayback();
  });
  video.addEventListener("pause", () => {
    pauseCrystal();
    landing.dataset.motion = "paused";
  });
  video.addEventListener("error", () => {
    if (!video.getAttribute("src") || fallBackToOriginalVideo()) return;

    mediaFailed = true;
    stopPlayback();
    synchronizeCrystal();
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
    synchronizeCrystal();
    synchronizePlayback();
  });
  smallScreen.addEventListener("change", () => {
    synchronizeCrystal();
    synchronizePlayback();
  });
  crystalCanvas?.addEventListener("webglcontextlost", () => {
    crystalFailed = true;
    synchronizeCrystal();
  });
  if (portrait && typeof ResizeObserver !== "undefined") {
    const crystalSize = new ResizeObserver(() => {
      crystalSizeDirty = true;
      if (visible && !document.hidden && crystalRenderer && roundReader.dataset.crystal === "3d") resizeCrystal();
    });
    crystalSize.observe(portrait);
  }
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
