(() => {
  const canvas = document.querySelector("[data-day-portrait]");
  const plate = canvas?.closest(".portrait-plate");
  const video = plate?.querySelector(".landing-video");
  const stage = plate?.closest(".hero-stage");
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
    uniform sampler2D hairTexture;
    uniform float hairTextureReady;
    uniform vec4 pose;
    uniform vec2 texel;

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
      vec4 feature = texture2D(features, vec2(resting.x, 1.0 - resting.y));

      // The clip carries cream-white cracks across the face for the night
      // sequence. On fair day skin they read as scratches. Inside the face
      // (eyes excluded) a pixel much lighter than the skin around it takes
      // the average of the neighbouring pixels that are not cracks themselves.
      vec2 inner = (resting - vec2(0.476, 0.32)) / vec2(0.108, 0.18);
      float faceInterior = feature.r * (1.0 - smoothstep(0.85, 1.0, length(inner)));
      float eyes = 1.0 - smoothstep(0.8, 1.2, length((resting - vec2(0.418, 0.289)) / vec2(0.044, 0.024)));
      eyes = max(eyes, 1.0 - smoothstep(0.8, 1.2, length((resting - vec2(0.537, 0.272)) / vec2(0.044, 0.024))));
      vec4 around = vec4(0.0);
      for (int i = 0; i < 6; i++) {
        float angle = 1.0472 * float(i) + 0.3;
        vec3 tap = texture2D(portrait, uv + texel * 10.0 * vec2(cos(angle), sin(angle))).rgb;
        float tapLight = dot(tap, vec3(0.2126, 0.7152, 0.0722));
        around += vec4(tap, 1.0) * (1.02 - smoothstep(0.62, 0.72, tapLight));
      }
      vec3 skinAround = around.rgb / around.a;
      float crack = smoothstep(0.02, 0.06, lightness - dot(skinAround, vec3(0.2126, 0.7152, 0.0722)));
      crack *= smoothstep(0.48, 0.6, lightness) * faceInterior * (1.0 - eyes);
      source = mix(source, skinAround, crack);
      lightness = dot(source, vec3(0.2126, 0.7152, 0.0722));
      float headArea = smoothstep(0.2, 0.25, resting.x) * (1.0 - smoothstep(0.76, 0.81, resting.x));
      headArea *= 1.0 - smoothstep(0.67, 0.73, resting.y);
      float hair = headArea * (1.0 - feature.r);
      float warmSkin = smoothstep(0.065, 0.16, source.r - source.b);
      hair *= 1.0 - warmSkin;
      // Below the neck, cool blue-black pixels belong to the top. Brown strand
      // pixels still receive platinum, including the locks over the shoulders.
      float fabric = smoothstep(0.51, 0.56, resting.y) * (1.0 - smoothstep(-0.018, 0.008, source.r - source.b));
      hair *= 1.0 - fabric;
      // A registered photo edit supplies the dye's strand texture. Below the
      // chin it also tells loose locks apart from neutral-dark fabric.
      vec3 dyedHair = texture2D(hairTexture, vec2(resting.x, 1.0 - resting.y)).rgb;
      float dyedLight = dot(dyedHair, vec3(0.2126, 0.7152, 0.0722));
      float dyed = smoothstep(0.035, 0.12, dyedLight);
      hair *= mix(1.0, dyed, hairTextureReady * smoothstep(0.5, 0.56, resting.y));
      // Mid-loop the clip draws thin light strokes in the black field around
      // the head. Only pixels inside the traced silhouette or the dye's own
      // soft hair edge count as hair, so those strokes are not dyed.
      float headShape = max(feature.a, dyed);
      hair *= mix(1.0, headShape, hairTextureReady);
      // The skin mask also covers dark roots along the hairline and the hair
      // tucked behind the jaw. Outside an inner ellipse that holds the eyes,
      // brows, nostrils and mouth, return those pixels to the hair pass so no
      // black band frames the face.
      vec2 faceOffset = (resting - vec2(0.476, 0.325)) / vec2(0.112, 0.125);
      float aroundFace = smoothstep(0.85, 1.0, length(faceOffset));
      aroundFace *= mix(1.0, smoothstep(0.07, 0.1, abs(resting.x - 0.476)), smoothstep(0.4, 0.44, resting.y));
      float tucked = headArea * feature.r * aroundFace * (1.0 - warmSkin) * (1.0 - smoothstep(0.1, 0.2, lightness));
      float dyedHere = hairTextureReady * smoothstep(0.12, 0.3, dyedLight);
      hair = max(hair, tucked * dyedHere);
      // Along the forehead and temples the roots blend with skin and read as
      // a brown band. Lift that band too, above the ears only.
      float roots = headArea * aroundFace * (1.0 - smoothstep(0.26, 0.31, resting.y)) * (1.0 - smoothstep(0.16, 0.34, lightness));
      hair = max(hair, roots * dyedHere * 0.85);

      // A small blur separates broad volume from fine strands and gives the
      // matte a soft edge.
      vec3 softSource = source * 0.28;
      softSource += texture2D(portrait, uv + texel * vec2(2.0, 0.0)).rgb * 0.12;
      softSource += texture2D(portrait, uv - texel * vec2(2.0, 0.0)).rgb * 0.12;
      softSource += texture2D(portrait, uv + texel * vec2(0.0, 2.0)).rgb * 0.12;
      softSource += texture2D(portrait, uv - texel * vec2(0.0, 2.0)).rgb * 0.12;
      softSource += texture2D(portrait, uv + texel * vec2(4.0, 1.0)).rgb * 0.12;
      softSource += texture2D(portrait, uv - texel * vec2(4.0, 1.0)).rgb * 0.12;
      float softLight = dot(softSource, vec3(0.2126, 0.7152, 0.0722));
      float softSignal = max(softSource.r, max(softSource.g, softSource.b));

      // The studio field is pure black, so the alpha comes from the pixels
      // themselves. Blending in the blurred signal feathers the outer strands.
      float signal = max(source.r, max(source.g, source.b));
      float coverage = smoothstep(0.006, 0.036, mix(signal, softSignal, 0.55));
      coverage = max(coverage, feature.r);
      coverage = max(coverage, feature.a * hair * smoothstep(0.003, 0.012, signal));
      // Around the head, anything outside that shape and not skin is one of
      // those strokes; drop it so it disappears into the page.
      float aboveShoulders = 1.0 - smoothstep(0.56, 0.62, resting.y);
      coverage *= mix(1.0, max(headShape, max(feature.r, warmSkin)), hairTextureReady * aboveShoulders);

      // White-gold hair. Every hair pixel is lifted into a light ivory range,
      // including the dark rim where strands blend into the black field, so
      // the edge fades to the page instead of leaving a dark outline.
      float volume = pow(clamp(softLight * 2.8, 0.0, 1.0), 0.43);
      float strand = clamp((lightness - softLight) * 1.3, -0.06, 0.05);
      vec3 platinum = mix(vec3(0.76, 0.715, 0.625), vec3(0.975, 0.955, 0.895), volume);
      // The dye texture's luminance ordering is kept; its gold is reduced to
      // a pale tint.
      float tone = smoothstep(0.1, 0.92, dyedLight);
      vec3 tint = mix(vec3(1.0, 0.95, 0.85), vec3(1.0, 0.985, 0.935), tone);
      vec3 naturalPlatinum = mix(0.6, 0.99, tone) * tint + (dyedHair - vec3(dyedLight)) * 0.22;
      platinum = mix(platinum, naturalPlatinum, hairTextureReady * dyed);
      platinum = min(platinum + strand, vec3(0.99));
      vec3 result = mix(source, platinum, hair);

      // Brows and lash rims take the same white-gold, mixed with the skin
      // beside them so they read as fine pale hairs rather than paint.
      vec3 upperSkin = texture2D(portrait, uv + vec2(0.0, 0.016)).rgb;
      vec3 lowerSkin = texture2D(portrait, uv - vec2(0.0, 0.016)).rgb;
      vec3 skinBeside = (upperSkin + lowerSkin) * 0.5;
      float skinLight = dot(skinBeside, vec3(0.2126, 0.7152, 0.0722));
      float browInk = smoothstep(0.06, 0.19, skinLight - lightness);
      float lashInk = smoothstep(0.07, 0.22, dot(upperSkin, vec3(0.2126, 0.7152, 0.0722)) - lightness);
      vec3 browGold = mix(skinBeside, vec3(0.9, 0.84, 0.72), 0.45) + (lightness - skinLight) * 0.3;
      result = mix(result, browGold, feature.g * browInk * 0.76);
      vec3 lashGold = mix(upperSkin, vec3(0.88, 0.83, 0.73), 0.6) + (lightness - skinLight) * 0.12;
      result = mix(result, lashGold, feature.b * lashInk * 0.5);

      // Skin is one step fairer: a gentle lift that is stronger in blue, which
      // also takes some orange out, with texture and shading left in place.
      vec3 fair = vec3(1.0) - pow(vec3(1.0) - clamp(result, 0.0, 1.0), vec3(1.34, 1.44, 1.58));
      fair = mix(vec3(dot(fair, vec3(0.2126, 0.7152, 0.0722))), fair, 0.92);
      result = mix(result, fair, warmSkin * (1.0 - hair));
      result = mix(vec3(1.0), result, coverage);

      // The moving source remains untouched. Only its dark garment is remapped
      // to a white fabric, with the source luminance retained as modelling.
      // The garment's own signal gates the remap, so the black field beside
      // the shoulders stays clear.
      float vertical = smoothstep(0.500, 0.690, point.y);
      float halfWidth = mix(0.085, 0.355, vertical);
      float insideGarment = 1.0 - smoothstep(halfWidth - 0.018, halfWidth + 0.018, abs(point.x - 0.5));
      insideGarment *= smoothstep(0.485, 0.555, point.y);
      float darkFabric = 1.0 - smoothstep(0.17, 0.48, lightness);
      float fabricLight = clamp(0.875 + lightness * 0.9, 0.875, 0.975);
      vec3 whiteFabric = vec3(fabricLight * 0.995, fabricLight * 0.992, fabricLight * 0.98);
      // Below the chin, any remaining neutral near-black (collar shadow, the
      // gap behind the neck, a stray lock outside the dye) joins the fabric.
      float belowChin = smoothstep(0.46, 0.52, resting.y) * (1.0 - smoothstep(0.1, 0.22, lightness));
      float garment = max(insideGarment * darkFabric, belowChin) * (1.0 - warmSkin) * (1.0 - hair);
      garment *= smoothstep(0.0015, 0.008, softSignal);
      result = mix(result, whiteFabric, garment);

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
  gl.uniform1i(gl.getUniformLocation(program, "hairTexture"), 2);
  const hairReadyUniform = gl.getUniformLocation(program, "hairTextureReady");
  const poseUniform = gl.getUniformLocation(program, "pose");
  const texelUniform = gl.getUniformLocation(program, "texel");

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
  featureContext.lineWidth = 13;
  featureContext.stroke(new Path2D("M419 264 Q448 239 486 252 M550 239 Q589 221 626 238"));
  featureContext.filter = "blur(1px)";
  featureContext.strokeStyle = "#00f";
  featureContext.lineWidth = 2.4;
  featureContext.stroke(new Path2D("M431 302 Q460 276 491 295 M562 283 Q590 259 625 279"));

  // An inset silhouette keeps the interior locks opaque. The outermost strands
  // still use the photographed edge, so no ellipse-shaped background returns.
  featureContext.globalCompositeOperation = "destination-in";
  featureContext.filter = "blur(5px)";
  featureContext.fillStyle = "#fff";
  featureContext.fill(
    new Path2D(
      "M373 307 C357 233 374 159 433 119 C477 87 508 85 543 91 C591 78 659 119 680 182 C694 223 683 268 688 314 C685 397 699 497 723 552 L739 591 Q712 606 680 587 L651 523 L638 471 Q541 529 453 477 L427 539 L449 600 Q421 643 359 642 L337 607 L339 567 C364 493 364 394 373 307Z"
    )
  );

  const featureTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, featureTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, featureCanvas);

  const hairTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, hairTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

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
      gl.uniform2f(texelUniform, 1 / (source.videoWidth || source.naturalWidth || 1104), 1 / (source.videoHeight || source.naturalHeight || 1024));
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
    // In 3D mode the shared media-clock event draws us immediately before the
    // crystal's refraction pass, which can then sample the white-day portrait.
    if (stage?.dataset.crystal === "3d") return;
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

  let hairImage;
  function loadHairTexture() {
    if (hairImage || !isDay()) return;
    hairImage = new Image();
    hairImage.addEventListener("load", () => {
      if (contextLost) return;
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, hairTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, hairImage);
      gl.uniform1f(hairReadyUniform, 1);
      if (isDay()) render(video.readyState >= video.HAVE_CURRENT_DATA ? video : poster);
    });
    hairImage.src = "/assets/img/portfolio/doris-day-hair-texture-v3.webp";
  }
  window.addEventListener("themechange", loadHairTexture);
  loadHairTexture();

  video.addEventListener("loadeddata", synchronize);
  video.addEventListener("playing", synchronize);
  video.addEventListener("seeked", () => {
    if (isDay()) render(video);
  });
  stage?.addEventListener("hero-crystal-frame", () => {
    if (isDay() && video.readyState >= video.HAVE_CURRENT_DATA) render(video);
  });
  stage?.addEventListener("hero-crystal-mode", synchronize);
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
