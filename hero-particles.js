(() => {
  const canvas = document.querySelector("[data-hero-particles]");
  const stage = canvas?.closest(".hero-stage");
  const portrait = stage?.querySelector(".portrait-plate");
  const video = portrait?.querySelector(".landing-video");
  const speech = stage?.querySelector(".round-speech");
  const choices = stage?.querySelector(".round-selector");
  const players = Array.from(choices?.querySelectorAll("[data-hero-player]") ?? []);
  const context = canvas?.getContext("2d");
  if (!context || !video || !players.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 767px)");
  const laneCount = 6;
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

  let tracks = [];
  let head;
  let finishTime = 0;
  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let lastTime = -1;
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

  function uniformTrack(points, depthScale, checkpoint = 0) {
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
    return { samples, length: total, seam: lengths[checkpoint] / total };
  }

  function appendCurve(points, start, first, second, end) {
    for (let step = 1; step <= 24; step += 1) points.push(cubic(start, first, second, end, step / 24));
  }

  const loopProgress = (time) => mix(time, ease(time), 0.24);

  function loopTimeAt(distance) {
    let low = 0;
    let high = 1;
    for (let step = 0; step < 18; step += 1) {
      const midpoint = (low + high) / 2;
      if (loopProgress(midpoint) < distance) low = midpoint;
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
    for (let step = 1; step <= 104; step += 1) {
      points.push(ringPoint(seamAngle + (Math.PI * 2 * step) / 104));
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
    const loop = uniformTrack(points, depthScale, checkpoint);
    const departure = loopTimeAt(loop.seam);
    const speed = loop.length * (0.76 + 1.44 * departure * (1 - departure));
    const from = sample(loop.samples, loop.seam);
    const landings = buttons.map((button) => makeLanding(from, tangent, plate, selector, button, buttons[0].y, spread, depthScale));
    const duration = (1.48 * Math.max(...landings.map(({ length }) => length))) / speed;

    return {
      loop: loop.samples,
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

  function depthOpacity(position) {
    const { x, y, depth } = position;
    const silhouette = Math.hypot((x - head.x) / head.radiusX, (y - head.y) / head.radiusY);
    const behind = ease(-depth / 0.4);
    const rim = ease((silhouette - 0.94) / 0.13);
    return mix(1, rim, behind) * mix(0.49, 1.1, (depth + 1) / 2);
  }

  function draw(time) {
    clear();
    if (!tracks.length || time < 1.92 || time >= finishTime) return;

    const weights = weightsAt(performance.now());
    const fade = ease((finishTime - time) / arrivalFade);
    particles.forEach((particle) => {
      const track = tracks[particle.lane];
      const elapsed = time - particle.begin;
      if (elapsed <= 0) return;
      const travel = elapsed / particle.duration;
      const current = travelPoint(track, travel, weights);
      const parking = ease((travel - track.departure - track.duration * 0.65) / (track.duration * 0.35));
      const light = particle.opacity * ease(elapsed / 0.28) * fade * mix(1, 0.27, parking);
      const alpha = light * depthOpacity(current);
      if (alpha < 0.006) return;
      const x = current.x + particle.restX * parking;
      const y = current.y + particle.restY * parking;
      if (particle.trail && travel > 0.008 && travel < track.end - 0.01) {
        const behind = travelPoint(track, travel - 0.007, weights);
        context.beginPath();
        context.moveTo(behind.x + particle.restX * parking, behind.y + particle.restY * parking);
        context.lineTo(x, y);
        context.strokeStyle = particle.color;
        context.lineWidth = 0.65;
        context.globalAlpha = Math.min(alpha, light * depthOpacity(behind)) * 0.24;
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
    return visible && !reducedMotion.matches && !document.hidden && !video.paused && !video.ended && video.readyState >= video.HAVE_CURRENT_DATA;
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
    const density = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / (width * height)));
    const pixelWidth = Math.ceil(width * density);
    const pixelHeight = Math.ceil(height * density);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight || width !== previousWidth || height !== previousHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      context.setTransform(density, 0, 0, density, 0, 0);
      painted = false;
    }
    const message = bounds(speech);
    head = { ...point(plate, 0.486, 0.322), radiusX: plate.width * 0.174, radiusY: plate.height * 0.23 };
    tracks = Array.from({ length: laneCount }, (_, lane) => makeTrack(plate, message, selector, buttons, lane));
    const lastArrival = Math.max(...particles.map(({ begin, duration, lane }) => begin + duration * tracks[lane].end));
    finishTime = lastArrival + arrivalHold + arrivalFade;
    lastTime = -1;
    synchronize();
  }

  video.addEventListener("playing", synchronize);
  ["pause", "waiting", "ended", "emptied", "error"].forEach((event) => video.addEventListener(event, suspend));
  document.addEventListener("visibilitychange", synchronize);
  reducedMotion.addEventListener("change", synchronize);
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
