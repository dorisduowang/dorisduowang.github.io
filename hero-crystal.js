import * as THREE from "./assets/third-party/three-0.170.0/three.module.min.js";

export const heroCrystalConfig = {
  // The timeline controller may opt into a locally supplied pre-rendered alpha clip.
  useOverlayVideo: false,
  // All values are seconds on the homepage media clock.
  timeline: { duration: 26, idleEnd: 3, orbitEnd: 10, growthEnd: 16, holdEnd: 20, transferEnd: 23 },
  // x/y are normalized from the reference portrait's top-left. z, direction and size are in scene units.
  anchors: [
    { x: 0.532, y: 0.269, z: 0.137, direction: [0.7, 0.14, 0.32], size: 0.72, delay: 0, iris: true },
    { x: 0.546, y: 0.257, z: 0.122, direction: [0.56, 0.75, 0.28], size: 0.49, delay: 0.24 },
    { x: 0.558, y: 0.266, z: 0.118, direction: [0.96, 0.31, 0.29], size: 0.62, delay: 0.47 },
    { x: 0.545, y: 0.283, z: 0.126, direction: [0.69, -0.4, 0.36], size: 0.59, delay: 0.72 },
    { x: 0.575, y: 0.286, z: 0.104, direction: [0.95, -0.41, 0.27], size: 0.44, delay: 1.1 },
  ],
  // The invisible, depth-writing ellipsoid blocks rear orbit points. Its radii use scene units, roll is radians.
  occluder: { x: 0.485, y: 0.323, z: -0.17, scale: [0.365, 0.478, 0.205], roll: 0.045 },
  // The folded petals are concentric but staggered so the visible lips curl around one bud.
  rose: {
    center: { x: 0.56, y: 0.269, z: 0.113 },
    height: 0.87,
    tiers: [
      {
        count: 6,
        radius: 0.136,
        root: 0.033,
        rise: 0.039,
        depth: 0,
        phase: 0.06,
        turn: 0.36,
        width: 0.68,
        rounding: 0.32,
        birth: 2.05,
        dissolve: 0.13,
      },
      {
        count: 5,
        radius: 0.108,
        root: 0.022,
        rise: 0.038,
        depth: 0.025,
        phase: 0.66,
        turn: 0.63,
        width: 0.93,
        rounding: 0.27,
        birth: 1.41,
        dissolve: 0.39,
      },
      {
        count: 4,
        radius: 0.081,
        root: 0.014,
        rise: 0.04,
        depth: 0.045,
        phase: 1.17,
        turn: 0.81,
        width: 1.16,
        rounding: 0.23,
        birth: 0.72,
        dissolve: 0.76,
      },
      {
        count: 3,
        radius: 0.049,
        root: 0.0004,
        rise: 0.05,
        depth: 0.062,
        phase: 1.45,
        turn: 1.32,
        width: 1.43,
        rounding: 0.18,
        birth: 0.04,
        dissolve: 1.1,
      },
    ],
  },
  // A seed fixes the exact petal folds and spark trajectories on every loop.
  density: { seed: 22721, sparks: 48, maxOrbitPoints: 420 },
  // The glass folds transmit the live portrait between the bright chrome lips.
  material: {
    transmission: 1,
    ior: 1.5,
    roughness: 0.053,
    thickness: [0.42, 0.74, 1.14],
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 0.19,
    iridescenceThicknessRange: [110, 315],
    attenuationDistance: 0.83,
    dispersion: 0.027,
    envMapIntensity: 1.16,
  },
  chrome: { color: "#e8ecf2", roughness: 0.061, anisotropy: 0.68, iridescence: 0.21 },
  // Pale neutral glass, cool attenuation through thick sections, and two restrained spark colors.
  colors: { glass: "#f4fbff", attenuation: "#d3edf5", gleam: "#eafaff", coolGleam: "#a8d9f1" },
  // Device pixel ratio and pixel budget cap the cost of the transmission pass on large or dense displays.
  render: { maxDpr: 1.75, maxPixels: 720_000 },
};

