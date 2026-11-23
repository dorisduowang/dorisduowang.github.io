(() => {
  const canvas = document.querySelector("[data-day-portrait]");
  const plate = canvas?.closest(".portrait-plate");
  const video = plate?.querySelector(".landing-video");
  if (!canvas || !plate || !video) return;

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

    float ellipseMask(vec2 point, vec2 center, vec2 radius) {
      float distanceFromCenter = length((point - center) / radius);
      return 1.0 - smoothstep(0.91, 1.04, distanceFromCenter);
    }

    void main() {
      vec3 source = texture2D(portrait, uv).rgb;
      vec2 point = vec2(uv.x, 1.0 - uv.y);
      float lightness = dot(source, vec3(0.2126, 0.7152, 0.0722));

      // Preserve dark hair and facial detail while lifting the black studio field.
      float crown = ellipseMask(point, vec2(0.500, 0.300), vec2(0.185, 0.245));
      float lowerHair = ellipseMask(point, vec2(0.500, 0.445), vec2(0.218, 0.225));
      float hairAndFace = max(crown, lowerHair);
      float studioBlack = 1.0 - smoothstep(0.045, 0.195, lightness);
      vec3 result = mix(source, vec3(1.0), studioBlack * (1.0 - hairAndFace));

      // The moving source remains untouched. Only its dark garment is remapped
      // to a cool white fabric, with the source luminance retained as modelling.
      float vertical = smoothstep(0.500, 0.690, point.y);
      float halfWidth = mix(0.085, 0.355, vertical);
      float insideGarment = 1.0 - smoothstep(halfWidth - 0.018, halfWidth + 0.018, abs(point.x - 0.5));
      insideGarment *= smoothstep(0.485, 0.555, point.y);
      float darkFabric = 1.0 - smoothstep(0.17, 0.48, lightness);
      float fabricLight = clamp(0.815 + lightness * 1.05, 0.815, 0.965);
      vec3 whiteFabric = vec3(fabricLight * 0.985, fabricLight * 0.995, fabricLight + 0.012);
      result = mix(result, whiteFabric, insideGarment * darkFabric);

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
