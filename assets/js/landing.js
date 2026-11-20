(() => {
  const landing = document.querySelector("[data-landing]");
  const portfolioSections = new Set(["#research", "#about", "#graduation", "#contact"]);

  function followPortfolioBookmark() {
    if (!portfolioSections.has(window.location.hash)) return;
    const destination = new URL(landing.dataset.portfolioUrl, window.location.href);
    destination.search = window.location.search;
    destination.hash = window.location.hash;
    window.location.replace(destination);
  }

  followPortfolioBookmark();
  window.addEventListener("hashchange", followPortfolioBookmark);

  const motionToggle = landing.querySelector("[data-motion-toggle]");
  const motionLabel = motionToggle.querySelector("span");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function setMotion(playing) {
    landing.dataset.motion = playing ? "running" : "paused";
    motionLabel.textContent = playing ? "Pause motion" : "Play motion";
  }

  setMotion(!reducedMotion.matches);
  motionToggle.hidden = false;
  motionToggle.addEventListener("click", () => setMotion(landing.dataset.motion !== "running"));
  reducedMotion.addEventListener("change", (event) => setMotion(!event.matches));

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
