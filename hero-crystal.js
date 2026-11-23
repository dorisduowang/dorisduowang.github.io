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
  // A seed fixes the exact geometry and spark trajectories on every loop.
  density: { seed: 22721, branches: 8, droplets: 4, sparks: 48, maxOrbitPoints: 420 },
  // The iris cap and the base of each chrome spike transmit the live portrait.
  material: {
    transmission: 1,
    ior: 1.5,
    roughness: 0.032,
    thickness: [0.16, 0.27, 0.43],
    clearcoat: 1,
    clearcoatRoughness: 0.027,
    iridescence: 0.13,
    iridescenceThicknessRange: [110, 315],
    attenuationDistance: 1.62,
    dispersion: 0.012,
    envMapIntensity: 1.02,
  },
  chrome: { color: "#e8ecf2", roughnessRange: [0.04, 0.12], anisotropyRange: [0.6, 0.9], iridescence: 0.21 },
  mercury: { color: "#d9dde3", metalness: 1, roughness: 0.02, envMapIntensity: 1.6 },
  // Pale neutral glass, cool attenuation through thick sections, and two restrained spark colors.
  colors: { glass: "#f8fcff", attenuation: "#edf7fb", gleam: "#eafaff", coolGleam: "#a8d9f1" },
  // Device pixel ratio and pixel budget cap the cost of the transmission pass on large or dense displays.
  render: { maxDpr: 2, maxPixels: 820_000 },
};

export const crystalCentroid = { x: 0.532, y: 0.269 };

const aspect = 1104 / 1024;
const up = new THREE.Vector3(0, 1, 0);
const cameraDirection = new THREE.Vector3(0, 0, 1);
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

