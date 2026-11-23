(() => {
  const canvas = document.querySelector("[data-day-portrait]");
  const plate = canvas?.closest(".portrait-plate");
  const video = plate?.querySelector(".landing-video");
  if (!canvas || !plate || !video) return;

  // Reuse the original clip's measured pose. All colour work is confined to
  // this day canvas; neither the source video nor the night renderer is edited.
  let portraitPoseAt;
  import("./hero-portrait-pose.js?v=fd0d66e1")
    .then((module) => {
      portraitPoseAt = module.portraitPoseAt;
      synchronize();
    })
    .catch(() => {});

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });
  if (!gl) return;

  const vertexSource = `
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D portrait;
    uniform sampler2D features;
    uniform vec4 pose;

    void main() {
      vec3 source = texture2D(portrait, uv).rgb;
      vec2 point = vec2(uv.x, 1.0 - uv.y);
      float lightness = dot(source, vec3(0.2126, 0.7152, 0.0722));

      // Undo the measured head transform before reading the hand-traced feature
      // masks. Keep the face, pupils, lips and ears outside the hair colour pass.
      vec2 offset = (point - pose.xy) * vec2(1.078125, 1.0);
      float c = cos(pose.w);
      float s = sin(pose.w);
      vec2 resting = vec2(c * offset.x + s * offset.y, -s * offset.x + c * offset.y);
      resting = resting / pose.z / vec2(1.078125, 1.0) + vec2(0.532, 0.269);
      vec3 feature = texture2D(features, vec2(resting.x, 1.0 - resting.y)).rgb;
      float headArea = smoothstep(0.23, 0.28, resting.x) * (1.0 - smoothstep(0.73, 0.78, resting.x));
      headArea *= 1.0 - smoothstep(0.61, 0.67, resting.y);
      float hair = headArea * (1.0 - feature.r);
      float warmSkin = smoothstep(0.065, 0.16, source.r - source.b);
      hair *= 1.0 - warmSkin;
      // Below the neck, cool blue-black pixels belong to the top. Brown strand
      // pixels still receive platinum, including the locks over the shoulders.
      float fabric = smoothstep(0.51, 0.56, resting.y) * (1.0 - smoothstep(-0.018, 0.008, source.r - source.b));
      hair *= 1.0 - fabric;

      // Remove only the source's near-black studio field. The previous ellipse
      // retained black background beyond the hair. Here the alpha comes from
      // the actual pixels, with a short soft transition for fine edge strands.
      float signal = max(source.r, max(source.g, source.b));
      float coverage = smoothstep(0.008, 0.038, signal);
      coverage = max(coverage, feature.r);

      // Cool platinum with slightly ivory highlights. Original strand contrast
      // supplies the volume, so the tint moves with the photographed hair.
      float strand = pow(clamp(lightness * 3.8, 0.0, 1.0), 0.42);
      vec3 platinum = mix(vec3(0.43, 0.445, 0.44), vec3(0.985, 0.985, 0.952), strand);
      vec3 result = mix(source, platinum, hair);
      vec3 upperSkin = texture2D(portrait, uv + vec2(0.0, 0.016)).rgb;
      vec3 lowerSkin = texture2D(portrait, uv - vec2(0.0, 0.016)).rgb;
      float skinLight = dot((upperSkin + lowerSkin) * 0.5, vec3(0.2126, 0.7152, 0.0722));
      float browInk = smoothstep(0.025, 0.15, skinLight - lightness);
      float lashInk = smoothstep(0.025, 0.14, dot(upperSkin, vec3(0.2126, 0.7152, 0.0722)) - lightness);
      float fineHair = max(feature.g * browInk * 0.80, feature.b * lashInk * 0.74);
      vec3 finePlatinum = mix(vec3(0.56, 0.57, 0.51), vec3(0.90, 0.90, 0.81), sqrt(lightness));
      result = mix(result, finePlatinum, fineHair);
      result = mix(vec3(1.0), result, coverage);

      // The moving source remains untouched. Only its dark garment is remapped
      // to a cool white fabric, with the source luminance retained as modelling.
      float vertical = smoothstep(0.500, 0.690, point.y);
      float halfWidth = mix(0.085, 0.355, vertical);
      float insideGarment = 1.0 - smoothstep(halfWidth - 0.018, halfWidth + 0.018, abs(point.x - 0.5));
      insideGarment *= smoothstep(0.485, 0.555, point.y);
      float darkFabric = 1.0 - smoothstep(0.17, 0.48, lightness);
      float fabricLight = clamp(0.815 + lightness * 1.05, 0.815, 0.965);
      vec3 whiteFabric = vec3(fabricLight * 0.985, fabricLight * 0.995, fabricLight + 0.012);
      result = mix(result, whiteFabric, insideGarment * darkFabric * (1.0 - hair));

      gl_FragColor = vec4(result, 1.0);
    }
  `;

  function shader(type, source) {
    const item = gl.createShader(type);
    gl.shaderSource(item, source);
    gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
      gl.deleteShader(item);
      return null;
    }
    return item;
  }

  const vertex = shader(gl.VERTEX_SHADER, vertexSource);
  const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return;
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.useProgram(program);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(gl.getUniformLocation(program, "portrait"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "features"), 1);
  const poseUniform = gl.getUniformLocation(program, "pose");

  // Small vector masks separate skin, brows and lash rims. They are sampled in
  // the resting portrait's coordinates and follow its pose on every video frame.
  // R protects skin; G recolours eyebrow hairs; B recolours only thin lash rims.
  const featureCanvas = document.createElement("canvas");
  featureCanvas.width = 1104;
  featureCanvas.height = 1024;
  const featureContext = featureCanvas.getContext("2d");
  featureContext.fillStyle = "#000";
  featureContext.fillRect(0, 0, 1104, 1024);
  featureContext.filter = "blur(3px)";
  featureContext.fillStyle = "#f00";
  featureContext.fill(
    new Path2D(
      "M499 140 C459 150 424 168 407 211 C390 248 391 283 398 321 C404 353 400 398 425 438 C450 479 500 505 533 503 C578 500 625 470 647 427 C666 390 668 348 674 311 C680 273 660 225 642 198 C616 165 562 139 530 136 C519 135 507 137 499 140Z"
    )
  );
  featureContext.fill(new Path2D("M462 475 Q538 527 644 469 L649 553 Q557 584 465 549Z"));
  featureContext.globalCompositeOperation = "lighter";
  featureContext.lineCap = "round";
  featureContext.filter = "blur(2px)";
  featureContext.strokeStyle = "#0f0";
  featureContext.lineWidth = 20;
  featureContext.stroke(new Path2D("M419 264 Q448 239 486 252 M550 239 Q589 221 626 238"));
  featureContext.filter = "blur(1px)";
  featureContext.strokeStyle = "#00f";
  featureContext.lineWidth = 4.2;
  featureContext.stroke(new Path2D("M431 302 Q460 276 491 295 M562 283 Q590 259 625 279"));

  const featureTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, featureTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, featureCanvas);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  let visible = typeof IntersectionObserver === "undefined";
  let frame = 0;
  let videoFrame = 0;
  let sourceReady = false;
  let contextLost = false;

  function isDay() {
    return document.documentElement.dataset.theme === "day";
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const density = Math.min(window.devicePixelRatio || 1, 1.75, 960 / bounds.width);
    const width = Math.max(1, Math.round(bounds.width * density));
    const height = Math.max(1, Math.round(bounds.height * density));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }

  function render(source) {
    if (contextLost || !source) return;
    resize();
    try {
      const pose = portraitPoseAt?.(source === video ? video.currentTime : 0) ?? { x: 0.532, y: 0.269, scale: 1, roll: 0 };
      gl.uniform4f(poseUniform, pose.x, pose.y, pose.scale, pose.roll);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      sourceReady = true;
      plate.dataset.dayReady = "true";
    } catch {
      sourceReady = false;
    }
  }

  function requestFrame() {
    if (!isDay() || !visible || document.hidden || video.paused || video.readyState < video.HAVE_CURRENT_DATA) return;
    if (typeof video.requestVideoFrameCallback === "function") {
      videoFrame = video.requestVideoFrameCallback(() => {
        videoFrame = 0;
        render(video);
        requestFrame();
      });
    } else if (!frame) {
      frame = requestAnimationFrame(function tick() {
        render(video);
        frame = isDay() && visible && !video.paused ? requestAnimationFrame(tick) : 0;
      });
    }
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    if (videoFrame && typeof video.cancelVideoFrameCallback === "function") video.cancelVideoFrameCallback(videoFrame);
    videoFrame = 0;
  }

  function synchronize() {
    stop();
    if (!isDay()) return;
    if (video.readyState >= video.HAVE_CURRENT_DATA) render(video);
    requestFrame();
  }

  const poster = new Image();
  poster.addEventListener("load", () => {
    if (!sourceReady || isDay()) render(poster);
    synchronize();
  });
  poster.src = video.poster;

  video.addEventListener("loadeddata", synchronize);
  video.addEventListener("playing", synchronize);
  video.addEventListener("seeked", () => {
    if (isDay()) render(video);
  });
  ["pause", "emptied", "error"].forEach((event) => video.addEventListener(event, stop));
  window.addEventListener("themechange", synchronize);
  window.addEventListener(
    "resize",
    () => {
      if (isDay()) render(video.readyState >= video.HAVE_CURRENT_DATA ? video : poster);
    },
    { passive: true }
  );
  document.addEventListener("visibilitychange", synchronize);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
    stop();
    delete plate.dataset.dayReady;
  });

  if (typeof IntersectionObserver !== "undefined") {
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio > 0;
        synchronize();
      },
      { threshold: [0, 0.02] }
    );
    observer.observe(plate);
  }

  synchronize();
})();
