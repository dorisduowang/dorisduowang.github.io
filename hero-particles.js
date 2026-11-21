(() => {
  const canvas = document.querySelector("[data-hero-particles]");
  const stage = canvas?.closest(".hero-stage");
  const portrait = stage?.querySelector(".portrait-plate");
  const video = portrait?.querySelector(".landing-video");
  const speech = stage?.querySelector(".round-speech");
  const choices = stage?.querySelector(".round-selector");
  const context = canvas?.getContext("2d");
  if (!context || !video || !choices) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 767px)");
  const laneCount = 6;
  const particles = Array.from({ length: 36 }, (_, index) => {
    const order = ((index * 17) % 37) / 37;
    const spread = ((index * 13) % 31) / 31;
    return {
      lane: index % laneCount,
      begin: 1.92 + 0.66 * order,
      duration: 3.55 + 0.31 * spread,
      size: 0.75 + 1.05 * spread,
      opacity: 0.42 + 0.42 * order,
      color: index % 4 === 0 ? "#e8a23a" : "#f4f2ed",
      trail: index % 3 === 0,
    };
  });
  const finishTime = Math.max(...particles.map(({ begin, duration }) => begin + duration));

  let tracks = [];
  let width = 0;
  let height = 0;
  let animationFrame = 0;
  let lastTime = -1;
  let painted = false;
  let visible = typeof IntersectionObserver === "undefined";

  const clamp = (value) => Math.max(0, Math.min(1, value));
  const mix = (start, end, progress) => start + (end - start) * progress;

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
    };
  }

  function uniformTrack(points) {
    const lengths = [0];
    for (let index = 1; index < points.length; index += 1) {
      lengths.push(lengths[index - 1] + Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y));
    }

    // The transfer is sampled by distance so changes in path curvature do not cause speed jumps.
    const total = lengths.at(-1);
    let next = 1;
    return Array.from({ length: 161 }, (_, index) => {
      const distance = (total * index) / 160;
      while (lengths[next] < distance && next < points.length - 1) next += 1;
      const ratio = (distance - lengths[next - 1]) / (lengths[next] - lengths[next - 1]);
      const from = points[next - 1];
      const to = points[next];
      return { x: mix(from.x, to.x, ratio), y: mix(from.y, to.y, ratio) };
    });
  }

  function makeTrack(plate, message, selector, lane) {
    const spread = lane / (laneCount - 1);
    const center = point(plate, 0.486, 0.331);
    const radiusX = plate.width * mix(0.252, 0.297, spread);
    const radiusY = plate.height * mix(0.265, 0.297, spread);
    const crown = { x: center.x, y: center.y - radiusY };

    // Both travel segments meet the orbit at the crown, where its tangent points right.
    // The loop goes outside the facial scan rather than crossing its eyes or mouth.
    const outgoing =
      message && !mobile.matches
        ? { x: mix(message.x + message.width, plate.x, 0.22), y: point(plate, 0, 0.24 + 0.16 * spread).y }
        : point(plate, 0.008 + spread * 0.02, 0.25 + 0.15 * spread);
    const railX = Math.min(width - 3 - 3 * spread, selector.x + selector.width + 3);
    const incoming = mobile.matches
      ? { x: railX, y: selector.y - 5 - 7 * spread }
      : { x: selector.x - 10 - 6 * spread, y: selector.y + selector.height * mix(0.19, 0.43, spread) };

    const points = [outgoing];
    const appendCurve = (start, first, second, end) => {
      for (let step = 1; step <= 24; step += 1) points.push(cubic(start, first, second, end, step / 24));
    };

    appendCurve(
      outgoing,
      { x: mix(outgoing.x, crown.x, 0.31), y: outgoing.y - plate.height * 0.081 },
      { x: crown.x - plate.width * 0.26, y: crown.y },
      crown
    );
    for (let step = 1; step <= 104; step += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * step) / 104;
      const vertical = Math.sin(angle);
      const below = Math.max(0, vertical);
      points.push({
        x: center.x + (radiusX + plate.width * 0.025 * below) * Math.cos(angle),
        y: center.y + radiusY * vertical + plate.height * 0.047 * below ** 2,
      });
    }
    if (mobile.matches) {
      // On phones, the contribution controls are below the portrait and title. Stay in the right gutter until the controls.
      const shoulder = { x: railX, y: point(plate, 0, 0.45 + 0.05 * spread).y };
      appendCurve(crown, { x: crown.x + plate.width * 0.3, y: crown.y }, { x: shoulder.x, y: shoulder.y - plate.height * 0.22 }, shoulder);
      appendCurve(
        shoulder,
        { x: shoulder.x, y: mix(shoulder.y, incoming.y, 0.3) },
        { x: incoming.x - 1.4 * spread, y: mix(shoulder.y, incoming.y, 0.76) },
        incoming
      );
    } else {
      appendCurve(
        crown,
        { x: crown.x + plate.width * 0.3, y: crown.y },
        { x: mix(crown.x, incoming.x, 0.91), y: incoming.y - plate.height * 0.07 },
        incoming
      );
    }
    return uniformTrack(points);
  }

  function sample(track, progress) {
    const distance = clamp(progress) * (track.length - 1);
    const index = Math.min(Math.floor(distance), track.length - 2);
    const ratio = distance - index;
    return { x: mix(track[index].x, track[index + 1].x, ratio), y: mix(track[index].y, track[index + 1].y, ratio) };
  }

  function clear() {
    if (!painted) return;
    context.clearRect(0, 0, width, height);
    painted = false;
  }

  function draw(time) {
    clear();
    if (!tracks.length || time < 1.92 || time >= finishTime) return;

    particles.forEach((particle) => {
      const elapsed = time - particle.begin;
      if (elapsed <= 0 || elapsed >= particle.duration) return;

      const travel = elapsed / particle.duration;
      const progress = mix(travel, ease(travel), 0.24);
      const track = tracks[particle.lane];
      const current = sample(track, progress);
      const alpha = particle.opacity * ease(elapsed / 0.28) * ease((particle.duration - elapsed) / 0.44);
      if (particle.trail && progress > 0.008) {
        const behind = sample(track, progress - 0.007);
        context.beginPath();
        context.moveTo(behind.x, behind.y);
        context.lineTo(current.x, current.y);
        context.strokeStyle = particle.color;
        context.lineWidth = 0.65;
        context.globalAlpha = alpha * 0.24;
        context.stroke();
      }
      context.beginPath();
      context.arc(current.x, current.y, particle.size * (mobile.matches ? 0.85 : 1), 0, Math.PI * 2);
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
    if (!plate || !selector) return;

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
    tracks = Array.from({ length: laneCount }, (_, lane) => makeTrack(plate, message, selector, lane));
    lastTime = -1;
    synchronize();
  }

  video.addEventListener("playing", synchronize);
  ["pause", "waiting", "ended", "emptied", "error"].forEach((event) => video.addEventListener(event, suspend));
  document.addEventListener("visibilitychange", synchronize);
  reducedMotion.addEventListener("change", synchronize);
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
