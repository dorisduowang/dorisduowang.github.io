import * as THREE from "./assets/third-party/three-0.170.0/three.module.min.js";
import { RoomEnvironment } from "./assets/third-party/three-0.170.0/RoomEnvironment.js";

export const heroCrystalConfig = {
  // The timeline controller may opt into a locally supplied pre-rendered alpha clip.
  useOverlayVideo: false,
  // All values are seconds on the homepage media clock.
  timeline: { duration: 26, idleEnd: 3, orbitEnd: 10, growthEnd: 16, holdEnd: 20, transferEnd: 23 },
  // x/y are normalized from the neutral portrait's top-left. z, direction and size are in scene units.
  anchors: [
    { x: 0.6, y: 0.166, z: 0.085, direction: [0.52, 0.86, 0.49], size: 0.86, delay: 0.04 },
    { x: 0.635, y: 0.218, z: 0.095, direction: [0.92, 0.57, 0.5], size: 1.1, delay: 0.22 },
    { x: 0.607, y: 0.296, z: 0.12, direction: [0.95, 0.12, 0.7], size: 0.88, delay: 0.64 },
    { x: 0.642, y: 0.354, z: 0.07, direction: [1, -0.23, 0.42], size: 1.02, delay: 0.88 },
    { x: 0.587, y: 0.425, z: 0.105, direction: [0.72, -0.65, 0.43], size: 0.63, delay: 1.23 },
  ],
  // The invisible, depth-writing ellipsoid blocks rear orbit points. Its radii use scene units, roll is radians.
  occluder: { x: 0.485, y: 0.323, z: -0.17, scale: [0.365, 0.478, 0.205], roll: 0.045 },
  // A seed fixes the exact geometry and spark trajectories on every loop.
  density: { seed: 22721, branches: 9, droplets: 5, sparks: 58, maxOrbitPoints: 420 },
  // Thin splinters, larger shards and liquid bases share refraction and have different thicknesses.
  material: {
    transmission: 1,
    ior: 1.5,
    roughness: 0.053,
    thickness: [0.42, 0.72, 1.04],
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    iridescence: 0.37,
    iridescenceThicknessRange: [110, 315],
    attenuationDistance: 0.83,
    dispersion: 0.057,
    envMapIntensity: 1.88,
  },
  // Pale neutral glass, cool attenuation through thick sections, and two restrained spark colors.
  colors: { glass: "#f4fbff", attenuation: "#d3edf5", gleam: "#eafaff", coolGleam: "#a8d9f1" },
  // Device pixel ratio and pixel budget cap the cost of the transmission pass on large or dense displays.
  render: { maxDpr: 1.75, maxPixels: 720_000, portraitSource: "/assets/img/portfolio/doris-bionic-neutral.webp" },
};

export const crystalCentroid = { x: 0.674, y: 0.294 };

const aspect = 1104 / 1024;
const up = new THREE.Vector3(0, 1, 0);
const clamp = (value) => Math.max(0, Math.min(1, value));
const mix = (a, b, progress) => a + (b - a) * progress;
const smooth = (value) => {
  const u = clamp(value);
  return u * u * (3 - 2 * u);
};

function point(x, y, z = 0) {
  return new THREE.Vector3((x - 0.5) * 2 * aspect, (0.5 - y) * 2, z);
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

function makeDropletGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1, 3);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const bulge = 1 + 0.12 * Math.sin(3.8 * x + y) * Math.sin(4.1 * y - 2.3 * z) + 0.075 * Math.cos(4.6 * z - x);
    positions.setXYZ(index, x * bulge, y * bulge + 0.26 * x, z * bulge);
  }
  return geometry;
}