export const crystalCentroid = { x: 0.532, y: 0.269 };

const aspect = 1104 / 1024;
const studioKey = new THREE.Vector3(2.7, 3.5, 3.6);
const clamp = (value) => Math.max(0, Math.min(1, value));
const mix = (a, b, progress) => a + (b - a) * progress;
const smooth = (value) => {
  const u = clamp(value);
  return u * u * (3 - 2 * u);
};

function makeReflectionStudio(renderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color().setRGB(0.072, 0.082, 0.105);
  const geometry = new THREE.PlaneGeometry(1, 1);
  // Put the narrow key above and to the right, the rim behind to the left, and a lower-output fill opposite it.
  const fixtures = [
    { position: studioKey, width: 0.94, height: 4.8, roll: -0.46, color: "#f5f8ff", power: 8.7 },
    { position: new THREE.Vector3(-3.9, 1.8, -1.8), width: 1.6, height: 4.3, roll: 0.21, color: "#ffffff", power: 6.8 },
    { position: new THREE.Vector3(-1.9, 0.24, 5), width: 2.7, height: 3.8, roll: -0.13, color: "#eaf3ff", power: 2.65 },
  ];
  for (const fixture of fixtures) {
    const softbox = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        toneMapped: false,
        uniforms: { radiance: { value: new THREE.Color(fixture.color).multiplyScalar(fixture.power) } },
        vertexShader: `
          varying vec2 panelUv;
          void main() {
            panelUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 radiance;
          varying vec2 panelUv;
          void main() {
            vec2 border = abs(panelUv * 2.0 - 1.0);
            vec2 falloff = 1.0 - smoothstep(vec2(0.74, 0.87), vec2(1.0), border);
            gl_FragColor = vec4(radiance * falloff.x * falloff.y, 1.0);
          }
        `,
      })
    );
    softbox.position.copy(fixture.position);
    softbox.scale.set(fixture.width, fixture.height, 1);
    softbox.lookAt(0, 0, 0);
    softbox.rotateZ(fixture.roll);
    room.add(softbox);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  const reflections = generator.fromScene(room, 0.012);
  generator.dispose();
  geometry.dispose();
  for (const softbox of room.children) softbox.material.dispose();
  return reflections;
}

function point(x, y, z = 0) {
  return new THREE.Vector3((x - 0.5) * 2 * aspect, (0.5 - y) * 2, z);
}

function portraitPose(pose) {
  return {
    x: Number.isFinite(pose?.x) ? pose.x : crystalCentroid.x,
    y: Number.isFinite(pose?.y) ? pose.y : crystalCentroid.y,
    scale: Number.isFinite(pose?.scale) ? Math.max(0.2, pose.scale) : 1,
    roll: Number.isFinite(pose?.roll) ? pose.roll : 0,
    yaw: Number.isFinite(pose?.yaw) ? pose.yaw : 0,
  };
}

// Apply the same eye-centered rotation used by the crystal group. Positive roll follows the screen clock.
export function placeOnPortrait(reference, pose) {
  const { x, y, scale, roll, yaw } = portraitPose(pose);
  const horizontal = (reference.x - crystalCentroid.x) * 2 * aspect;
  const vertical = (reference.y - crystalCentroid.y) * 2;
  const depth = reference.z ?? 0;
  const tilted = horizontal * Math.cos(yaw) + depth * Math.sin(yaw);
  return {
    x: x + (scale * (tilted * Math.cos(roll) - vertical * Math.sin(roll))) / (2 * aspect),
    y: y + (scale * (tilted * Math.sin(roll) + vertical * Math.cos(roll))) / 2,
    z: scale * (depth * Math.cos(yaw) - horizontal * Math.sin(yaw)),
  };
}