function makeShardGeometry(sides, twist, random) {
  const rings = [0, 0.14, 0.66, 0.88].map((height, index) => {
    const radius = [0.46, 1, 0.77, 0.57][index];
    return Array.from({ length: sides }, (_, side) => {
      const turn = (2 * Math.PI * side) / sides + twist * height;
      return new THREE.Vector3(
        Math.cos(turn) * radius * mix(0.81, 1.17, random()),
        height + (index === 0 ? 0 : (random() - 0.5) * 0.085),
        Math.sin(turn) * radius * mix(0.85, 1.2, random())
      );
    });
  });
  const base = new THREE.Vector3(0, 0, 0);
  const tip = new THREE.Vector3((random() - 0.5) * 0.72, 1, (random() - 0.5) * 0.58);
  const triangles = [];
  function triangle(a, b, c) {
    triangles.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  for (let side = 0; side < sides; side += 1) {
    const next = (side + 1) % sides;
    triangle(base, rings[0][side], rings[0][next]);
    for (let level = 0; level < rings.length - 1; level += 1) {
      const low = rings[level];
      const high = rings[level + 1];
      triangle(low[side], high[side], low[next]);
      triangle(high[side], high[next], low[next]);
    }
    triangle(rings.at(-1)[side], tip, rings.at(-1)[next]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(triangles, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function makeDropletGeometry(mercury) {
  const geometry = mercury ? new THREE.SphereGeometry(1, 40, 28) : new THREE.IcosahedronGeometry(1, 3);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const bulge = 1 + 0.12 * Math.sin(3.8 * x + y) * Math.sin(4.1 * y - 2.3 * z) + 0.075 * Math.cos(4.6 * z - x);
    // The asymmetric lobes make neighboring beads read as coalesced drops under mirror reflections.
    const lobe = mercury ? 0.16 * Math.exp(-4.5 * ((x - 0.7) ** 2 + (y + 0.42) ** 2 + (z - 0.34) ** 2)) : 0;
    positions.setXYZ(index, x * (bulge + lobe), y * (bulge + lobe) + 0.26 * x, z * (bulge + lobe));
  }
  if (mercury) geometry.computeVertexNormals();
  return geometry;
}

// Three.js adds surface derivatives to lighting roughness. Keep that reflection detail
// while limiting its blur on the video sampled through the glass.
const clearRefraction = THREE.ShaderChunk.transmission_fragment.replace("n, v, material.roughness,", "n, v, min(material.roughness, 0.019),");

function makeGlass(thickness) {
  const { thickness: thicknessOptions, ...material } = heroCrystalConfig.material;
  const glass = new THREE.MeshPhysicalMaterial({
    ...material,
    thickness: thicknessOptions[thickness],
    roughness: material.roughness * 0.67,
    color: heroCrystalConfig.colors.glass,
    attenuationColor: heroCrystalConfig.colors.attenuation,
  });
  glass.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <transmission_fragment>", clearRefraction);
  };
  return glass;
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

function makeChromeBlend(thickness) {
  const blend = makeGlass(thickness);
  const chrome = heroCrystalConfig.chrome;
  blend.color.set(chrome.color);
  blend.metalness = 1;
  blend.clearcoatRoughness = 0.02;
  blend.anisotropy = chrome.anisotropyRange[0];
  blend.iridescence = chrome.iridescence;
  blend.iridescenceThicknessRange = [155, 245];
  blend.envMapIntensity = 1.44;
  blend.onBeforeCompile = (shader) => {
    shader.uniforms.glassTint = { value: new THREE.Color(heroCrystalConfig.colors.glass) };
    shader.vertexShader = `
      attribute float crystalReveal;
      attribute vec3 crystalFinish;
      varying float vCrystalReveal;
      varying float vCrystalTip;
      varying vec3 vCrystalFinish;
      varying vec3 vCrystalAxis;
      ${shader.vertexShader}
    `.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
      vCrystalReveal = crystalReveal;
      vCrystalTip = position.y;
      vCrystalFinish = crystalFinish;
      vCrystalAxis = (modelViewMatrix * instanceMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz;`
    );
    shader.fragmentShader = `
      uniform vec3 glassTint;
      varying float vCrystalReveal;
      varying float vCrystalTip;
      varying vec3 vCrystalFinish;
      varying vec3 vCrystalAxis;
      ${shader.fragmentShader}
    `
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
        if (vCrystalReveal < 1.0 && vCrystalTip > vCrystalReveal) discard;
        float chromeCover = smoothstep(vCrystalFinish.x, vCrystalFinish.x + 0.17, vCrystalTip);`
      )
      .replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
        metalnessFactor *= chromeCover;
        roughnessFactor = mix(roughnessFactor, vCrystalFinish.y, chromeCover);
        diffuseColor.rgb = mix(glassTint, diffuseColor.rgb, chromeCover);`
      )
      .replace(
        "#include <lights_physical_fragment>",
        `#include <lights_physical_fragment>
        vec3 axis = normalize(vCrystalAxis);
        vec3 tangent = axis - normal * dot(axis, normal);
        if (dot(tangent, tangent) > 0.0001) {
          material.anisotropyT = normalize(tangent);
          material.anisotropyB = normalize(cross(normal, material.anisotropyT));
        }
        material.anisotropy = chromeCover * vCrystalFinish.z;
        material.alphaT = mix(pow2(material.roughness), 1.0, pow2(material.anisotropy));
        float grazing = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
        material.iridescence *= mix(0.05, 1.0, smoothstep(0.27, 0.95, grazing));`
      )
      .replace(
        "#include <transmission_fragment>",
        clearRefraction
          .replace("material.transmission = transmission;", "material.transmission = transmission * (1.0 - chromeCover);")
          .replace("material.dispersion, material.ior", "material.dispersion * (1.0 - chromeCover), material.ior")
      );
    addChromeHighlights(shader, "chromeCover");
  };
  return blend;
}

function makeChromeTendril() {
  const chrome = heroCrystalConfig.chrome;
  const material = new THREE.MeshPhysicalMaterial({
    color: chrome.color,
    metalness: 1,
    roughness: 0.07,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    anisotropy: 0.78,
    iridescence: chrome.iridescence,
    iridescenceThicknessRange: [155, 245],
    envMapIntensity: 1.44,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_physical_fragment>",
      `#include <lights_physical_fragment>
      float grazing = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
      material.iridescence *= mix(0.05, 1.0, smoothstep(0.27, 0.95, grazing));`
    );
    addChromeHighlights(shader, "1.0");
  };
  return material;
}

function makePieces(random) {
  const batches = [[], [], []];
  const drops = [];
  const anchors = heroCrystalConfig.anchors.map((anchor) => ({ ...anchor, base: point(anchor.x, anchor.y, anchor.z) }));
  const growthWindow = heroCrystalConfig.timeline.growthEnd - heroCrystalConfig.timeline.orbitEnd;
  // The portrait fades at the crown. The longest shards still terminate below that mask.
  const fitLength = (base, direction, length) => (direction.y > 0 ? Math.min(length, (0.85 - base.y) / direction.y) : length);
  for (const anchor of anchors) {
    for (let index = 0; index < heroCrystalConfig.density.branches; index += 1) {
      const primary = index < 3;
      const direction = new THREE.Vector3(...anchor.direction);
      direction.x += (random() - 0.38) * 0.85;
      direction.y += (primary ? [0.03, 0.57, -0.5][index] : 0) + (random() - 0.5) * (primary ? 0.75 : 1.98);
      direction.z += (random() - 0.43) * (primary ? 1.37 : 1.9);
      direction.x = Math.max(0.16, direction.x);
      direction.normalize();
      const spreadLength = anchor.size * (primary ? mix(0.126, 0.239, random()) : mix(0.052, 0.166, random()));
      const base = anchor.base
        .clone()
        .add(new THREE.Vector3(mix(-0.023, 0.025, random()), mix(-0.031, 0.032, random()), mix(-0.01, 0.035, random())));
      const length = fitLength(base, direction, spreadLength);
      const birth = anchor.delay + (primary ? mix(0.58, 2.08, random()) + index * 0.29 : mix(0.82, 2.54, random()));
      batches[primary ? (index === 0 ? 2 : 1) : 0].push({
        base,
        direction,
        turn: new THREE.Quaternion().setFromUnitVectors(up, direction),
        length,
        radius: anchor.size * (primary ? mix(0.024, 0.055, random()) : mix(0.008, 0.027, random())),
        profile: primary ? 0.4 : 0.68,
        birth,
        grow: Math.min(growthWindow - birth, mix(2.12, 3.28, random())),
        dissolve: primary ? mix(0.36, 0.76, random()) : mix(0, 0.48, random()),
      });

      if (!primary) continue;
      const joint = base.clone().addScaledVector(direction, length * mix(0.35, 0.61, random()));
      const branch = direction.clone().add(new THREE.Vector3(mix(0.06, 0.49, random()), mix(-0.78, 0.78, random()), mix(-0.54, 0.61, random())));
      branch.normalize();
      batches[0].push({
        base: joint,
        direction: branch,
        turn: new THREE.Quaternion().setFromUnitVectors(up, branch),
        length: fitLength(joint, branch, anchor.size * mix(0.053, 0.12, random())),
        radius: anchor.size * mix(0.0065, 0.017, random()),
        profile: 0.62,
        birth: Math.min(4.1, birth + mix(0.83, 1.58, random())),
        grow: mix(1.15, 1.65, random()),
        dissolve: mix(0, 0.31, random()),
      });
    }

    for (let index = 0; index < heroCrystalConfig.density.droplets; index += 1) {
      const focal = index === 0;
      const irisLens = focal && anchor.iris;
      const mercury = !(irisLens || (focal && anchor.delay < 1) || (anchor.iris && index === 1));
      const radius =
        (irisLens ? 0.067 : anchor.size * (focal ? mix(0.06, 0.104, random()) : mix(0.026, 0.076, random()))) * (mercury ? (focal ? 0.86 : 0.67) : 1);
      const offset = new THREE.Vector3(
        irisLens ? 0 : mix(-0.021, 0.035, random()) + (mercury ? 0.027 : 0),
        irisLens ? 0.003 : mix(-0.027, 0.031, random()),
        focal ? 0.033 : mix(0.021, 0.053, random())
      );
      drops.push({
        base: anchor.base.clone().add(offset),
        mercury,
        size: new THREE.Vector3(
          radius,
          radius * (irisLens ? 0.59 : mix(0.56, 1.18, random())),
          radius * (irisLens ? 0.28 : mix(0.33, 0.71, random()))
        ),
        turn: irisLens ? 0.11 : mix(-1, 1, random()),
        birth: anchor.delay + mix(0, 0.84, random()),
        grow: mix(1.35, 2.78, random()),
        dissolve: mix(0.93, 1.34, random()),
      });
    }
  }
  return { batches, drops, anchors };
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

export function createHeroCrystal(canvas, plate, options = {}) {
  if (!canvas || !plate || (window.matchMedia("(max-width: 767px)").matches && !options.allowMobile)) return null;

  const video = plate.querySelector(".landing-video");
  const dayCanvas = plate.querySelector("[data-day-portrait]");

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
  const { batches, drops, anchors } = makePieces(random);
  const crystalGroup = new THREE.Group();
  attachment.add(crystalGroup);
  const shards = batches.map((pieces, index) => {
    const geometry = makeShardGeometry(5 + index, 0.2 * (index - 1), random);
    const reveal = new THREE.InstancedBufferAttribute(new Float32Array(pieces.length), 1).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("crystalReveal", reveal);
    const { roughnessRange, anisotropyRange } = heroCrystalConfig.chrome;
    const finish = new Float32Array(pieces.length * 3);
    const finishRandom = randomGenerator(heroCrystalConfig.density.seed + index * 113);
    // With the shipped layout this yields 35 chrome pieces, 15 mercury drops and 29 clear-glass pieces.
    const chromeShare = [0.6, 0.4, 0.6][index];
    const chromeCount = Math.round(pieces.length * chromeShare);
    for (let piece = 0; piece < pieces.length; piece += 1) {
      const glassRoot = mix(0.33, 0.49, finishRandom()) + index * 0.032;
      const chromeFinish = (piece * 17) % pieces.length < chromeCount;
      finish.set([chromeFinish ? glassRoot : 2, mix(...roughnessRange, finishRandom()), mix(...anisotropyRange, finishRandom())], piece * 3);
    }
    geometry.setAttribute("crystalFinish", new THREE.InstancedBufferAttribute(finish, 3));
    const mesh = new THREE.InstancedMesh(geometry, makeChromeBlend(index), pieces.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    crystalGroup.add(mesh);
    return { mesh, pieces, reveal };
  });
  const dropletGeometry = makeDropletGeometry(false);
  const mercuryGeometry = makeDropletGeometry(true);
  const dropletMaterial = makeGlass(2);
  const mercuryMaterial = new THREE.MeshPhysicalMaterial({
    ...heroCrystalConfig.mercury,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
  });
  mercuryMaterial.onBeforeCompile = (shader) => addChromeHighlights(shader, "0.75");
  for (const drop of drops) {
    drop.mesh = drop.mercury ? new THREE.Mesh(mercuryGeometry, mercuryMaterial) : new THREE.Mesh(dropletGeometry, dropletMaterial);
    drop.mesh.rotation.z = drop.turn;
    drop.mesh.position.copy(drop.base);
    crystalGroup.add(drop.mesh);
  }
  const highlightDrops = drops
    .filter((drop) => drop.mercury)
    .sort((a, b) => b.size.x - a.size.x)
    .slice(0, 3);
  const highlightNormal = new THREE.Vector3();
  const highlightPoint = new THREE.Vector3();
  const inversePose = new THREE.Quaternion();

  const tubeChrome = makeChromeTendril();
  const tendrils = anchors.slice(1).map((anchor, index) => {
    const origin = anchors[index].base;
    const end = anchor.base;
    const curve = new THREE.CubicBezierCurve3(
      origin,
      origin.clone().add(new THREE.Vector3(0.038 * (index % 2 ? 1 : -0.38), -0.011, 0.028)),
      end.clone().add(new THREE.Vector3(0.02, 0.039, 0.035)),
      end
    );
    const geometry = new THREE.TubeGeometry(curve, 34, mix(0.0041, 0.0071, random()), 6, false);
    const mesh = new THREE.Mesh(geometry, tubeChrome);
    crystalGroup.add(mesh);
    return { mesh, count: geometry.index.count, birth: 0.47 + index * 0.58, grow: 2.85, dissolve: 0.91 + index * 0.08 };
  });

  const sprites = makePoints();
  scene.add(sprites.mesh);
  const tips = batches.flat();
  const sparks = Array.from({ length: heroCrystalConfig.density.sparks }, (_, index) => ({
    shard: tips[Math.floor(random() * tips.length)],
    phase: random(),
    speed: mix(0.29, 0.68, random()),
    reach: mix(0.024, 0.13, random()),
    angle: random() * Math.PI * 2,
    size: mix(0.58, 1.75, random()),
    color: index % 5 ? heroCrystalConfig.colors.gleam : heroCrystalConfig.colors.coolGleam,
  }));

  const dummy = new THREE.Object3D();
  const liveTexture = video ? new THREE.VideoTexture(video) : null;
  if (liveTexture) liveTexture.colorSpace = THREE.SRGBColorSpace;
  // The day canvas is drawn by the same frame event just before this pass, so
  // the eye lens refracts the visible platinum portrait rather than black hair.
  let dayTexture;
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
    const day = document.documentElement.dataset.theme === "day";
    let texture = liveTexture;
    if (day && dayCanvas && plate.dataset.dayReady) {
      if (!dayTexture) {
        dayTexture = new THREE.CanvasTexture(dayCanvas);
        dayTexture.colorSpace = THREE.SRGBColorSpace;
      }
      dayTexture.needsUpdate = true;
      texture = dayTexture;
    }
    if (backdropMaterial.map !== texture) {
      backdropMaterial.map = texture;
      backdropMaterial.needsUpdate = true;
    }
    // Dark orbit points need ordinary alpha compositing against the day canvas.
    // The original additive night glints retain their existing appearance.
    const blending = day ? THREE.NormalBlending : THREE.AdditiveBlending;
    if (sprites.mesh.material.blending !== blending) {
      sprites.mesh.material.blending = blending;
      sprites.mesh.material.needsUpdate = true;
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
    for (const { mesh, pieces, reveal } of shards) {
      pieces.forEach((piece, index) => {
        const growth = pieceScale(time, piece);
        const width = piece.radius * Math.sqrt(growth);
        dummy.position.copy(piece.base);
        dummy.quaternion.copy(piece.turn);
        dummy.scale.set(width, Math.max(0.00001, piece.length * growth), width * piece.profile);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        reveal.setX(index, growth > 0.998 ? 1 : 0.54 + 0.46 * growth);
      });
      mesh.instanceMatrix.needsUpdate = true;
      reveal.needsUpdate = true;
    }
    for (const piece of drops) {
      const growth = pieceScale(time, piece);
      piece.mesh.visible = growth > 0.004;
      piece.mesh.scale.copy(piece.size).multiplyScalar(growth);
    }
    for (const piece of tendrils) {
      const growth = pieceScale(time, piece);
      piece.mesh.geometry.setDrawRange(0, Math.floor((piece.count * growth) / 36) * 36);
    }
    // During the hold, a small rotation lets the key sweep over the ridges and settle before transfer.
    const { growthEnd, holdEnd } = heroCrystalConfig.timeline;
    const holdProgress = clamp((time - growthEnd) / (holdEnd - growthEnd));
    const reflectionTurn = Math.sin(holdProgress * Math.PI) ** 2;
    scene.environmentRotation.y = reflectionTurn * 0.065;
    scene.environmentRotation.x = reflectionTurn * -0.024;
  }

  function addMetalHighlights(time) {
    // Add a small optical halo only at the strongest key-light reflection of three smooth beads.
    const { growthEnd, holdEnd } = heroCrystalConfig.timeline;
    const strength = smooth((time - growthEnd + 1.3) / 1.3) * smooth((holdEnd + 1.35 - time) / 1.35);
    if (strength <= 0) return;
    inversePose.copy(attachment.quaternion).invert();
    highlightNormal.copy(studioKey).normalize().applyEuler(scene.environmentRotation).add(cameraDirection).normalize();
    highlightNormal.applyQuaternion(inversePose);
    for (const [index, drop] of highlightDrops.entries()) {
      highlightPoint
        .copy(highlightNormal)
        .applyAxisAngle(cameraDirection, -drop.turn)
        .multiply(drop.size)
        .normalize()
        .multiply(drop.size)
        .multiplyScalar(pieceScale(time, drop))
        .applyAxisAngle(cameraDirection, drop.turn)
        .add(drop.base);
      highlightPoint.z += 0.009;
      highlightPoint.applyMatrix4(attachment.matrix);
      sprites.add(
        highlightPoint.x,
        highlightPoint.y,
        highlightPoint.z,
        3.4 - index * 0.44,
        strength * (0.25 - index * 0.045),
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
          const source = spark.shard;
          const phase = (time * spark.speed + spark.phase) % 1;
          const growth = time < transferEnd ? pieceScale(time, source) : Math.max(0.57, pieceScale(time, source));
          const length = source.length * growth;
          const drift = phase * spark.reach * (time > transferEnd ? 1.73 : 1);
          sparkWorld
            .set(
              source.base.x + source.direction.x * length + Math.cos(spark.angle) * drift,
              source.base.y + source.direction.y * length + Math.sin(spark.angle) * drift - phase * 0.046,
              source.base.z + source.direction.z * length + 0.023 + drift * 0.29
            )
            .applyMatrix4(attachment.matrix);
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
    const mobileDay = document.documentElement.dataset.theme === "day" && window.matchMedia("(max-width: 767px)").matches;
    const density = Math.min(devicePixelRatio || 1, mobileDay ? 1.25 : maxDpr, Math.sqrt((mobileDay ? 190_000 : maxPixels) / (width * height)));
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
    dayTexture?.dispose();
    studio.dispose();
    renderer.dispose();
  }

  canvas.addEventListener("webglcontextlost", loseContext);
  canvas.addEventListener("webglcontextrestored", restoreContext);
  resize();
  return { setTime, resize, destroy };
}
