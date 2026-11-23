(() => {
  const canvas = document.querySelector("[data-hero-particles]");
  const stage = canvas?.closest(".hero-stage");
  const portrait = stage?.querySelector(".portrait-plate");
  const video = portrait?.querySelector(".landing-video");
  const scan = portrait?.querySelector(".portrait-scan");
  const humanChart = stage?.querySelector("[data-hero-human]");
  const agentChart = stage?.querySelector("[data-hero-agent]");
  const context = canvas?.getContext("2d");
  if (!context || !video || !humanChart || !agentChart) return;

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
      accent: index % 4 === 0,
      trail: index % 3 === 0,
    };
  });
  const crystalMotes = Array.from({ length: 54 }, (_, index) => ({
    order: ((index * 37) % 59) / 59,
    spread: ((index * 23) % 53) / 53,
    size: 0.65 + (((index * 13) % 51) / 51) * 0.9,
    accent: index % 5 === 0,
  }));

  let tracks = [];
  let crystalLayout;
  let head;
  let finishTime = 0;
  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let lastTime = -1;
  let painted = false;
  let visible = typeof IntersectionObserver === "undefined";
  let colors;

  const clamp = (value) => Math.max(0, Math.min(1, value));
  const mix = (start, end, progress) => start + (end - start) * progress;

  function readColors() {
    const style = getComputedStyle(document.documentElement);
    colors = {
      primary: style.getPropertyValue("--particle-primary").trim() || "#f4f2ed",
      accent: style.getPropertyValue("--particle-accent").trim() || "#e8a23a",
      crystal: style.getPropertyValue("--particle-crystal").trim() || "#e7f5ff",
    };
  }

  function particleColor(particle, crystal = false) {
    return particle.accent ? colors.accent : crystal ? colors.crystal : colors.primary;
  }

  function ease(value) {
    const unit = clamp(value);
    return unit * unit * (3 - 2 * unit);
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

  function chartLanding(chart, stacked, spread) {
    return stacked
      ? { x: chart.x + chart.width * mix(0.74, 0.86, spread), y: chart.y - 4 - 1.5 * spread }
      : { x: chart.x - 4 - 1.5 * spread, y: chart.y + chart.height * mix(0.42, 0.47, spread) };
  }

  function chartRail(chart, spread) {
    return Math.min(width - 1, chart.x + chart.width + 4 + 0.7 * spread);
  }

  function makeTrack({ plate, human, agent, stacked }, lane) {
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

    const outgoing = !stacked
      ? { x: mix(human.x + human.width, plate.x, 0.22), y: point(plate, 0, 0.24 + 0.16 * spread).y }
      : point(plate, 0.008 + spread * 0.02, 0.25 + 0.15 * spread);
    const railX = chartRail(agent, spread);
    const incoming = chartLanding(agent, stacked, spread);

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
    // Sample the circle and its exit together to carry the same velocity into the chart approach.
    if (stacked) {
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
    const landing = makeLanding(from, tangent, plate, agent, stacked, spread, depthScale);
    const duration = (1.48 * landing.length) / speed;

    return {
      loop: loop.samples,
      concealAt,
      revealFrom,
      departure,
      duration,
      end: departure + duration,
      landing: landing.samples,
    };
  }

  function makeLanding(from, tangent, plate, chart, stacked, spread, depthScale) {
    const target = chartLanding(chart, stacked, spread);
    const { y } = target;
    const path = [from];
    const first = { x: from.x + tangent.x * plate.width * 0.23, y: from.y + tangent.y * plate.width * 0.23 };

    if (stacked) {
      // The right gutter and the strip above the chart stay clear of the data and source link.
      const railX = chartRail(chart, spread);
      const shoulder = { x: railX, y: point(plate, 0, 0.53 + 0.05 * spread).y };
      const bend = { x: railX - 12, y };
      appendCurve(path, from, first, { x: railX, y: shoulder.y - plate.height * 0.1 }, shoulder);
      appendCurve(path, shoulder, { x: railX, y: y - 18 }, { x: bend.x + 8, y }, bend);
    } else {
      const edgeOfChart = { x: chart.x - 17 - 4 * spread, y };
      appendCurve(path, from, first, { x: edgeOfChart.x - 48, y }, edgeOfChart);
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

  function travelPoint(track, time) {
    if (time < track.departure) return sample(track.loop, loopProgress(clamp(time)));

    // Match the lap's exit velocity, then slow continuously at the chart edge.
    const remaining = 1 - clamp((time - track.departure) / track.duration);
    return sample(track.landing, 1 - remaining ** 1.48);
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

  function crystalRing(plate, mote, turn, place) {
    const angle = 0.22 + 2 * Math.PI * turn;
    const depth = Math.sin(angle);
    const across = Math.cos(angle);
    const perspective = 1 / (1 - depth * 0.11);
    const x = 0.483 + (0.226 + 0.029 * mote.spread) * across * perspective;
    const y = 0.335 + ((0.079 + 0.031 * mote.spread) * depth - 0.059 * across) * perspective;
    const mapped = place({ x, y });
    return { ...point(plate, mapped.x, mapped.y), depth };
  }

  function crystalOrbitPoint(time, loop, plate, origin, anchor, mote, place) {
    const start = loop.idleEnd + 0.42 * mote.order;
    const join = mix(loop.idleEnd, loop.orbitEnd, 0.19 + 0.063 * mote.order);
    const exit = loop.orbitEnd - 0.69 + 0.49 * mote.order;
    const seam = crystalRing(plate, mote, 0, place);
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
      position = crystalRing(plate, mote, mix(progress, ease(progress), 0.58), place);
    } else {
      const rest = clamp((time - exit) / (loop.orbitEnd + 0.32 - exit));
      const first = place({ x: 0.77, y: 0.32 });
      const second = place({ x: anchor.x + 0.06, y: anchor.y + 0.015 });
      const target = place(anchor);
      position = cubic(seam, point(plate, first.x, first.y), point(plate, second.x, second.y), point(plate, target.x, target.y), ease(rest));
    }

    const u = (position.x - plate.x) / plate.width;
    const v = (position.y - plate.y) / plate.height;
    const face = place({ x: 0.489, y: 0.367 });
    const inFrontOfCheek = position.depth > 0.45 && Math.abs(u - face.x) < 0.13;
    const alpha = ease((time - start) / 0.4) * (1 - ease((time - loop.orbitEnd + 0.12) / 0.44));
    return { ...position, u, v, alpha: alpha * (inFrontOfCheek ? 0.55 : 0.82) };
  }

  function dot(x, y, mote, alpha) {
    if (alpha <= 0.012) return;
    context.beginPath();
    context.arc(x, y, mote.size, 0, Math.PI * 2);
    context.fillStyle = particleColor(mote, true);
    context.globalAlpha = alpha;
    context.fill();
    painted = true;
  }

  function crystalTransferPoint(progress, from, { plate, agent, stacked }, spread) {
    const end = chartLanding(agent, stacked, spread);
    const first = { x: from.x + plate.width * 0.18, y: from.y + (spread - 0.65) * plate.height * 0.17 };
    const travel = 1 - (1 - progress) ** 2.35;
    if (!stacked) return cubic(from, first, { x: end.x - 45, y: end.y }, end, travel);

    const bend = { x: chartRail(agent, spread), y: end.y - 13 };
    if (travel < 0.82) {
      return cubic(from, first, { x: bend.x, y: mix(from.y, bend.y, 0.65) }, bend, travel / 0.82);
    }
    return cubic(bend, { x: bend.x, y: end.y }, { x: mix(bend.x, end.x, 0.53), y: end.y }, end, (travel - 0.82) / 0.18);
  }

  function drawCrystalFrame({ detail: { time, sourceTime, loop, crystalCentroid, anchors, orbitPoints, place, pose } }) {
    drawScan(sourceTime, place, pose.roll);
    clear();
    if (!crystalLayout) return;
    const { plate, human, stacked } = crystalLayout;
    const launch = stacked ? { x: plate.x - 12, width: 0 } : human;
    const roots = anchors?.length ? anchors : [crystalCentroid];
    const idle = time < loop.idleEnd ? 0.23 * Math.sin((Math.PI * time) / loop.idleEnd) ** 2 : 0;
    const hold = time >= loop.growthEnd && time < loop.holdEnd ? 0.28 * Math.sin(((time - loop.growthEnd) * Math.PI) / 2) ** 2 : 0;
    const flash = ease((time - loop.transferEnd + 0.68) / 0.52) * (1 - ease((time - loop.transferEnd) / 0.46));
    stage.style.setProperty("--crystal-source", idle.toFixed(2));
    stage.style.setProperty("--crystal-arrival", Math.max(hold, flash * 0.86).toFixed(2));

    if (time >= loop.idleEnd && time < loop.orbitEnd + 0.32) {
      crystalMotes.forEach((mote, index) => {
        const position = crystalOrbitPoint(time, loop, plate, launch, roots[index % roots.length], mote, place);
        if (!position || position.alpha < 0.012) return;
        const { x, y, depth, u, v, alpha } = position;
        if (u < 0.12 || u > 0.88) dot(x, y, mote, alpha);
        else orbitPoints.push({ x: u, y: v, depth, opacity: alpha, size: mote.size, color: particleColor(mote, true) });
      });
    }
    if (time >= loop.holdEnd && time < loop.transferEnd + 0.44) {
      crystalMotes.forEach((mote) => {
        const start = loop.holdEnd + 0.92 * mote.order;
        const arrival = loop.transferEnd - 0.08 - 0.65 * (1 - mote.order);
        if (time <= start || time > arrival + 0.44) return;
        const progress = clamp((time - start) / (arrival - start));
        const origin = place({
          x: crystalCentroid.x + (mote.spread - 0.5) * 0.14,
          y: crystalCentroid.y + (mote.order - 0.5) * 0.15,
        });
        const from = point(plate, origin.x, origin.y);
        const { x, y } = crystalTransferPoint(progress, from, crystalLayout, mote.spread);
        const opacity = 0.87 * ease((time - start) / 0.28) * (1 - ease((time - arrival - 0.08) / 0.36));
        dot(x, y, mote, opacity);
      });
    }
  }

  function clearScan() {
    scan?.removeAttribute("style");
  }

  function drawScan(time, place, roll = 0) {
    const start = 1.08;
    const end = 6.8;
    if (!scan) return;
    if (time <= start || time >= end) {
      clearScan();
      return;
    }

    const acrossFace = { x: 0.485, y: mix(0.145, 0.504, ease((time - start) / (end - start))) };
    const mapped = place?.(acrossFace) ?? acrossFace;
    // Keep the clean opening and lower the sweep's brightness around both eyes.
    const eyelidShade = 1 - 0.67 * Math.exp(-(((acrossFace.y - 0.277) / 0.035) ** 2));
    const light = 0.63 * eyelidShade * ease((time - start) / 0.7) * ease((end - time) / 1.05);
    scan.style.setProperty("--scan-center", `${(mapped.x * 100).toFixed(2)}%`);
    scan.style.setProperty("--scan-position", `${(mapped.y * 100).toFixed(2)}%`);
    scan.style.setProperty("--scan-roll", `${roll.toFixed(4)}rad`);
    scan.style.setProperty("--scan-opacity", light.toFixed(3));
  }

  function draw(time) {
    drawScan(time);
    clear();
    const fade = ease((finishTime - time) / arrivalFade);
    const arrival = ease((time - (finishTime - arrivalHold - arrivalFade) + 0.14) / 0.22) * fade;
    stage.style.setProperty("--crystal-arrival", (0.68 * arrival).toFixed(2));
    if (!tracks.length || time < 1.92 || time >= finishTime) return;

    particles.forEach((particle) => {
      const track = tracks[particle.lane];
      const elapsed = time - particle.begin;
      if (elapsed <= 0) return;
      const travel = elapsed / particle.duration;
      const untilHidden = track.concealAt * particle.duration - elapsed;
      const revealAge = elapsed - track.revealFrom * particle.duration;
      const current = travelPoint(track, travel);
      const parking = ease((travel - track.departure - track.duration * 0.65) / (track.duration * 0.35));
      const light = particle.opacity * ease(elapsed / 0.28) * fade * mix(1, 0.27, parking);
      const alpha = light * depthOpacity(current, untilHidden, revealAge);
      if (alpha < 0.006) return;
      const x = current.x + particle.restX * parking;
      const y = current.y + particle.restY * parking;
      if (particle.trail && travel > 0.008 && travel < track.end - 0.01) {
        const trailTime = travel - 0.007;
        const trailDelay = (travel - trailTime) * particle.duration;
        const behind = travelPoint(track, trailTime);
        context.beginPath();
        context.moveTo(behind.x + particle.restX * parking, behind.y + particle.restY * parking);
        context.lineTo(x, y);
        context.strokeStyle = particleColor(particle);
        context.lineWidth = 0.65;
        context.globalAlpha = Math.min(alpha, light * depthOpacity(behind, untilHidden + trailDelay, revealAge - trailDelay)) * 0.24;
        context.stroke();
      }
      context.beginPath();
      const size = particle.size * (mobile.matches ? 0.85 : 1) * mix(0.63, 1.31, (current.depth + 1) / 2) * mix(1, 0.82, parking);
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fillStyle = particleColor(particle);
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
    const time =
      document.documentElement.dataset.theme === "day" && Number.isFinite(video.duration)
        ? (video.currentTime / video.duration) * Number(video.dataset.poseDuration)
        : video.currentTime;
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
    const human = bounds(humanChart);
    const agent = bounds(agentChart);
    if (!plate || !human || !agent) return;

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
    crystalLayout = { plate, human, agent, stacked: agent.y > plate.y + 0.75 * plate.height };
    head = { ...point(plate, 0.486, 0.322), radiusX: plate.width * 0.174, radiusY: plate.height * 0.23 };
    tracks = Array.from({ length: laneCount }, (_, lane) => makeTrack(crystalLayout, lane));
    const lastArrival = Math.max(...particles.map(({ begin, duration, lane }) => begin + duration * tracks[lane].end));
    finishTime = lastArrival + arrivalHold + arrivalFade;
    lastTime = -1;
    synchronize();
  }

  video.addEventListener("playing", synchronize);
  stage.addEventListener("hero-crystal-frame", drawCrystalFrame);
  stage.addEventListener("hero-crystal-mode", () => {
    clearScan();
    stage.style.removeProperty("--crystal-arrival");
    stage.style.removeProperty("--crystal-source");
    measure();
  });
  ["pause", "waiting", "ended", "emptied", "error"].forEach((event) => video.addEventListener(event, suspend));
  ["emptied", "error"].forEach((event) => video.addEventListener(event, clearScan));
  document.addEventListener("visibilitychange", synchronize);
  reducedMotion.addEventListener("change", ({ matches }) => {
    if (matches) {
      clearScan();
      stage.style.removeProperty("--crystal-arrival");
      stage.style.removeProperty("--crystal-source");
    }
    synchronize();
  });
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("themechange", () => {
    readColors();
    lastTime = -1;
    measure();
  });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(measure);
    [stage, portrait, humanChart, agentChart].forEach((element) => observer.observe(element));
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

  readColors();
  measure();
})();