function makeGlass(thickness, faceted = false) {
  const { thickness: thicknessOptions, ...material } = heroCrystalConfig.material;
  const glass = new THREE.MeshPhysicalMaterial({
    ...material,
    thickness: thicknessOptions[thickness],
    roughness: faceted ? material.roughness + (thickness === 0 ? 0.013 : 0) : material.roughness * 0.67,
    color: heroCrystalConfig.colors.glass,
    attenuationColor: heroCrystalConfig.colors.attenuation,
  });
  if (faceted) {
    // An instance-specific base-to-tip cut adds a short advancing bevel during growth or descent.
    glass.onBeforeCompile = (shader) => {
      shader.vertexShader = `attribute float crystalReveal; varying float vCrystalReveal; varying float vCrystalTip;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvCrystalReveal = crystalReveal; vCrystalTip = position.y;"
      );
      shader.fragmentShader = `varying float vCrystalReveal; varying float vCrystalTip;\n${shader.fragmentShader}`;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <clipping_planes_fragment>",
        "#include <clipping_planes_fragment>\nif (vCrystalReveal < 1.0 && vCrystalTip > vCrystalReveal) discard;"
      );
    };
  }
  return glass;
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
      const spreadLength = anchor.size * (primary ? mix(0.21, 0.39, random()) : mix(0.067, 0.245, random()));
      const base = anchor.base.clone().add(new THREE.Vector3(mix(-0.017, 0.07, random()), mix(-0.05, 0.065, random()), mix(-0.016, 0.065, random())));
      const length = fitLength(base, direction, spreadLength);
      const birth = anchor.delay + (primary ? mix(0.58, 2.08, random()) + index * 0.29 : mix(0.82, 2.54, random()));
      batches[primary ? (index === 0 ? 2 : 1) : 0].push({
        base,
        direction,
        turn: new THREE.Quaternion().setFromUnitVectors(up, direction),
        length,
        radius: anchor.size * (primary ? mix(0.019, 0.044, random()) : mix(0.006, 0.019, random())),
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
        length: fitLength(joint, branch, anchor.size * mix(0.083, 0.229, random())),
        radius: anchor.size * mix(0.0065, 0.017, random()),
        birth: Math.min(4.1, birth + mix(0.83, 1.58, random())),
        grow: mix(1.15, 1.65, random()),
        dissolve: mix(0, 0.31, random()),
      });
    }

    for (let index = 0; index < heroCrystalConfig.density.droplets; index += 1) {
      const focal = index === 0;
      const radius = anchor.size * (focal ? mix(0.063, 0.1, random()) : mix(0.015, 0.056, random()));
      const offset = new THREE.Vector3(
        focal ? mix(0.041, 0.07, random()) : mix(-0.014, 0.125, random()),
        mix(-0.054, 0.063, random()),
        focal ? mix(0.062, 0.091, random()) : mix(0.024, 0.15, random())
      );
      drops.push({
        base: anchor.base.clone().add(offset),
        size: new THREE.Vector3(radius, radius * mix(0.72, 1.48, random()), radius * mix(0.71, 1.26, random())),
        turn: mix(-1, 1, random()),
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
  const count = maxOrbitPoints + sparks;
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
  const environment = new RoomEnvironment();
  const generator = new THREE.PMREMGenerator(renderer);
  const studio = generator.fromScene(environment, 0.024);
  scene.environment = studio.texture;
  environment.dispose();
  generator.dispose();

  const backdropMaterial = new THREE.MeshBasicMaterial({ toneMapped: false });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(aspect * 2, 2), backdropMaterial);
  backdrop.position.z = -1.22;
  backdrop.renderOrder = -10;
  backdrop.visible = false;
  scene.add(backdrop);

  const proxy = heroCrystalConfig.occluder;
  const occluder = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ colorWrite: false }));
  occluder.position.copy(point(proxy.x, proxy.y, proxy.z));
  occluder.scale.set(...proxy.scale);
  occluder.rotation.z = proxy.roll;
  occluder.renderOrder = -8;
  scene.add(occluder);

  const lights = [new THREE.DirectionalLight(0xe4f5ff, 3.85), new THREE.DirectionalLight(0xc0d9ff, 1.65)];
  lights[0].position.set(-1.7, 2.1, -0.03);
  lights[1].position.set(1.42, 0.71, 0.86);
  scene.add(...lights);

  const random = randomGenerator(heroCrystalConfig.density.seed);
  const { batches, drops, anchors } = makePieces(random);
  const crystalGroup = new THREE.Group();
  scene.add(crystalGroup);
  const shards = batches.map((pieces, index) => {
    const geometry = makeShardGeometry(5 + index, 0.2 * (index - 1), random);
    const reveal = new THREE.InstancedBufferAttribute(new Float32Array(pieces.length), 1).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("crystalReveal", reveal);
    const mesh = new THREE.InstancedMesh(geometry, makeGlass(index, true), pieces.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    crystalGroup.add(mesh);
    return { mesh, pieces, reveal };
  });
  const dropletGeometry = makeDropletGeometry();
  const dropletMaterial = makeGlass(2);
  for (const drop of drops) {
    drop.mesh = new THREE.Mesh(dropletGeometry, dropletMaterial);
    drop.mesh.rotation.z = drop.turn;
    drop.mesh.position.copy(drop.base);
    crystalGroup.add(drop.mesh);
  }

  const tubeGlass = makeGlass(0);
  const tendrils = anchors.slice(1).map((anchor, index) => {
    const origin = anchors[index].base;
    const end = anchor.base;
    const curve = new THREE.CubicBezierCurve3(
      origin,
      origin.clone().add(new THREE.Vector3(0.11 * (index % 2 ? 1 : -0.38), -0.037, 0.077)),
      end.clone().add(new THREE.Vector3(0.057, 0.11, 0.11)),
      end
    );
    const geometry = new THREE.TubeGeometry(curve, 34, mix(0.0041, 0.0071, random()), 6, false);
    const mesh = new THREE.Mesh(geometry, tubeGlass);
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
  let portraitTexture;
  let ready = false;
  let active = true;
  let contextLost = false;
  let lastTime = 0;
  let lastOrbit = [];
  let lastOptions = {};
  let drawable = false;

  function updateCrystals(time) {
    for (const { mesh, pieces, reveal } of shards) {
      pieces.forEach((piece, index) => {
        const growth = pieceScale(time, piece);
        const width = piece.radius * Math.sqrt(growth);
        dummy.position.copy(piece.base);
        dummy.quaternion.copy(piece.turn);
        dummy.scale.set(width, Math.max(0.00001, piece.length * growth), width);
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
    // Rotate only the studio reflection and move a rim light. The portrait itself stays still.
    scene.environmentRotation.y = Math.sin(time * 0.73) * 0.19;
    lights[1].position.x = 1.42 + Math.sin(time * 0.74) * 0.31;
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
      const { growthEnd, transferEnd, duration } = heroCrystalConfig.timeline;
      const glints = smooth((time - growthEnd + 1.5) / 1.8) * smooth((duration - time) / 0.62);
      if (glints > 0) {
        for (const spark of sparks) {
          const source = spark.shard;
          const phase = (time * spark.speed + spark.phase) % 1;
          const growth = time < transferEnd ? pieceScale(time, source) : Math.max(0.57, pieceScale(time, source));
          const length = source.length * growth;
          const drift = phase * spark.reach * (time > transferEnd ? 1.73 : 1);
          sprites.add(
            source.base.x + source.direction.x * length + Math.cos(spark.angle) * drift,
            source.base.y + source.direction.y * length + Math.sin(spark.angle) * drift - phase * 0.046,
            source.base.z + source.direction.z * length + 0.023 + drift * 0.29,
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
    const crystals = options.crystals !== false && ready && time >= orbitEnd && time < duration;
    if (!crystals && orbitPoints.length === 0) {
      if (drawable) renderer.clear();
      drawable = false;
      return;
    }
    crystalGroup.visible = crystals;
    backdrop.visible = crystals;
    occluder.visible = orbitPoints.length > 0;
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
    portraitTexture?.dispose();
    studio.dispose();
    renderer.dispose();
  }

  canvas.addEventListener("webglcontextlost", loseContext);
  canvas.addEventListener("webglcontextrestored", restoreContext);
  const source = plate.querySelector(".portrait-neutral")?.getAttribute("src") || heroCrystalConfig.render.portraitSource;
  new THREE.TextureLoader().load(source, (texture) => {
    if (!active) {
      texture.dispose();
      return;
    }
    portraitTexture = texture;
    portraitTexture.colorSpace = THREE.SRGBColorSpace;
    backdropMaterial.map = portraitTexture;
    backdropMaterial.needsUpdate = true;
    ready = true;
    // Submit programs before growth without drawing on the live canvas. Drivers without parallel compile skip this work.
    if (!contextLost && renderer.extensions.has("KHR_parallel_shader_compile")) renderer.compile(scene, camera);
    setTime(lastTime, lastOrbit, lastOptions);
  });
  resize();
  return { setTime, resize, destroy };
}
