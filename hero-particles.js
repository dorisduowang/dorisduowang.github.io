(() => {
  const canvas = document.querySelector("[data-hero-particles]");
  const stage = canvas?.closest(".hero-stage");
  const portrait = stage?.querySelector(".portrait-plate");
  const video = portrait?.querySelector(".landing-video");
  const model = portrait?.querySelector("[data-bionic-portrait]");
  const neutral = model?.querySelector(".portrait-neutral");
  const armor = model?.querySelector(".portrait-armor");
  const speech = stage?.querySelector(".round-speech");
  const choices = stage?.querySelector(".round-selector");
  const players = Array.from(choices?.querySelectorAll("[data-hero-player]") ?? []);
  const context = canvas?.getContext("2d");
  if (!context || !video || !players.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 767px)");
  const laneCount = 6;
  const occlusionEdge = 0.94;
  const concealDuration = 0.3;
  const revealDuration = 0.32;
  const arrivalHold = 0.3;
  const arrivalFade = 0.48;
  const particles = Array.from({ length: 36 }, (_, index) => {
    const order = ((index * 17) % 37) / 37;
    const spread = ((index * 13) % 31) / 31;
    return {
      lane: index % laneCount,
      begin: 1.92 + 0.66 * order,
      duration: 3.55 + 0.31 * spread,
      size: 0.75 + 1.05 * spread,
      opacity: 0.42 + 0.42 * order,
      restX: (spread - 0.5) * 12,
      restY: (order - 0.5) * 1.1,
      color: index % 4 === 0 ? "#e8a23a" : "#f4f2ed",
      trail: index % 3 === 0,
    };
  });
  const crystalMotes = Array.from({ length: 54 }, (_, index) => ({
    order: ((index * 37) % 59) / 59,
    spread: ((index * 23) % 53) / 53,
    size: 0.65 + (((index * 13) % 51) / 51) * 0.9,
    color: index % 5 === 0 ? "#e8a23a" : "#e7f5ff",
  }));

  let tracks = [];
  let crystalLayout;
  let head;
  let lastDeparture = 0;
  let lastArrival = 0;
  let finishTime = 0;
  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let lastTime = -1;
  let lastPortraitFrame = "";
  let painted = false;
  let visible = typeof IntersectionObserver === "undefined";
  let selected = players.findIndex((player) => player.getAttribute("aria-pressed") === "true");
  let previousWeights = players.map((_, index) => Number(index === selected));
  let selectionTime = -Infinity;

  const clamp = (value) => Math.max(0, Math.min(1, value));
  const mix = (start, end, progress) => start + (end - start) * progress;

  function ease(value) {
    const unit = clamp(value);
    return unit * unit * (3 - 2 * unit);
  }

  function weightsAt(time) {
    const blend = ease((time - selectionTime) / 300);
    return previousWeights.map((weight, index) => mix(weight, Number(index === selected), blend));
  }

  function point(box, x, y) {
    return { x: box.x + box.width * x, y: box.y + box.height * y };
  }

  function cubic(start, first, second, end, t) {
    const left = 1 - t;
    return {
      x: left ** 3 * start.x + 3 * left ** 2 * t * first.x + 3 * left * t ** 2 * second.x + t ** 3 * end.x,
      y: left ** 3 * start.y + 3 * left ** 2 * t * first.y + 3 * left * t ** 2 * second.y + t ** 3 * end.y,
      depth: mix(start.depth ?? 0, end.depth ?? 0, ease(t)),
    };
  }

  function interpolatePoint(from, to, ratio) {
    return {
      x: mix(from.x, to.x, ratio),
      y: mix(from.y, to.y, ratio),
      depth: mix(from.depth ?? 0, to.depth ?? 0, ratio),
    };
  }

  function uniformTrack(points, depthScale, checkpoints = []) {
    const lengths = [0];
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const depth = (current.depth ?? 0) - (previous.depth ?? 0);
      lengths.push(lengths[index - 1] + Math.hypot(current.x - previous.x, current.y - previous.y, depth * depthScale));
    }

    // The transfer is sampled by distance so changes in path curvature do not cause speed jumps.
    const total = lengths.at(-1);
    let next = 1;
    const samples = Array.from({ length: 161 }, (_, index) => {
      const distance = (total * index) / 160;
      while (lengths[next] < distance && next < points.length - 1) next += 1;
      const ratio = (distance - lengths[next - 1]) / (lengths[next] - lengths[next - 1]);
      return interpolatePoint(points[next - 1], points[next], ratio);
    });
    return { samples, length: total, checkpoints: checkpoints.map((index) => lengths[index] / total) };
  }

  function appendCurve(points, start, first, second, end) {
    for (let step = 1; step <= 24; step += 1) points.push(cubic(start, first, second, end, step / 24));
  }

  const loopProgress = (time) => mix(time, ease(time), 0.24);

  function crossing(low, high, before) {
    for (let step = 0; step < 18; step += 1) {
      const midpoint = (low + high) / 2;
      if (before(midpoint)) low = midpoint;
      else high = midpoint;
    }
    return (low + high) / 2;
  }

  function makeTrack(plate, message, selector, buttons, lane) {
    const spread = lane / (laneCount - 1);
    const center = point(plate, 0.486, 0.355);
    const radiusX = plate.width * mix(0.254, 0.29, spread);
    const radiusY = plate.height * mix(0.09, 0.112, spread);
    const seamAngle = -0.48;
    const depthScale = plate.width * 0.21;

    // Project a tilted ring. The near arc passes below the eyes, and the far arc crosses behind the portrait.
    function ringPoint(angle) {
      const depth = Math.sin(angle);
      const across = Math.cos(angle);
      const perspective = 1 / (1 - 0.13 * depth);
      return {
        x: center.x + radiusX * across * perspective,
        y: center.y + (radiusY * depth - plate.height * 0.026 * across) * perspective,
        depth,
      };
    }

    const seam = ringPoint(seamAngle);
    const nearby = ringPoint(seamAngle + 0.01);
    const length = Math.hypot(nearby.x - seam.x, nearby.y - seam.y);
    const tangent = { x: (nearby.x - seam.x) / length, y: (nearby.y - seam.y) / length };
    const handle = (signedDistance) => ({ x: seam.x + tangent.x * signedDistance, y: seam.y + tangent.y * signedDistance });

    const outgoing =
      message && !mobile.matches
        ? { x: mix(message.x + message.width, plate.x, 0.22), y: point(plate, 0, 0.24 + 0.16 * spread).y }
        : point(plate, 0.008 + spread * 0.02, 0.25 + 0.15 * spread);
    const railX = selector.x + selector.width - 3 - 3 * spread;
    const incoming = mobile.matches
      ? { x: railX, y: selector.y - 5 - 7 * spread }
      : { x: selector.x - 10 - 6 * spread, y: selector.y + selector.height * mix(0.19, 0.43, spread) };

    const points = [outgoing];
    appendCurve(points, outgoing, { x: mix(outgoing.x, seam.x, 0.46), y: plate.y - plate.height * 0.02 }, handle(-plate.width * 0.32), seam);
    const orbitSteps = 104;
    const angleStep = (Math.PI * 2) / orbitSteps;
    // The left turn and rear midpoint bracket the two crossings of the head silhouette.
    const orbitStart = points.length - 1;
    const rearEntry = orbitStart + Math.ceil((Math.PI - seamAngle) / angleStep);
    const rearCenter = orbitStart + Math.ceil(((Math.PI * 3) / 2 - seamAngle) / angleStep);
    for (let step = 1; step <= orbitSteps; step += 1) {
      points.push(ringPoint(seamAngle + (Math.PI * 2 * step) / orbitSteps));
    }
    const checkpoint = points.length - 1;
    // Use a shared exit reference to keep the orbit's timing independent of the eventual target.
    if (mobile.matches) {
      const shoulder = { x: railX, y: point(plate, 0, 0.53 + 0.05 * spread).y };
      appendCurve(points, seam, handle(plate.width * 0.23), { x: shoulder.x, y: shoulder.y - plate.height * 0.1 }, shoulder);
      appendCurve(
        points,
        shoulder,
        { x: shoulder.x, y: mix(shoulder.y, incoming.y, 0.3) },
        { x: incoming.x - 1.4 * spread, y: mix(shoulder.y, incoming.y, 0.76) },
        incoming
      );
    } else {
      appendCurve(points, seam, handle(plate.width * 0.23), { x: mix(seam.x, incoming.x, 0.91), y: incoming.y - plate.height * 0.07 }, incoming);
    }
    const loop = uniformTrack(points, depthScale, [rearEntry, rearCenter, checkpoint]);
    const [entryProgress, rearProgress, exitProgress] = loop.checkpoints;
    const concealProgress = crossing(entryProgress, rearProgress, (progress) => headDistance(sample(loop.samples, progress)) > occlusionEdge);
    const revealProgress = crossing(rearProgress, exitProgress, (progress) => headDistance(sample(loop.samples, progress)) < occlusionEdge);
    const concealAt = crossing(0, 1, (time) => loopProgress(time) < concealProgress);
    const revealFrom = crossing(0, 1, (time) => loopProgress(time) < revealProgress);
    const departure = crossing(0, 1, (time) => loopProgress(time) < exitProgress);
    const speed = loop.length * (0.76 + 1.44 * departure * (1 - departure));
    const from = sample(loop.samples, exitProgress);
    const landings = buttons.map((button) => makeLanding(from, tangent, plate, selector, button, buttons[0].y, spread, depthScale));
    const duration = (1.48 * Math.max(...landings.map(({ length }) => length))) / speed;

    return {
      loop: loop.samples,
      concealAt,
      revealFrom,
      departure,
      duration,
      end: departure + duration,
      landings: landings.map(({ samples, length }) => ({ samples, exponent: (speed * duration) / length })),
    };
  }

  function makeLanding(from, tangent, plate, selector, button, firstRow, spread, depthScale) {
    const below = !mobile.matches && button.y > firstRow + 1;
    const edge = below ? button.y + button.height : button.y;
    const y = edge + (below ? 1 : -1) * (3.8 + 0.7 * spread);
    const target = { x: button.x + button.width / 2 + 8 * (spread - 0.5), y };
    const path = [from];
    const first = { x: from.x + tangent.x * plate.width * 0.23, y: from.y + tangent.y * plate.width * 0.23 };

    if (mobile.matches) {
      // The right gutter and the strip above the buttons stay clear of their labels and numbers.
      const railX = selector.x + selector.width + 4.1 + 0.6 * spread;
      const shoulder = { x: railX, y: point(plate, 0, 0.53 + 0.05 * spread).y };
      const bend = { x: railX - 12, y };
      appendCurve(path, from, first, { x: railX, y: shoulder.y - plate.height * 0.1 }, shoulder);
      appendCurve(path, shoulder, { x: railX, y: y - 18 }, { x: bend.x + 8, y }, bend);
    } else {
      const edgeOfGrid = { x: selector.x - 11 - 4 * spread, y };
      appendCurve(path, from, first, { x: edgeOfGrid.x - 64, y }, edgeOfGrid);
    }
    path.push(target);
    return uniformTrack(path, depthScale);
  }

  function sample(track, progress) {
    const distance = clamp(progress) * (track.length - 1);
    const index = Math.min(Math.floor(distance), track.length - 2);
    const ratio = distance - index;
    return interpolatePoint(track[index], track[index + 1], ratio);
  }

  function travelPoint(track, time, weights) {
    if (time < track.departure) return sample(track.loop, loopProgress(clamp(time)));

    // Match the lap's exit velocity, then slow continuously to zero at the button edge.
    const remaining = 1 - clamp((time - track.departure) / track.duration);
    const center = { x: 0, y: 0, depth: 0 };
    weights.forEach((weight, index) => {
      if (weight <= 0) return;
      const landing = track.landings[index];
      const position = sample(landing.samples, 1 - remaining ** landing.exponent);
      center.x += weight * position.x;
      center.y += weight * position.y;
      center.depth += weight * position.depth;
    });
    return center;
  }

  function clear() {
    if (!painted) return;
    context.clearRect(0, 0, width, height);
    painted = false;
  }

  function headDistance({ x, y }) {
    return Math.hypot((x - head.x) / head.radiusX, (y - head.y) / head.radiusY);
  }

  function depthOpacity(position, untilHidden, revealAge) {
    const { x, y, depth } = position;
    const behind = ease(-depth / 0.4);
    const rim = ease((headDistance(position) - occlusionEdge) / 0.13);
    // Fade toward the near edge of the shadow, then reveal past the far edge on the media clock.
    const visibility = revealAge < 0 ? ease(untilHidden / concealDuration) : ease(revealAge / revealDuration);
    let cheekShade = 1;
    if (depth > 0) {
      // Feather the dimming around the lower face so it never forms a visible boundary.
      const across = (x - head.x) / (head.radiusX * 0.91);
      const down = (y - head.y - head.radiusY * 0.56) / (head.radiusY * 0.38);
      const coverage = 1 - ease((Math.hypot(across, down) - 0.58) / 0.44);
      cheekShade = 1 - 0.38 * coverage * ease(depth / 0.38);
    }
    return mix(1, rim, behind) * mix(0.49, 1.1, (depth + 1) / 2) * visibility * cheekShade;
  }

  function crystalRing(plate, mote, turn) {
    const angle = 0.22 + 2 * Math.PI * turn;
    const depth = Math.sin(angle);
    const across = Math.cos(angle);
    const perspective = 1 / (1 - depth * 0.11);
    const x = 0.483 + (0.226 + 0.029 * mote.spread) * across * perspective;
    const y = 0.335 + ((0.079 + 0.031 * mote.spread) * depth - 0.059 * across) * perspective;
    return { ...point(plate, x, y), depth };
  }

  function crystalOrbitPoint(time, loop, plate, origin, anchor, mote) {
    const start = loop.idleEnd + 0.42 * mote.order;
    const join = mix(loop.idleEnd, loop.orbitEnd, 0.19 + 0.063 * mote.order);
    const exit = loop.orbitEnd - 0.69 + 0.49 * mote.order;
    const seam = crystalRing(plate, mote, 0);
    if (time < start) return null;

    let position;
    if (time < join) {
      const arrival = clamp((time - start) / (join - start));
      const from = {
        x: origin.x + origin.width - 7 + 21 * mote.spread,
        y: point(plate, 0, 0.31 + 0.08 * mote.spread).y,
        depth: -0.36,
      };
      // Approach across the crown, then make exactly one complete turn around the skull.
      position = cubic(from, point(plate, 0.1, 0.01), point(plate, 0.83, 0.025), seam, ease(arrival));
    } else if (time < exit) {
      const progress = clamp((time - join) / (exit - join));
      position = crystalRing(plate, mote, mix(progress, ease(progress), 0.58));
    } else {
      const rest = clamp((time - exit) / (loop.orbitEnd + 0.32 - exit));
      position = cubic(seam, point(plate, 0.77, 0.32), point(plate, anchor.x + 0.06, anchor.y + 0.015), point(plate, anchor.x, anchor.y), ease(rest));
    }

    const u = (position.x - plate.x) / plate.width;
    const v = (position.y - plate.y) / plate.height;
    const inFrontOfCheek = position.depth > 0.45 && u > 0.358 && u < 0.62;
    const alpha = ease((time - start) / 0.4) * (1 - ease((time - loop.orbitEnd + 0.12) / 0.44));
    return { ...position, u, v, alpha: alpha * (inFrontOfCheek ? 0.55 : 0.82) };
  }

  function dot(x, y, mote, alpha) {
    if (alpha <= 0.012) return;
    context.beginPath();
    context.arc(x, y, mote.size, 0, Math.PI * 2);
    context.fillStyle = mote.color;
    context.globalAlpha = alpha;
    context.fill();
    painted = true;
  }

  function crystalTransferPoint(progress, from, plate, buttons, weights, mote) {
    const location = { x: 0, y: 0 };
    const firstRow = buttons[0].y;
    buttons.forEach((button, index) => {
      const weight = weights[index];
      if (!weight) return;
      const below = button.y > firstRow + 1;
      const end = point(button, 0.42 + 0.16 * mote.spread, below ? 1 : 0);
      end.y += (below ? 1 : -1) * (3.5 + 1.5 * mote.spread);
      const first = { x: from.x + plate.width * 0.18, y: from.y + (mote.spread - 0.65) * plate.height * 0.17 };
      const second = { x: end.x - 45, y: end.y + (below ? 9 : -9) };
      const position = cubic(from, first, second, end, 1 - (1 - progress) ** 2.35);
      location.x += position.x * weight;
      location.y += position.y * weight;
    });
    return location;
  }

  function drawCrystalFrame({ detail: { time, loop, crystalCentroid, anchors, orbitPoints } }) {
    clear();
    if (!crystalLayout) return;
    const { plate, message, buttons } = crystalLayout;
    const roots = anchors?.length ? anchors : [crystalCentroid];
    const idle = time < loop.idleEnd ? 0.23 * Math.sin((Math.PI * time) / loop.idleEnd) ** 2 : 0;
    const hold = time >= loop.growthEnd && time < loop.holdEnd ? 0.28 * Math.sin(((time - loop.growthEnd) * Math.PI) / 2) ** 2 : 0;
    const flash = ease((time - loop.transferEnd + 0.68) / 0.52) * (1 - ease((time - loop.transferEnd) / 0.46));
    stage.style.setProperty("--crystal-source", idle.toFixed(2));
    stage.style.setProperty("--crystal-arrival", Math.max(hold, flash * 0.86).toFixed(2));
    stage.style.setProperty("--crystal-label", (flash * 0.75).toFixed(2));

    if (time >= loop.idleEnd && time < loop.orbitEnd + 0.32) {
      crystalMotes.forEach((mote, index) => {
        const position = crystalOrbitPoint(time, loop, plate, message, roots[index % roots.length], mote);
        if (!position || position.alpha < 0.012) return;
        const { x, y, depth, u, v, alpha } = position;
        if (u < 0.12 || u > 0.88) dot(x, y, mote, alpha);
        else orbitPoints.push({ x: u, y: v, depth, opacity: alpha, size: mote.size, color: mote.color });
      });
    }
    if (time >= loop.holdEnd && time < loop.transferEnd + 0.44) {
      const weights = weightsAt(performance.now());
      crystalMotes.forEach((mote) => {
        const start = loop.holdEnd + 0.92 * mote.order;
        const arrival = loop.transferEnd - 0.08 - 0.65 * (1 - mote.order);
        if (time <= start || time > arrival + 0.44) return;
        const progress = clamp((time - start) / (arrival - start));
        const from = point(plate, crystalCentroid.x + (mote.spread - 0.5) * 0.14, crystalCentroid.y + (mote.order - 0.5) * 0.15);
        const { x, y } = crystalTransferPoint(progress, from, plate, buttons, weights, mote);
        const opacity = 0.87 * ease((time - start) / 0.28) * (1 - ease((time - arrival - 0.08) / 0.36));
        dot(x, y, mote, opacity);
      });
    }
  }

  function resetPortrait() {
    if (!lastPortraitFrame) return;
    model.removeAttribute("style");
    lastPortraitFrame = "";
  }

  function drawPortrait(time) {
    if (!neutral?.complete || !neutral.naturalWidth || !armor?.complete || !armor.naturalWidth || !lastDeparture) return;

    // A single aligned frame keeps her expression unchanged throughout the transfer.
    // Hand the portrait back to the original motion as its ending pose settles.
    const stillness = ease((time - 0.94) / 0.48) * (1 - ease((time - 11.2) / 0.44));
    if (!stillness) {
      resetPortrait();
      return;
    }

    // Use the last particle in each phase so the face stays human for the whole lap.
    const sweep = clamp((time - 1.92) / (lastDeparture - 1.92));
    const build = clamp((time - lastDeparture) / 0.54);
    const restore = ease((time - lastArrival) / 0.52);
    const material = ease(build) * (1 - restore);
    const reveal = mix(12, 74, build);
    const scan = sweep < 1 ? mix(14, 53, sweep) : reveal;
    const light = sweep < 1 ? 0.4 * Math.sin(Math.PI * sweep) : 0.78 * Math.sin(Math.PI * build);
    const frame = [stillness, material, reveal, scan, light].map((value) => value.toFixed(3)).join(" ");
    if (frame === lastPortraitFrame) return;
    lastPortraitFrame = frame;
    model.style.setProperty("--neutral-opacity", stillness.toFixed(3));
    model.style.setProperty("--armor-opacity", material.toFixed(3));
    model.style.setProperty("--armor-mask-start", `${(reveal - 5).toFixed(2)}%`);
    model.style.setProperty("--armor-mask-end", `${(reveal + 5).toFixed(2)}%`);
    model.style.setProperty("--scan-position", `${scan.toFixed(2)}%`);
    model.style.setProperty("--scan-opacity", light.toFixed(3));
  }

  function draw(time) {
    drawPortrait(time);
    clear();
    if (!tracks.length || time < 1.92 || time >= finishTime) return;

    const weights = weightsAt(performance.now());
    const fade = ease((finishTime - time) / arrivalFade);
    particles.forEach((particle) => {
      const track = tracks[particle.lane];
      const elapsed = time - particle.begin;
      if (elapsed <= 0) return;
      const travel = elapsed / particle.duration;
      const untilHidden = track.concealAt * particle.duration - elapsed;
      const revealAge = elapsed - track.revealFrom * particle.duration;
      const current = travelPoint(track, travel, weights);
      const parking = ease((travel - track.departure - track.duration * 0.65) / (track.duration * 0.35));
      const light = particle.opacity * ease(elapsed / 0.28) * fade * mix(1, 0.27, parking);
      const alpha = light * depthOpacity(current, untilHidden, revealAge);
      if (alpha < 0.006) return;
      const x = current.x + particle.restX * parking;
      const y = current.y + particle.restY * parking;
      if (particle.trail && travel > 0.008 && travel < track.end - 0.01) {
        const trailTime = travel - 0.007;
        const trailDelay = (travel - trailTime) * particle.duration;
        const behind = travelPoint(track, trailTime, weights);
        context.beginPath();
        context.moveTo(behind.x + particle.restX * parking, behind.y + particle.restY * parking);
        context.lineTo(x, y);
        context.strokeStyle = particle.color;
        context.lineWidth = 0.65;
        context.globalAlpha = Math.min(alpha, light * depthOpacity(behind, untilHidden + trailDelay, revealAge - trailDelay)) * 0.24;
        context.stroke();
      }
      context.beginPath();
      const size = particle.size * (mobile.matches ? 0.85 : 1) * mix(0.63, 1.31, (current.depth + 1) / 2) * mix(1, 0.82, parking);
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fillStyle = particle.color;
      context.globalAlpha = alpha;
      context.fill();
      painted = true;
    });
  }

  function canAnimate() {
    return (
      visible &&
      stage.dataset.crystal !== "3d" &&
      !reducedMotion.matches &&
      !document.hidden &&
      !video.paused &&
      !video.ended &&
      video.readyState >= video.HAVE_CURRENT_DATA
    );
  }

  function tick() {
    animationFrame = 0;
    if (!canAnimate()) {
      suspend();
      return;
    }
    const time = video.currentTime;
    if (time !== lastTime) {
      draw(time);
      lastTime = time;
    }
    animationFrame = window.requestAnimationFrame(tick);
  }

  function suspend() {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    clear();
    lastTime = -1;
  }

  function synchronize() {
    if (canAnimate()) {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(tick);
    } else {
      suspend();
    }
  }

  function measure() {
    const frame = canvas.getBoundingClientRect();
    if (!frame.width || !frame.height) return;

    function bounds(element) {
      const rect = element?.getBoundingClientRect();
      if (!rect?.width || !rect.height) return null;
      return { x: rect.left - frame.left, y: rect.top - frame.top, width: rect.width, height: rect.height };
    }

    const plate = bounds(portrait);
    const selector = bounds(choices);
    const buttons = players.map(bounds);
    if (!plate || !selector || buttons.some((button) => !button)) return;

    const previousWidth = width;
    const previousHeight = height;
    width = frame.width;
    height = frame.height;
    const limit = stage.dataset.crystal === "3d" ? 1.75 : 2;
    const density = Math.min(window.devicePixelRatio || 1, limit, Math.sqrt(4_000_000 / (width * height)));
    const pixelWidth = Math.ceil(width * density);
    const pixelHeight = Math.ceil(height * density);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight || width !== previousWidth || height !== previousHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      context.setTransform(density, 0, 0, density, 0, 0);
      painted = false;
    }
    const message = bounds(speech);
    crystalLayout = { plate, message: message ?? plate, buttons };
    head = { ...point(plate, 0.486, 0.322), radiusX: plate.width * 0.174, radiusY: plate.height * 0.23 };
    tracks = Array.from({ length: laneCount }, (_, lane) => makeTrack(plate, message, selector, buttons, lane));
    lastDeparture = Math.max(...particles.map(({ begin, duration, lane }) => begin + duration * tracks[lane].departure));
    lastArrival = Math.max(...particles.map(({ begin, duration, lane }) => begin + duration * tracks[lane].end));
    finishTime = lastArrival + arrivalHold + arrivalFade;
    lastTime = -1;
    synchronize();
  }

  video.addEventListener("playing", synchronize);
  stage.addEventListener("hero-crystal-frame", drawCrystalFrame);
  stage.addEventListener("hero-crystal-mode", () => {
    resetPortrait();
    measure();
  });
  ["pause", "waiting", "ended", "emptied", "error"].forEach((event) => video.addEventListener(event, suspend));
  ["emptied", "error"].forEach((event) => video.addEventListener(event, resetPortrait));
  document.addEventListener("visibilitychange", synchronize);
  reducedMotion.addEventListener("change", ({ matches }) => {
    if (matches) resetPortrait();
    synchronize();
  });
  const selectionObserver = new MutationObserver(() => {
    const next = players.findIndex((player) => player.getAttribute("aria-pressed") === "true");
    if (next === selected || next < 0) return;

    const now = performance.now();
    previousWeights = weightsAt(now);
    selected = next;
    selectionTime = now;
  });
  players.forEach((player) => selectionObserver.observe(player, { attributeFilter: ["aria-pressed"] }));
  window.addEventListener("resize", measure, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(measure);
    [stage, portrait, speech, choices].filter(Boolean).forEach((element) => observer.observe(element));
  }
  if (typeof IntersectionObserver !== "undefined") {
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio > 0;
        synchronize();
      },
      { threshold: [0, 0.02] }
    );
    observer.observe(video);
  }

  measure();
})();