function randomGenerator(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function makePetalGeometry(tier, angle, finish) {
  const rows = 17;
  const columns = 15;
  const stride = columns + 1;
  const surfaceSize = (rows + 1) * stride;
  const positions = [];
  const uvs = [];
  const metal = [];
  const triangles = [];
  const { height } = heroCrystalConfig.rose;
  const fold = finish.fold;
  const lip = new THREE.Vector3();

  for (const side of [1, -1]) {
    for (let row = 0; row <= rows; row += 1) {
      const along = row / rows;
      const opening = Math.sin(Math.PI * along * 0.75) ** 0.82;
      const turn = tier.turn * along * (1.18 - 0.18 * along);
      for (let column = 0; column <= columns; column += 1) {
        const across = (2 * column) / columns - 1;
        const spread = tier.width * (0.2 + 0.8 * opening);
        const theta = angle + turn + across * spread;
        // A shallow notch and asymmetric lobe break up the otherwise circular outline.
        const lobe = 1 - tier.rounding * across ** 2 + 0.048 * Math.sin(across * 4.5 + fold);
        const radius = mix(tier.root, tier.radius, along * mix(1, lobe, along));
        const curl = smooth((along - 0.62) / 0.38);
        const twist = along * (0.019 * across + 0.01 * Math.sin(across * 4 + fold));
        const cup = tier.rise * (0.84 * along + 0.24 * Math.sin(along * Math.PI));
        const foldDepth = (tier.rise * 0.45 + 0.008 * across) * curl;
        const bulk = (0.0026 + 0.002 * opening) * side;
        const x = radius * Math.cos(theta);
        const y = height * radius * Math.sin(theta);
        const z = tier.depth + cup - foldDepth + twist + 0.015 * Math.cos(theta) * along + bulk;
        positions.push(x, y, z);
        uvs.push(along, column / columns);
        metal.push(clamp(finish.body + finish.edge * smooth((along - 0.57) / 0.39) + 0.11 * across ** 4));
        if (side > 0 && row === rows && column === Math.floor(columns * 0.48)) lip.set(x, y, z);
      }
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * stride + column;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      triangles.push(a, c, b, b, c, d, a + surfaceSize, b + surfaceSize, c + surfaceSize, b + surfaceSize, d + surfaceSize, c + surfaceSize);
    }
  }
  // Close each thin shell along its lip and its tucked root.
  const edges = [
    Array.from({ length: columns + 1 }, (_, column) => column),
    Array.from({ length: rows + 1 }, (_, row) => row * stride + columns),
    Array.from({ length: columns + 1 }, (_, column) => rows * stride + columns - column),
    Array.from({ length: rows + 1 }, (_, row) => (rows - row) * stride),
  ];
  for (const edge of edges) {
    for (let index = 1; index < edge.length; index += 1) {
      const start = edge[index - 1];
      const end = edge[index];
      triangles.push(start, end, start + surfaceSize, end, end + surfaceSize, start + surfaceSize);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("petalMetal", new THREE.Float32BufferAttribute(metal, 1));
  geometry.setIndex(triangles);
  geometry.computeVertexNormals();
  return { geometry, lip };
}

function makeGlass(thickness) {
  const { thickness: thicknessOptions, ...material } = heroCrystalConfig.material;
  return new THREE.MeshPhysicalMaterial({
    ...material,
    thickness: thicknessOptions[thickness],
    roughness: material.roughness * 0.67,
    color: heroCrystalConfig.colors.glass,
    attenuationColor: heroCrystalConfig.colors.attenuation,
  });
}

function addChromeHighlights(shader, strength) {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <opaque_fragment>",
    `
    float brightness = max(outgoingLight.r, max(outgoingLight.g, outgoingLight.b));
    float glint = smoothstep(2.4, 6.3, brightness) * (${strength});
    float edge = pow(1.0 - saturate(dot(normal, geometryViewDir)), 2.6);
    outgoingLight += glint * (vec3(0.07) + edge * vec3(0.08, -0.035, 0.10));
    #include <opaque_fragment>
    `
  );
}

function makePetalMaterial() {
  const blend = makeGlass(0);
  const { chrome, colors } = heroCrystalConfig;
  blend.color.set(chrome.color);
  blend.metalness = 1;
  blend.clearcoatRoughness = 0.02;
  blend.anisotropy = chrome.anisotropy;
  blend.iridescence = chrome.iridescence;
  blend.iridescenceThicknessRange = [155, 245];
  blend.envMapIntensity = 1.44;
  blend.onBeforeCompile = (shader) => {
    shader.uniforms.glassTint = { value: new THREE.Color(colors.glass) };
    shader.vertexShader = `
      attribute float petalMetal;
      varying float vPetalMetal;
      ${shader.vertexShader}
    `.replace("#include <uv_vertex>", "#include <uv_vertex>\nvPetalMetal = petalMetal;");
    shader.fragmentShader = `
      uniform vec3 glassTint;
      varying float vPetalMetal;
      ${shader.fragmentShader}
    `
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
        float chromeCover = clamp(vPetalMetal, 0.0, 1.0);
        metalnessFactor *= chromeCover;
        roughnessFactor = mix(roughnessFactor, ${chrome.roughness.toFixed(3)}, chromeCover);
        diffuseColor.rgb = mix(glassTint, diffuseColor.rgb, chromeCover);`
      )
      .replace(
        "#include <lights_physical_fragment>",
        `#include <lights_physical_fragment>
        material.anisotropy *= chromeCover;
        material.alphaT = mix(pow2(material.roughness), 1.0, pow2(material.anisotropy));
        float grazing = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
        material.iridescence *= mix(0.05, 1.0, smoothstep(0.27, 0.95, grazing));`
      )
      .replace(
        "#include <transmission_fragment>",
        THREE.ShaderChunk.transmission_fragment
          .replace("material.transmission = transmission;", "material.transmission = transmission * (1.0 - chromeCover);")
          .replace("material.dispersion, material.ior", "material.dispersion * (1.0 - chromeCover), material.ior")
      );
    addChromeHighlights(shader, "chromeCover");
  };
  return blend;
}

function makeRose(random, group) {
  const { center, tiers } = heroCrystalConfig.rose;
  const origin = point(center.x, center.y, center.z);
  const material = makePetalMaterial();
  const outerLengths = [1.03, 0.91, 1.09, 0.98, 1.02, 0.88];
  const petals = tiers.flatMap((tier, layer) =>
    Array.from({ length: tier.count }, (_, index) => {
      const angle = tier.phase + (index * Math.PI * 2) / tier.count + mix(-0.12, 0.12, random());
      const shape = {
        ...tier,
        radius: tier.radius * (layer === 0 ? outerLengths[index % outerLengths.length] : mix(0.86, 1.09, random())),
        width: tier.width * mix(0.91, 1.11, random()),
        rise: tier.rise * mix(0.83, 1.17, random()),
      };
      const finish = {
        fold: random() * Math.PI * 2,
        body: mix(index % 2 ? 0.06 : 0.44, index % 2 ? 0.19 : 0.71, random()),
        edge: layer === tiers.length - 1 ? 0.48 : mix(0.33, 0.62, random()),
      };
      const { geometry, lip } = makePetalGeometry(shape, angle, finish);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(origin);
      group.add(mesh);
      return {
        mesh,
        lip,
        birth: tier.birth + index * 0.12,
        grow: mix(2.06, 2.95, random()),
        dissolve: tier.dissolve + mix(0, 0.22, random()),
        turn: mix(-0.21, -0.09, random()),
      };
    })
  );
  return { origin, petals };
}

function makePoints() {
  const { maxOrbitPoints, sparks } = heroCrystalConfig.density;
  const count = maxOrbitPoints + sparks + 3;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const opacity = new Float32Array(count);
  const geometry = new THREE.BufferGeometry();
  const attributes = [
    ["position", positions, 3],
    ["spriteColor", colors, 3],
    ["spriteSize", sizes, 1],
    ["spriteOpacity", opacity, 1],
  ];
  for (const [name, array, size] of attributes) {
    geometry.setAttribute(name, new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage));
  }
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    uniforms: { pixelRatio: { value: 1 } },
    vertexShader: `
      uniform float pixelRatio;
      attribute vec3 spriteColor;
      attribute float spriteSize;
      attribute float spriteOpacity;
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        vColor = spriteColor;
        vOpacity = spriteOpacity;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = max(1.0, spriteSize * 2.0 * pixelRatio);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        float radius = length(gl_PointCoord - vec2(0.5)) * 2.0;
        float core = 1.0 - smoothstep(0.07, 0.80, radius);
        float halo = 1.0 - smoothstep(0.38, 1.0, radius);
        gl_FragColor = vec4(vColor, vOpacity * (0.81 * core + 0.19 * halo));
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Points(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  const palette = new Map();
  let index = 0;
  return {
    mesh,
    setDensity(density) {
      material.uniforms.pixelRatio.value = density;
    },
    clear() {
      index = 0;
    },
    add(x, y, z, size, alpha, color) {
      if (index >= count || alpha <= 0.002) return;
      if (!palette.has(color)) palette.set(color, new THREE.Color(color));
      const tint = palette.get(color);
      positions.set([x, y, z], index * 3);
      colors.set([tint.r, tint.g, tint.b], index * 3);
      sizes[index] = size;
      opacity[index] = alpha;
      index += 1;
    },
    commit() {
      geometry.setDrawRange(0, index);
      mesh.visible = index > 0;
      for (const [name] of attributes) geometry.getAttribute(name).needsUpdate = true;
    },
  };
}

function pieceScale(time, piece) {
  const { orbitEnd, growthEnd, transferEnd, duration } = heroCrystalConfig.timeline;
  const local = 1 - (1 - clamp((time - orbitEnd - piece.birth) / piece.grow)) ** 2.65;
  const spread = mix(0.48, 1, smooth((time - orbitEnd) / (growthEnd - orbitEnd)));
  const growth = local * spread;
  if (time < transferEnd) return growth;
  const decayTime = transferEnd + piece.dissolve;
  return growth * (1 - smooth((time - decayTime) / Math.max(0.35, duration - decayTime)));
}

export function createHeroCrystal(canvas, plate) {
  if (!canvas || !plate || window.matchMedia("(max-width: 767px)").matches) return null;

  const video = plate.querySelector(".landing-video");

  let renderer;
  try {
    const context = canvas.getContext("webgl2", { alpha: true, antialias: true, powerPreference: "high-performance" });
    if (!context) return null;
    renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  } catch {
    return null;
  }

  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.27;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 12);
  camera.position.set(0, 0, 5);
  const studio = makeReflectionStudio(renderer);
  scene.environment = studio.texture;

  const backdropMaterial = new THREE.MeshBasicMaterial({ toneMapped: false, depthWrite: false });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(aspect * 2, 2), backdropMaterial);
  backdrop.position.z = -1.22;
  backdrop.renderOrder = -10;
  backdrop.visible = false;
  // The internal refraction buffer needs the video. The screen pass is transparent over the same DOM video.
  backdrop.onBeforeRender = (activeRenderer) => {
    backdropMaterial.colorWrite = activeRenderer.getRenderTarget() !== null;
  };
  scene.add(backdrop);

  const attachment = new THREE.Group();
  const eye = point(crystalCentroid.x, crystalCentroid.y);
  const pivot = new THREE.Vector3();
  const sparkWorld = new THREE.Vector3();
  scene.add(attachment);

  const proxy = heroCrystalConfig.occluder;
  const occluder = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ colorWrite: false }));
  occluder.position.copy(point(proxy.x, proxy.y, proxy.z));
  occluder.scale.set(...proxy.scale);
  occluder.rotation.z = proxy.roll;
  occluder.renderOrder = -8;
  attachment.add(occluder);

  const lights = [new THREE.DirectionalLight(0xf7faff, 2.1), new THREE.DirectionalLight(0xdbeaff, 1.35)];
  lights[0].position.copy(studioKey);
  lights[1].position.set(-3.9, 1.8, -1.8);
  scene.add(...lights);

  const random = randomGenerator(heroCrystalConfig.density.seed);
  const crystalGroup = new THREE.Group();
  attachment.add(crystalGroup);
  const { origin, petals } = makeRose(random, crystalGroup);
  const highlightPetals = petals.filter((_, index) => index === 2 || index === 7 || index === 12);
  const highlightPoint = new THREE.Vector3();

  const sprites = makePoints();
  scene.add(sprites.mesh);
  const sparks = Array.from({ length: heroCrystalConfig.density.sparks }, (_, index) => ({
    petal: petals[Math.floor(random() * petals.length)],
    phase: random(),
    speed: mix(0.29, 0.68, random()),
    reach: mix(0.021, 0.112, random()),
    angle: random() * Math.PI * 2,
    size: mix(0.58, 1.75, random()),
    color: index % 5 ? heroCrystalConfig.colors.gleam : heroCrystalConfig.colors.coolGleam,
  }));

  const liveTexture = video ? new THREE.VideoTexture(video) : null;
  if (liveTexture) liveTexture.colorSpace = THREE.SRGBColorSpace;
  let active = true;
  let contextLost = false;
  let lastTime = 0;
  let lastOrbit = [];
  let lastOptions = {};
  let drawable = false;
  let liveProgramsReady = false;

  function attachToPortrait(pose) {
    const { x, y, scale, roll, yaw } = portraitPose(pose);
    attachment.rotation.set(0, yaw, -roll, "ZYX");
    attachment.scale.setScalar(scale);
    pivot.copy(eye).multiplyScalar(scale).applyQuaternion(attachment.quaternion);
    attachment.position.set((x - 0.5) * 2 * aspect, (0.5 - y) * 2, 0).sub(pivot);
    attachment.updateMatrix();
  }

  function syncPortraitTexture(time) {
    if (!liveTexture || video.readyState < video.HAVE_CURRENT_DATA || !video.videoWidth) return false;
    if (!backdropMaterial.map) {
      backdropMaterial.map = liveTexture;
      backdropMaterial.needsUpdate = true;
    }
    if (!liveProgramsReady && time < heroCrystalConfig.timeline.idleEnd) {
      liveProgramsReady = true;
      // Initialize the transmission pass during the quiet opening. Clear it in the same frame.
      backdrop.visible = true;
      crystalGroup.visible = true;
      occluder.visible = false;
      sprites.mesh.visible = false;
      updateCrystals(heroCrystalConfig.timeline.growthEnd);
      renderer.render(scene, camera);
      renderer.clear();
      backdrop.visible = false;
      crystalGroup.visible = false;
    }
    return true;
  }

  function updateCrystals(time) {
    for (const petal of petals) {
      const growth = pieceScale(time, petal);
      petal.mesh.visible = growth > 0.004;
      petal.mesh.scale.setScalar(growth);
      petal.mesh.rotation.z = (1 - growth) * petal.turn;
    }
    // During the hold, a small rotation lets the key sweep over the ridges and settle before transfer.
    const { growthEnd, holdEnd } = heroCrystalConfig.timeline;
    const holdProgress = clamp((time - growthEnd) / (holdEnd - growthEnd));
    const reflectionTurn = Math.sin(holdProgress * Math.PI) ** 2;
    scene.environmentRotation.y = reflectionTurn * 0.065;
    scene.environmentRotation.x = reflectionTurn * -0.024;
  }

  function addMetalHighlights(time) {
    // A small optical halo follows the lit lips as the petals open.
    const { growthEnd, holdEnd } = heroCrystalConfig.timeline;
    const strength = smooth((time - growthEnd + 1.3) / 1.3) * smooth((holdEnd + 1.35 - time) / 1.35);
    if (strength <= 0) return;
    for (const [index, petal] of highlightPetals.entries()) {
      highlightPoint.copy(petal.lip).multiplyScalar(pieceScale(time, petal)).applyQuaternion(petal.mesh.quaternion).add(origin);
      highlightPoint.z += 0.006;
      highlightPoint.applyMatrix4(attachment.matrix);
      sprites.add(
        highlightPoint.x,
        highlightPoint.y,
        highlightPoint.z,
        3.1 - index * 0.44,
        strength * (0.22 - index * 0.04),
        heroCrystalConfig.colors.gleam
      );
    }
  }

  function updateSprites(time, orbitPoints, crystals) {
    sprites.clear();
    for (const detail of orbitPoints.slice(0, heroCrystalConfig.density.maxOrbitPoints)) {
      const depth = Math.min(1, Math.max(-1, detail.depth ?? 0));
      sprites.add(
        (detail.x - 0.5) * 2 * aspect,
        (0.5 - detail.y) * 2,
        depth * 0.5,
        detail.size * mix(0.74, 1.19, (depth + 1) / 2),
        detail.opacity * mix(0.49, 1, (depth + 1) / 2),
        detail.color
      );
    }
    if (crystals) {
      addMetalHighlights(time);
      const { growthEnd, transferEnd, duration } = heroCrystalConfig.timeline;
      const glints = smooth((time - growthEnd + 1.5) / 1.8) * smooth((duration - time) / 0.62);
      if (glints > 0) {
        for (const spark of sparks) {
          const { petal } = spark;
          const phase = (time * spark.speed + spark.phase) % 1;
          const growth = time < transferEnd ? pieceScale(time, petal) : Math.max(0.57, pieceScale(time, petal));
          const drift = phase * spark.reach * (time > transferEnd ? 1.73 : 1);
          sparkWorld.copy(petal.lip).multiplyScalar(growth).applyQuaternion(petal.mesh.quaternion).add(origin);
          sparkWorld.x += Math.cos(spark.angle) * drift;
          sparkWorld.y += Math.sin(spark.angle) * drift - phase * 0.046;
          sparkWorld.z += 0.023 + drift * 0.29;
          sparkWorld.applyMatrix4(attachment.matrix);
          sprites.add(
            sparkWorld.x,
            sparkWorld.y,
            sparkWorld.z,
            spark.size,
            glints * Math.sin(phase * Math.PI) ** 1.5 * (time > transferEnd ? 0.53 : 0.34),
            spark.color
          );
        }
      }
    }
    sprites.commit();
  }

  function setTime(time, orbitPoints = [], options = {}) {
    if (!active || contextLost) return;
    lastTime = time;
    lastOrbit = orbitPoints;
    lastOptions = options;

    const { orbitEnd, duration } = heroCrystalConfig.timeline;
    const textureReady = syncPortraitTexture(time);
    const crystals = options.crystals !== false && textureReady && time >= orbitEnd && time < duration;
    if (!crystals && orbitPoints.length === 0) {
      if (drawable) renderer.clear();
      drawable = false;
      return;
    }
    crystalGroup.visible = crystals;
    backdrop.visible = crystals;
    occluder.visible = orbitPoints.length > 0;
    attachToPortrait(options.pose);
    if (crystals) updateCrystals(time);
    updateSprites(time, orbitPoints, crystals);
    renderer.render(scene, camera);
    drawable = true;
  }

  function resize() {
    if (!active) return;
    const { width, height } = plate.getBoundingClientRect();
    if (!width || !height) return;
    const { maxDpr, maxPixels } = heroCrystalConfig.render;
    const density = Math.min(devicePixelRatio || 1, maxDpr, Math.sqrt(maxPixels / (width * height)));
    renderer.setPixelRatio(density);
    renderer.setSize(width, height, false);
    sprites.setDensity(density);
    setTime(lastTime, lastOrbit, lastOptions);
  }

  function loseContext(event) {
    event.preventDefault();
    contextLost = true;
  }

  function restoreContext() {
    contextLost = false;
    resize();
  }

  function destroy() {
    active = false;
    canvas.removeEventListener("webglcontextlost", loseContext);
    canvas.removeEventListener("webglcontextrestored", restoreContext);
    const assets = new Set();
    scene.traverse((object) => {
      if (object.geometry) assets.add(object.geometry);
      if (object.material) assets.add(object.material);
    });
    assets.forEach((asset) => asset.dispose());
    liveTexture?.dispose();
    studio.dispose();
    renderer.dispose();
  }

  canvas.addEventListener("webglcontextlost", loseContext);
  canvas.addEventListener("webglcontextrestored", restoreContext);
  resize();
  return { setTime, resize, destroy };
}
