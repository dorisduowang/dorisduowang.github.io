(() => {
  const landing = document.querySelector("[data-landing]");
  const portfolioSections = new Set(["#research", "#about", "#graduation", "#contact"]);

  function followPortfolioBookmark() {
    if (!portfolioSections.has(window.location.hash)) return false;
    const destination = new URL(landing.dataset.portfolioUrl, window.location.href);
    destination.search = window.location.search;
    destination.hash = window.location.hash;
    window.location.replace(destination);
    return true;
  }

  if (followPortfolioBookmark()) return;
  window.addEventListener("hashchange", followPortfolioBookmark);

  const video = landing.querySelector(".landing-video");
  const motionToggle = landing.querySelector("[data-motion-toggle]");
  const motionLabel = motionToggle.querySelector("span");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let motionRequested = false;

  function requestMotion(playing) {
    motionRequested = playing;
    motionLabel.textContent = playing ? "Pause motion" : "Play motion";

    if (!playing) {
      video.pause();
      landing.dataset.motion = "paused";
      return;
    }

    if (!video.getAttribute("src")) video.src = video.dataset.source;
    video.play().catch((error) => {
      if (error.name !== "AbortError" && motionRequested) requestMotion(false);
    });
  }

  video.addEventListener("playing", () => {
    if (!motionRequested) return;
    landing.classList.add("has-video");
    landing.dataset.motion = "running";
  });
  video.addEventListener("error", () => {
    landing.classList.remove("has-video");
    requestMotion(false);
    motionToggle.hidden = true;
  });

  motionToggle.hidden = false;
  motionToggle.addEventListener("click", () => requestMotion(!motionRequested));
  reducedMotion.addEventListener("change", (event) => requestMotion(!event.matches));
  requestMotion(!reducedMotion.matches);

  const menu = landing.querySelector(".mobile-menu");
  const menuControl = menu.querySelector("summary");
  menu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !menu.open) return;
    menu.open = false;
    menuControl.focus();
  });
  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) menu.open = false;
  });
})();
