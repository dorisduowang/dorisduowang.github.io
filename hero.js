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

  const stage = landing.querySelector("[data-hero]");
  const video = landing.querySelector(".landing-video");
  const motionToggle = landing.querySelector("[data-motion-toggle]");
  if (!stage || !video || !motionToggle || !video.dataset.source) return;

  const motionLabel = motionToggle.querySelector("[data-motion-label], span");
  const canvas = stage.querySelector("[data-game-canvas]");
  const context = canvas?.getContext("2d");
  const pool = stage.querySelector("[data-human-pool]");
  const graph = stage.querySelector("[data-agent-graph]");
  const matrix = stage.querySelector("[data-matrix]");
  const portrait = stage.querySelector(".portrait-plate");
  const readouts = Array.from(stage.querySelectorAll("[data-agent-readout]"), (element) => ({
    element,
    round: element.querySelector("[data-agent-round]"),
    contribution: element.querySelector("[data-agent-contribution]"),
    sanction: element.querySelector("[data-agent-sanction]"),
  }));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 767px)");

  const amber = "#e8a23a";
  const gray = "#6b6b6b";
  const guide = "#d5d2cd";
  const agentPositions = [
    [0.2, 0.28],
    [0.77, 0.23],
    [0.29, 0.77],
    [0.81, 0.72],
  ];
  const closePositions = [
    [0.4, 0.33],
    [0.62, 0.33],
    [0.4, 0.67],
    [0.62, 0.67],
  ];
  const playerPositions = [
    [0.17, 0.25],
    [0.83, 0.25],
    [0.17, 0.75],
    [0.83, 0.75],
  ];
  const playerTimings = [0.14, 0.51, 0.28, 0.68];
  const paths = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ];
  const ambientPositions = [
    [0.04, 0.2],
    [0.16, 0.37],
    [0.08, 0.63],
    [0.19, 0.85],
    [0.67, 0.2],
    [0.88, 0.29],
    [0.93, 0.55],
    [0.82, 0.77],
    [0.96, 0.93],
  ];
  const ambientPaths = [
    [0, 1],
    [0, 4],
    [1, 2],
    [1, 5],
    [2, 3],
    [2, 7],
    [3, 7],
    [4, 5],
    [5, 6],
    [6, 7],
    [6, 8],
    [7, 8],
  ];
  // These scripted rounds illustrate the rules. They are not study observations.
  const demoRounds = [
    { contributions: [8, 2, 9, 4], sanctions: [0, 0, 0, 0] },
    { contributions: [4, 10, 5, 8], sanctions: [0, 1, 0, 1] },
    { contributions: [9, 8, 10, 2], sanctions: [1, 0, 1, 0] },
    { contributions: [3, 7, 4, 10], sanctions: [0, 0, 0, 0] },
    { contributions: [10, 5, 9, 6], sanctions: [0, 0, 1, 0] },
    { contributions: [6, 10, 3, 9], sanctions: [0, 1, 0, 1] },
    { contributions: [10, 8, 9, 5], sanctions: [0, 0, 1, 0] },
    { contributions: [8, 4, 10, 6], sanctions: [0, 0, 0, 0] },
  ];
  const finalRound = { contributions: [10, 10, 10, 10], sanctions: [0, 0, 0, 0] };

  const clamp = (value) => Math.max(0, Math.min(value, 1));
  const mix = (from, to, progress) => from + (to - from) * progress;

  // Matrix particles start on its visible SVG strokes; pool particles start on its ring and players.
  const matrixLines = [0.25, 0.6, 0.94];
  const matrixColumns = [0.31, 0.63, 0.956];
  const particlesPerNode = 18;
  const particles = Array.from({ length: particlesPerNode * agentPositions.length }, (_, index) => {
    const agent = index % agentPositions.length;
    const order = Math.floor(index / agentPositions.length);
    const stagger = ((order * 7 + agent * 5) % particlesPerNode) / (particlesPerNode - 1);
    const along = ((index * 47) % 131) / 131;
    const fromPool = order % 3 === 2;
    const angle = along * Math.PI * 2;
    let origin;

    if (fromPool) {
      origin = order % 2 ? playerPositions[agent] : [0.5 + Math.cos(angle) * 0.097, 0.5 + Math.sin(angle) * 0.2];
    } else {
      const line = Math.floor(order / 3) % 3;
      origin = order % 2 ? [mix(0.31, 0.956, along), matrixLines[line]] : [matrixColumns[line], mix(0.25, 0.94, along)];
    }

    return {
      origin,
      fromPool,
      agent,
      lane: ((index * 29) % 101) / 101,
      release: 2.02 + stagger * 1.03 + (fromPool ? 0.12 : 0),
      arrival: 3.865 + stagger * 0.74 + agent * 0.075,
      radius: 0.9 + along * 1.16,
      alpha: 0.38 + along * 0.23,
      color: index % 5 < 2 ? amber : guide,
    };
  });

  let bounds;
  let visible = false;
  let mediaFailed = false;
  let autoplayBlocked = false;
  let userChoice = null;
  let playAttempt = 0;
  let animationFrame = 0;
  let lastPlaybackTime = -1;
  let lastPhase;
  let lastStageOpacity;
  let lastRound;

  function ease(value) {
    const unit = clamp(value);
    return unit * unit * (3 - 2 * unit);
  }

  function point(rect, x, y) {
    return { x: rect.x + rect.width * x, y: rect.y + rect.height * y };
  }

  function curve(start, bend, end, progress) {
    const left = 1 - progress;
    return {
      x: left * left * start.x + 2 * left * progress * bend.x + progress * progress * end.x,
      y: left * left * start.y + 2 * left * progress * bend.y + progress * progress * end.y,
    };
  }

  function circle(position, radius, color, alpha, fill = true) {
    context.globalAlpha = alpha;
    context.beginPath();
    context.arc(position.x, position.y, radius, 0, Math.PI * 2);
    if (fill) {
      context.fillStyle = color;
      context.fill();
    } else {
      context.strokeStyle = color;
      context.lineWidth = 0.8;
      context.stroke();
    }
  }

  function wire(start, end, color, alpha, width = 1, curveDepth = 0) {
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.quadraticCurveTo((start.x + end.x) / 2, (start.y + end.y) / 2 + curveDepth, end.x, end.y);
    context.strokeStyle = color;
    context.globalAlpha = alpha;
    context.lineWidth = width;
    context.stroke();
  }

  function lettering(text, at, size, color, alpha) {
    context.globalAlpha = alpha;
    context.font = `500 ${size}px ui-monospace, Menlo, monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    context.fillText(text, at.x, at.y);
  }

  function paintPool(rect, time, opacity, schematic) {
    const center = point(rect, 0.5, 0.5);
    const radius = Math.min(rect.width * 0.14, rect.height * 0.31, 28);
    const boost = ease((time - 0.82) / 0.33) * (1 - ease((time - 1.35) / 0.5));
    circle(center, radius + 3 + boost * 6, guide, opacity * (0.2 + boost * 0.17), false);
    circle(center, radius * 0.84, "#151310", opacity * 0.85);
    circle(center, radius * 0.84, guide, opacity * (0.47 + boost * 0.35), false);
    lettering("×1.6", center, Math.min(radius * 0.53, 13), guide, opacity * (0.81 + boost * 0.19));

    playerPositions.forEach(([x, y], index) => {
      const player = point(rect, x, y);
      const color = index % 3 ? amber : gray;
      const out = playerTimings[index];
      wire(player, center, guide, opacity * 0.28, 0.7);
      circle(player, 7, "#161412", opacity);
      circle(player, 7, color, opacity * 0.88, false);
      lettering(String(index + 1), player, 8.5, guide, opacity * 0.89);

      if (schematic || time >= 2) return;
      for (let token = 0; token < 3; token += 1) {
        const launch = out + token * 0.095;
        const toss = (time - launch) / 0.46;
        const split = (time - 1.24 - index * 0.071 - token * 0.075) / 0.48;
        const bend = { x: (player.x + center.x) / 2, y: (player.y + center.y) / 2 - 13 - token * 5 };
        if (toss > 0 && toss < 1) {
          circle(curve(player, bend, center, toss), 2.2, color, opacity * Math.sin(Math.PI * toss));
        }
        if (split > 0 && split < 1) {
          circle(curve(center, bend, player, split), 1.8, guide, opacity * Math.sin(Math.PI * split));
        }
      }
    });
  }

  function agentPoints(rect, convergence) {
    return agentPositions.map(([x, y], index) => {
      const [closeX, closeY] = closePositions[index];
      return point(rect, mix(x, closeX, convergence), mix(y, closeY, convergence));
    });
  }

  function sampleTrack(points) {
    const steps = 10;
    const samples = [points[0]];

    // Sample a smooth cubic through the waypoints, then space the lookups evenly by distance.
    for (let segment = 0; segment < points.length - 1; segment += 1) {
      const [a, b, c, d] = [points[segment - 1] || points[0], points[segment], points[segment + 1], points[segment + 2] || points.at(-1)];
      const coordinate = (axis, u) =>
        b[axis] +
        0.5 * u * (c[axis] - a[axis] + u * (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis] + u * (3 * b[axis] - a[axis] - 3 * c[axis] + d[axis])));
      for (let step = 1; step <= steps; step += 1) {
        const u = step / steps;
        samples.push({ x: coordinate("x", u), y: Math.max(4, coordinate("y", u)) });
      }
    }

    const distances = [0];
    for (let index = 1; index < samples.length; index += 1) {
      const previous = samples[index - 1];
      const sample = samples[index];
      distances.push(distances[index - 1] + Math.hypot(sample.x - previous.x, sample.y - previous.y));
    }

    let next = 1;
    const total = distances.at(-1);
    return Array.from({ length: 81 }, (_, index) => {
      const distance = (total * index) / 80;
      while (distances[next] < distance && next < samples.length - 1) next += 1;
      const weight = (distance - distances[next - 1]) / (distances[next] - distances[next - 1]);
      const from = samples[next - 1];
      const to = samples[next];
      return { x: mix(from.x, to.x, weight), y: mix(from.y, to.y, weight) };
    });
  }

  function makeMigrationTracks(layout) {
    if (!layout.portrait || !layout.graph || !layout.matrix || !layout.pool) return [];
    const destinations = agentPoints(layout.graph, 0);
    const plate = layout.portrait;

    // These lanes rise alongside the plate and cross the dark space above the mesh.
    return particles.map((particle) => {
      const lane = particle.lane;
      const [x, y] = particle.origin;
      const start = point(particle.fromPool ? layout.pool : layout.matrix, x, y);
      return sampleTrack([
        start,
        point(plate, 0.065 + lane * 0.04, 0.37 + lane * 0.18),
        point(plate, 0.169, 0.137 + lane * 0.07),
        point(plate, 0.348, 0.041 + lane * 0.025),
        point(plate, 0.51, 0.012 + lane * 0.017),
        point(plate, 0.675, 0.019 + lane * 0.012),
        point(plate, 0.811, 0.085 + lane * 0.043),
        point(plate, 0.925, 0.23 + lane * 0.13),
        destinations[particle.agent],
      ]);
    });
  }

  function paintMigration(time) {
    const formation = agentPositions.map(() => 0);
    particles.forEach((particle, index) => {
      const { agent, release, arrival } = particle;
      formation[agent] += ease((time - arrival + 0.04) / 0.19) / particlesPerNode;
      const track = bounds.tracks[index];
      if (!track || time <= release || time >= arrival + 0.16) return;

      const progress = clamp((time - release) / (arrival - release));
      const distance = mix(progress, ease(progress), 0.67) * (track.length - 1);
      const indexAt = Math.min(Math.floor(distance), track.length - 2);
      const from = track[indexAt];
      const to = track[indexAt + 1];
      const fraction = distance - indexAt;
      const position = { x: mix(from.x, to.x, fraction), y: mix(from.y, to.y, fraction) };
      const alpha = ease((time - release) / 0.24) * (1 - ease((time - arrival + 0.03) / 0.19)) * particle.alpha;

      if (index % 3 === 0 && indexAt > 1 && progress < 0.94) {
        wire(track[indexAt - 2], position, particle.color, alpha * 0.28, 0.65);
      }
      circle(position, particle.radius * mix(1, 0.65, ease((progress - 0.78) / 0.22)), particle.color, alpha);
    });
    return formation.map(clamp);
  }

  function paintAgentGrid(rect, opacity) {
    const pitch = 16;
    const right = rect.x + rect.width;
    const bottom = rect.y + rect.height;
    context.beginPath();
    for (let x = rect.x + pitch / 2; x < right; x += pitch) {
      context.moveTo(x, rect.y);
      context.lineTo(x, bottom);
    }
    for (let y = rect.y + pitch / 2; y < bottom; y += pitch) {
      context.moveTo(rect.x, y);
      context.lineTo(right, y);
    }
    context.globalAlpha = opacity * 0.12;
    context.strokeStyle = guide;
    context.lineWidth = 1;
    context.stroke();
  }

  function paintAgents(points, time, state, opacity, convergence, formation) {
    const { contributions, sanctions } = state;
    paths.forEach(([left, right], index) => {
      const mutual = contributions[left] >= 7 && contributions[right] >= 7;
      const emphasis = 0.72 + 0.28 * Math.sin(time * 12 + index * 1.4);
      const growth = formation ? mix(0.15, 1, Math.min(formation[left], formation[right])) : 1;
      wire(points[left], points[right], mutual ? amber : guide, opacity * emphasis * growth * (mutual ? 0.48 : 0.34), 0.9);
    });

    const fullRadius = Math.min(12, bounds.graph.width * 0.057);
    points.forEach((position, index) => {
      const built = formation ? formation[index] : 1;
      const radius = fullRadius * mix(0.36, 1, built);
      const strength = opacity * mix(0.34, 1, built);
      const color = contributions[index] >= 7 ? amber : gray;
      const pulse = 0.64 + Math.sin(time * 15.4 + index * 1.75) * 0.36;
      if (sanctions[index]) {
        circle(position, radius + 3 + pulse * 4, guide, strength * (0.32 + pulse * 0.34), false);
      }
      circle(position, radius, "#10100f", strength * 0.95);
      const remainingGray = contributions[index] >= 7 ? 1 : 1 - convergence;
      circle(position, radius, color, strength * remainingGray * 0.48);
      circle(position, radius, color, strength * remainingGray * 0.89, false);
      if (remainingGray < 1) {
        circle(position, radius, amber, strength * convergence * 0.48);
        circle(position, radius, amber, strength * convergence * 0.89, false);
      }
      const labelOpacity = ease((built - 0.23) / 0.52);
      if (labelOpacity > 0)
        lettering(String(index + 1).padStart(2, "0"), position, radius * 0.83, "#f5efe2", Math.min(1, strength * 1.35) * labelOpacity);
    });
  }

  function paintAmbient(time) {
    const positions = ambientPositions.map(([x, y], index) => ({
      x: bounds.width * x + Math.sin(time * 0.68 + index) * 3,
      y: bounds.height * y + Math.cos(time * 0.72 + index) * 4,
    }));
    ambientPaths.forEach(([left, right], index) => {
      wire(positions[left], positions[right], guide, 0.13, 0.8, index % 2 ? -14 : 14);
    });
    positions.forEach((position, index) => {
      const color = index % 3 ? guide : amber;
      circle(position, index % 2 ? 2.2 : 1.55, color, 0.31 + Math.sin(time + index) * 0.085);
    });
  }

  function setReadouts(round, state) {
    if (round === lastRound) return;

    const roundLabel = String(round).padStart(2, "0");
    readouts.forEach((readout, index) => {
      if (index >= state.contributions.length) return;

      const contribution = state.contributions[index];
      const sanction = state.sanctions[index];
      if (readout.round) readout.round.textContent = roundLabel;
      if (readout.contribution) readout.contribution.textContent = String(contribution);
      if (readout.sanction) readout.sanction.textContent = String(sanction);
      readout.element.dataset.active = String(contribution >= 7);
      readout.element.dataset.sanction = String(sanction === 1);
    });
    lastRound = round;
  }

  function paint(time, schematic = false) {
    lastPlaybackTime = time;
    // Timings follow the looping portrait: human play, transfer, agent rounds, then settlement.
    const phase = time < 2 ? 1 : time < 5 ? 2 : time < 9 ? 3 : 4;
    const matrixOpacity = (1 - ease((time - 2.04) / 1.65)).toFixed(3);
    const poolOpacity = 1 - ease((time - 2.21) / 1.64);
    const readoutOpacity = mix(0.72, 1, ease((time - 3.94) / 1.05)).toFixed(3);
    const convergence = ease((time - 9) / 2);
    const demoRound = Math.min(demoRounds.length - 1, Math.max(0, Math.floor((time - 5) * 2)));
    const isFinal = convergence === 1;
    const state = isFinal ? finalRound : demoRounds[phase === 4 ? demoRounds.length - 1 : demoRound];

    if (phase !== lastPhase) {
      stage.dataset.heroPhase = String(phase);
      lastPhase = phase;
    }
    const stageOpacity = matrixOpacity + readoutOpacity;
    if (stageOpacity !== lastStageOpacity) {
      stage.style.setProperty("--matrix-visibility", matrixOpacity);
      stage.style.setProperty("--readout-visibility", readoutOpacity);
      lastStageOpacity = stageOpacity;
    }
    setReadouts(isFinal ? demoRounds.length + 1 : phase === 4 ? demoRounds.length : demoRound + 1, state);
    if (!context || !bounds) return;

    context.setTransform(bounds.scale, 0, 0, bounds.scale, 0, 0);
    context.clearRect(0, 0, bounds.width, bounds.height);
    if (mobile.matches) {
      paintAmbient(time);
      return;
    }
    if (bounds.pool && poolOpacity > 0) paintPool(bounds.pool, time, poolOpacity, schematic);
    if (!bounds.graph) return;

    const points = agentPoints(bounds.graph, convergence);
    const graphOpacity = schematic ? 0.78 : mix(0.34, 0.93, ease((time - 2.5) / 2.45));
    paintAgentGrid(bounds.graph, graphOpacity);
    const formation = !schematic && phase <= 2 ? paintMigration(time) : null;
    paintAgents(points, Math.min(time, 11), state, graphOpacity, convergence, formation);
  }

  function updateLayout() {
    if (!context) return;

    const frame = canvas.getBoundingClientRect();
    if (!frame.width || !frame.height) return;

    function measure(element) {
      const rect = element?.getBoundingClientRect();
      if (!rect?.width || !rect.height) return null;

      return { x: rect.left - frame.left, y: rect.top - frame.top, width: rect.width, height: rect.height };
    }

    // Cache DOM measurements and bound the bitmap size. The frame loop reads only media time.
    const scale = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / (frame.width * frame.height)));
    const width = Math.ceil(frame.width * scale);
    const height = Math.ceil(frame.height * scale);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    bounds = {
      width: frame.width,
      height: frame.height,
      scale,
      pool: measure(pool),
      graph: measure(graph),
      matrix: measure(matrix),
      portrait: measure(portrait),
    };
    bounds.tracks = makeMigrationTracks(bounds);
    paint(landing.classList.contains("has-video") ? video.currentTime : 0, !landing.classList.contains("has-video"));
  }

  function wantsMotion() {
    return userChoice ?? (!reducedMotion.matches && !autoplayBlocked);
  }

  function shouldPlay() {
    return wantsMotion() && visible && !document.hidden && !mediaFailed;
  }

  function animate() {
    animationFrame = 0;
    if (!shouldPlay() || video.paused) return;

    const time = video.currentTime;
    if (time !== lastPlaybackTime) paint(time);
    animationFrame = window.requestAnimationFrame(animate);
  }

  function stopPlayback() {
    playAttempt += 1;
    video.pause();
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    landing.dataset.motion = "paused";
  }

  function synchronizePlayback() {
    const label = wantsMotion() ? "Pause motion" : "Play motion";
    if (motionLabel) motionLabel.textContent = label;
    if (motionToggle.hasAttribute("aria-label")) motionToggle.setAttribute("aria-label", label);
    if (!shouldPlay()) {
      stopPlayback();
      return;
    }
    // Defer the network request until motion is allowed and the stage enters the viewport.
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
    if (!shouldPlay()) {
      stopPlayback();
      return;
    }

    landing.classList.add("has-video");
    landing.dataset.motion = "running";
    paint(video.currentTime);
    if (!animationFrame) animationFrame = window.requestAnimationFrame(animate);
  });
  video.addEventListener("pause", () => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    landing.dataset.motion = "paused";
  });
  video.addEventListener("seeked", () => {
    if (landing.classList.contains("has-video")) paint(video.currentTime);
  });
  video.addEventListener("error", () => {
    if (!video.hasAttribute("src")) return;

    mediaFailed = true;
    landing.classList.remove("has-video");
    stopPlayback();
    paint(0, true);
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
      landing.classList.remove("has-video");
      stopPlayback();
      video.removeAttribute("src");
      video.load();
      paint(0, true);
    }
    synchronizePlayback();
  });
  document.addEventListener("visibilitychange", synchronizePlayback);
  window.addEventListener("pagehide", stopPlayback);
  window.addEventListener("pageshow", synchronizePlayback);
  window.addEventListener("resize", updateLayout, { passive: true });
  mobile.addEventListener("change", updateLayout);

  if ("ResizeObserver" in window) {
    const layoutObserver = new ResizeObserver(updateLayout);
    [stage, pool, graph, matrix, portrait].filter(Boolean).forEach((element) => layoutObserver.observe(element));
  }
  if ("IntersectionObserver" in window) {
    const viewportObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio > 0;
        synchronizePlayback();
      },
      { threshold: [0, 0.02] }
    );
    viewportObserver.observe(stage);
  } else {
    visible = true;
  }

  updateLayout();
  if (!bounds) paint(0, true);
  synchronizePlayback();
})();
