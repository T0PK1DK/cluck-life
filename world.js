import * as THREE from 'three';

// Low-poly cozy farm + fight ring. Shared geometries, instancing, and a
// quality ladder so phones stay smooth. No external models or textures.

const ARENA_X = 28;
const YARD = { cam: new THREE.Vector3(3.2, 4.4, 6.8), look: new THREE.Vector3(0.15, 0.85, 0.45) };
const RING = { cam: new THREE.Vector3(ARENA_X + 0.4, 4.0, 6.6), look: new THREE.Vector3(ARENA_X, 1.0, 0) };
const BIRD = 1.85;

function hex(c) {
  return new THREE.Color(c);
}

function makeMatCache() {
  const cache = new Map();
  return function mat(color, extra) {
    const key = String(color) + (extra ? JSON.stringify(extra) : '');
    let m = cache.get(key);
    if (m) return m;
    m = new THREE.MeshLambertMaterial(Object.assign({ color: hex(color), flatShading: true }, extra || {}));
    cache.set(key, m);
    return m;
  };
}

function detectQuality() {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const small = window.innerWidth < 720 || window.innerHeight < 540;
  const mem = navigator.deviceMemory || 4;
  if (coarse || small || mem <= 4) return 'phone';
  return 'high';
}

export function createWorld(canvas, hooks) {
  const emit = hooks || {};
  const mat = makeMatCache();
  let quality = detectQuality();
  const geo = {
    sphere: new THREE.SphereGeometry(1, 8, 6),
    box: new THREE.BoxGeometry(1, 1, 1),
    cone: new THREE.ConeGeometry(1, 1, 6),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 6),
    plane: new THREE.PlaneGeometry(1, 1),
    circle: new THREE.CircleGeometry(1, 12),
  };

  const scene = new THREE.Scene();
  scene.background = hex('#7ec8f5');
  scene.fog = new THREE.Fog(0x9ed6f5, 14, 32);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.15, 80);
  camera.position.copy(YARD.cam);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x8fd2ff, 1);
  renderer.shadowMap.enabled = false;

  const hemi = new THREE.HemisphereLight(0xfff6dc, 0x3f8a38, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1c4, 0.72);
  sun.position.set(8, 12, 6);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x89b36a, 0.22));

  const root = new THREE.Group();
  scene.add(root);

  function mesh(geometry, color, x, y, z, sx, sy, sz, extra) {
    const m = new THREE.Mesh(geometry, mat(color, extra));
    m.position.set(x || 0, y || 0, z || 0);
    if (sx != null) m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  }

  function applyQuality() {
    const phone = quality === 'phone';
    const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.15 : 1.6);
    renderer.setPixelRatio(dpr);
    // Fake blob shadows on the chickens already sell the light. Real
    // shadow maps were flipped on for "high" even though no mesh cast,
    // which just burned GPU on tablets.
    renderer.shadowMap.enabled = false;
    sun.castShadow = false;
    scene.fog.far = phone ? 26 : 34;
  }

  // ---------- chickens ----------
  function chickMat(color) {
    return new THREE.MeshLambertMaterial({ color: hex(color), flatShading: true, emissive: 0x000000 });
  }

  function makeChicken(body, comb) {
    const g = new THREE.Group();
    const shadow = mesh(geo.circle, '#000000', 0, 0.02, 0, 0.55, 1, 0.38, { transparent: true, opacity: 0.18 });
    shadow.rotation.x = -Math.PI / 2;
    g.add(shadow);

    const bodyM = new THREE.Mesh(geo.sphere, chickMat(body));
    bodyM.position.set(0, 0.62, 0.02);
    bodyM.scale.set(0.48, 0.4, 0.55);
    g.add(bodyM);
    const tail = new THREE.Mesh(geo.cone, chickMat(shadeHex(body, -22)));
    tail.position.set(0, 0.78, -0.48);
    tail.scale.set(0.22, 0.38, 0.22);
    tail.rotation.x = -1.15;
    g.add(tail);

    const wingL = new THREE.Mesh(geo.sphere, chickMat(shadeHex(body, -18)));
    wingL.position.set(0.42, 0.62, 0.02);
    wingL.scale.set(0.14, 0.22, 0.28);
    const wingR = new THREE.Mesh(geo.sphere, chickMat(shadeHex(body, -18)));
    wingR.position.set(-0.42, 0.62, 0.02);
    wingR.scale.set(0.14, 0.22, 0.28);
    g.add(wingL, wingR);

    const head = new THREE.Group();
    head.position.set(0, 1.02, 0.38);
    const headM = new THREE.Mesh(geo.sphere, chickMat(body));
    headM.scale.set(0.28, 0.26, 0.28);
    head.add(headM);
    function combBit(x, y, z, sx, sy, sz) {
      const m = new THREE.Mesh(geo.sphere, chickMat(comb));
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      head.add(m);
    }
    combBit(0, 0.26, 0.02, 0.09, 0.12, 0.08);
    combBit(-0.1, 0.22, 0.02, 0.07, 0.1, 0.07);
    combBit(0.1, 0.22, 0.02, 0.07, 0.1, 0.07);
    combBit(0, -0.12, 0.2, 0.06, 0.08, 0.05);
    const beak = mesh(geo.cone, '#ffb022', 0, -0.02, 0.3, 0.08, 0.18, 0.08);
    beak.rotation.x = Math.PI / 2;
    head.add(beak);
    const eyeL = mesh(geo.sphere, '#1a1a1a', 0.12, 0.06, 0.2, 0.045, 0.05, 0.04);
    const eyeR = mesh(geo.sphere, '#1a1a1a', -0.12, 0.06, 0.2, 0.045, 0.05, 0.04);
    const glintL = mesh(geo.sphere, '#ffffff', 0.13, 0.08, 0.23, 0.016, 0.016, 0.016);
    const glintR = mesh(geo.sphere, '#ffffff', -0.11, 0.08, 0.23, 0.016, 0.016, 0.016);
    head.add(eyeL, eyeR, glintL, glintR);
    g.add(head);

    const legL = mesh(geo.box, '#f2a33a', 0.12, 0.18, 0.06, 0.07, 0.32, 0.07);
    const legR = mesh(geo.box, '#f2a33a', -0.12, 0.18, 0.06, 0.07, 0.32, 0.07);
    const footL = mesh(geo.box, '#f2a33a', 0.12, 0.03, 0.12, 0.12, 0.04, 0.18);
    const footR = mesh(geo.box, '#f2a33a', -0.12, 0.03, 0.12, 0.12, 0.04, 0.18);
    g.add(legL, legR, footL, footR);

    g.userData.parts = { shadow: shadow, body: bodyM, tail: tail, wingL: wingL, wingR: wingR, head: head, eyeL: eyeL, eyeR: eyeR, glintL: glintL, glintR: glintR };
    g.userData.look = { body: body, comb: comb };
    g.userData.anim = { kind: null, t: 0, peck: 0, hop: 0, flash: 0, lean: 0, dead: 0, run: false, flap: false, wander: 0, face: 1 };
    return g;
  }

  function shadeHex(color, amt) {
    const c = hex(color);
    c.offsetHSL(0, 0, amt / 255);
    return '#' + c.getHexString();
  }

  function paintChicken(ch, body, comb) {
    if (!ch) return;
    const set = (m, color) => { m.material.color.copy(hex(color)); };
    set(ch.userData.parts.body, body);
    set(ch.userData.parts.tail, shadeHex(body, -22));
    set(ch.userData.parts.wingL, shadeHex(body, -18));
    set(ch.userData.parts.wingR, shadeHex(body, -18));
    const head = ch.userData.parts.head;
    set(head.children[0], body);
    set(head.children[1], comb);
    set(head.children[2], comb);
    set(head.children[3], comb);
    set(head.children[4], comb);
    ch.userData.look = { body: body, comb: comb };
  }

  const me = makeChicken('#fff4e0', '#ff3b3b');
  me.scale.setScalar(BIRD);
  me.position.set(0.25, 0, 0.55);
  root.add(me);
  let foe = null;

  // ---------- farm ----------
  const ground = mesh(geo.plane, '#4caf4a', 0, 0, 0, 26, 1, 20);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);
  const lawn = mesh(geo.circle, '#5dcc55', 0.1, 0.012, 0.2, 7.2, 1, 6.2);
  lawn.rotation.x = -Math.PI / 2;
  root.add(lawn);
  root.add(mesh(geo.box, '#d2b07a', 0.35, 0.02, 0.15, 1.45, 0.03, 5.2));

  function buildBarn() {
    const barn = new THREE.Group();
    barn.position.set(-4.1, 0, -2.7);
    barn.add(mesh(geo.box, '#c0392b', 0, 1.35, 0, 3.4, 2.7, 2.6));
    const roof = mesh(geo.cone, '#8e2a20', 0, 3.15, 0, 2.6, 1.5, 2.2);
    roof.scale.set(2.15, 1, 1.7);
    barn.add(roof);
    barn.add(mesh(geo.box, '#fff6e8', 0, 0.85, 1.32, 1.05, 1.7, 0.08));
    barn.add(mesh(geo.box, '#c0392b', 0, 0.85, 1.36, 0.18, 1.7, 0.06));
    barn.add(mesh(geo.box, '#5a2a10', 1.9, 0.55, 0.2, 1.4, 1.1, 1.5));
    const star = mesh(geo.box, '#ffd34d', 0, 2.55, 1.28, 0.35, 0.35, 0.08);
    star.visible = false;
    barn.add(star);
    barn.userData.star = star;
    return barn;
  }
  const barn = buildBarn();
  root.add(barn);

  function buildCoop() {
    const coop = new THREE.Group();
    coop.position.set(4.15, 0, -2.9);
    coop.add(mesh(geo.box, '#d9a15b', 0, 0.7, 0, 2.2, 1.4, 1.8));
    coop.add(mesh(geo.box, '#b8782f', 0, 1.55, 0, 2.5, 0.18, 2.1));
    coop.add(mesh(geo.box, '#5a2a10', 0, 0.55, 0.92, 0.55, 1.1, 0.08));
    coop.add(mesh(geo.box, '#8a8f99', 0.7, 1.95, 0.2, 0.1, 0.7, 0.1));
    const nest = mesh(geo.sphere, '#c9a36a', 0, 0.16, 1.18, 0.46, 0.12, 0.4);
    const egg = mesh(geo.sphere, '#fff6e8', 0, 0.34, 1.18, 0.13, 0.17, 0.13);
    egg.visible = false;
    coop.add(nest, egg);
    coop.userData.kind = 'egg';
    coop.userData.egg = egg;
    coop.userData.nest = nest;
    return coop;
  }
  const coop = buildCoop();
  root.add(coop);

  const feeder = new THREE.Group();
  feeder.position.set(2.95, 0, 1.85);
  feeder.add(mesh(geo.box, '#9a6b3d', 0, 0.22, 0, 1.3, 0.18, 0.8));
  feeder.add(mesh(geo.sphere, '#ffd34d', 0, 0.34, 0, 0.38, 0.1, 0.26));
  feeder.userData.kind = 'feed';
  root.add(feeder);

  const dummy = new THREE.Group();
  dummy.position.set(-2.95, 0, 1.75);
  dummy.add(mesh(geo.box, '#8b5a2b', 0, 0.45, 0, 0.1, 0.9, 0.1));
  dummy.add(mesh(geo.sphere, '#c45c2a', 0, 1.15, 0, 0.42, 0.5, 0.38));
  dummy.add(mesh(geo.box, '#fff6e8', 0, 1.2, 0.3, 0.28, 0.18, 0.04));
  dummy.userData.kind = 'peck';
  root.add(dummy);

  const posts = new THREE.Group();
  posts.position.set(-2.15, 0, 2.35);
  for (let i = -1; i <= 1; i += 1) posts.add(mesh(geo.box, '#e8d5a6', i * 0.55, 0.38, 0, 0.12, 0.76, 0.12));
  posts.userData.kind = 'dodge';
  root.add(posts);

  const track = new THREE.Group();
  track.position.set(-0.7, 0.03, 0.05);
  const ring = mesh(geo.circle, '#c9a36a', 0, 0.01, 0, 1.7, 1, 1.7);
  ring.rotation.x = -Math.PI / 2;
  const hole = mesh(geo.circle, '#5dcc55', 0, 0.02, 0, 1.28, 1, 1.28);
  hole.rotation.x = -Math.PI / 2;
  track.add(ring, hole);
  track.userData.kind = 'run';
  root.add(track);

  // fence (instanced)
  function instancedBoxes(count, color, place) {
    const im = new THREE.InstancedMesh(geo.box, mat(color), count);
    const d = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      place(d, i);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
    root.add(im);
    return im;
  }
  const fenceN = quality === 'phone' ? 16 : 22;
  instancedBoxes(fenceN, '#e9d3a6', (d, i) => {
    const t = i / (fenceN - 1);
    d.position.set(-6.2 + t * 12.4, 0.45, -4.55);
    d.scale.set(0.12, 0.9, 0.12);
    d.rotation.set(0, 0, 0);
  });
  instancedBoxes(2, '#e9d3a6', (d, i) => {
    d.position.set(0, 0.72 - i * 0.28, -4.55);
    d.scale.set(12.6, 0.08, 0.08);
    d.rotation.set(0, 0, 0);
  });

  const tuftN = quality === 'phone' ? 36 : 70;
  const tufts = new THREE.InstancedMesh(geo.cone, mat('#4ea33a'), tuftN);
  {
    const d = new THREE.Object3D();
    for (let i = 0; i < tuftN; i += 1) {
      d.position.set(-6 + Math.random() * 12, 0.14, -4.2 + Math.random() * 8.4);
      d.rotation.set(0.15, Math.random() * 6, 0);
      const s = 0.55 + Math.random() * 0.7;
      d.scale.set(0.07 * s, 0.28 * s, 0.07 * s);
      d.updateMatrix();
      tufts.setMatrixAt(i, d.matrix);
    }
    tufts.instanceMatrix.needsUpdate = true;
    root.add(tufts);
  }

  const flowerN = quality === 'phone' ? 12 : 22;
  const flowers = new THREE.InstancedMesh(geo.sphere, mat('#ff8ab8'), flowerN);
  {
    const d = new THREE.Object3D();
    for (let i = 0; i < flowerN; i += 1) {
      d.position.set(-5 + Math.random() * 10, 0.2, -3.6 + Math.random() * 7);
      d.scale.setScalar(0.08 + Math.random() * 0.05);
      d.updateMatrix();
      flowers.setMatrixAt(i, d.matrix);
    }
    flowers.instanceMatrix.needsUpdate = true;
    root.add(flowers);
  }

  function tree(x, z) {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    t.add(mesh(geo.box, '#7a4a22', 0, 0.55, 0, 0.28, 1.1, 0.28));
    t.add(mesh(geo.sphere, '#3f9a4a', 0, 1.55, 0, 0.85, 0.7, 0.85));
    t.add(mesh(geo.sphere, '#58b85c', 0.35, 1.35, 0.15, 0.5, 0.42, 0.5));
    root.add(t);
  }
  tree(5.15, -1.35);
  tree(-5.25, 1.15);
  if (quality !== 'phone') tree(4.9, 3.1);
  const pond = mesh(geo.circle, '#3d9adf', 3.55, 0.03, 3.05, 1.15, 1, 0.85);
  pond.rotation.x = -Math.PI / 2;
  root.add(pond);
  root.add(mesh(geo.box, '#e6c15a', -3.7, 0.28, -1.15, 0.7, 0.55, 0.48));
  root.add(mesh(geo.box, '#d4a63c', -3.35, 0.22, -0.7, 0.55, 0.42, 0.4));

  const sunBall = mesh(geo.sphere, '#ffe36b', 11, 9.2, -10, 1.15, 1.15, 1.15);
  root.add(sunBall);
  const clouds = [];
  for (let i = 0; i < 3; i += 1) {
    const cloud = mesh(geo.sphere, '#ffffff', -8 + i * 7, 7.4 + (i % 2), -9.5, 1.6, 0.55, 0.9, { transparent: true, opacity: 0.88 });
    cloud.userData.drift = 4 + i * 2;
    cloud.userData.baseX = cloud.position.x;
    root.add(cloud);
    clouds.push(cloud);
  }

  // garden plots
  const plots = [];
  for (let i = 0; i < 3; i += 1) {
    const p = new THREE.Group();
    p.position.set(-1.45 + i * 1.15, 0, 2.15);
    p.add(mesh(geo.box, '#8a5a32', 0, 0.08, 0, 1.1, 0.16, 1.0));
    const sprout = mesh(geo.cone, '#5dcc55', 0, 0.32, 0, 0.12, 0.42, 0.12);
    const ready = new THREE.Group();
    ready.add(mesh(geo.box, '#6aa334', 0, 0.45, 0, 0.08, 0.7, 0.08));
    ready.add(mesh(geo.sphere, '#ffd34d', 0.12, 0.7, 0.05, 0.12, 0.1, 0.12));
    ready.add(mesh(geo.sphere, '#ffc93c', -0.1, 0.78, -0.04, 0.1, 0.09, 0.1));
    sprout.visible = false;
    ready.visible = false;
    p.add(sprout, ready);
    p.userData.kind = 'plot';
    p.userData.slot = i;
    p.userData.sprout = sprout;
    p.userData.ready = ready;
    plots.push(p);
    root.add(p);
  }

  // ---------- arena ----------
  const arena = new THREE.Group();
  arena.position.set(ARENA_X, 0, 0);
  const grassPad = mesh(geo.circle, '#6fbf4f', 0, 0.0, 0, 8.5, 1, 8.5);
  grassPad.rotation.x = -Math.PI / 2;
  arena.add(grassPad);
  const dirt = mesh(geo.circle, '#d8a86a', 0, 0.03, 0, 3.4, 1, 3.4);
  dirt.rotation.x = -Math.PI / 2;
  arena.add(dirt);
  const inner = mesh(geo.circle, '#c49658', 0, 0.04, 0, 2.4, 1, 2.4);
  inner.rotation.x = -Math.PI / 2;
  arena.add(inner);
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    arena.add(mesh(geo.box, '#8b5a2b', Math.cos(a) * 3.15, 0.42, Math.sin(a) * 3.15, 0.18, 0.84, 0.18));
  }
  const crowdN = quality === 'phone' ? 10 : 16;
  const crowd = new THREE.InstancedMesh(geo.sphere, mat('#6b4f9e'), crowdN);
  {
    const d = new THREE.Object3D();
    for (let i = 0; i < crowdN; i += 1) {
      const a = -0.9 + (i / (crowdN - 1)) * 1.8;
      d.position.set(Math.sin(a) * 4.05, 1.05, -2.15 - Math.cos(a) * 0.35);
      d.scale.set(0.28, 0.34, 0.28);
      d.updateMatrix();
      crowd.setMatrixAt(i, d.matrix);
    }
    crowd.instanceMatrix.needsUpdate = true;
    arena.add(crowd);
  }
  arena.add(mesh(geo.box, '#ffb022', -2.4, 0.7, -1.5, 0.1, 1.4, 0.1));
  arena.add(mesh(geo.sphere, '#ff7a2a', -2.4, 1.5, -1.5, 0.22, 0.22, 0.22));
  arena.add(mesh(geo.box, '#ffb022', 2.4, 0.7, -1.5, 0.1, 1.4, 0.1));
  arena.add(mesh(geo.sphere, '#ff7a2a', 2.4, 1.5, -1.5, 0.22, 0.22, 0.22));
  root.add(arena);

  // pickables
  const pickables = [dummy, posts, track, feeder, coop, plots[0], plots[1], plots[2]];

  // ---------- camera / input ----------
  const look = YARD.look.clone();
  const camTarget = YARD.cam.clone();
  let yaw = 0.46;
  let pitch = 0.36;
  let dist = 8.1;
  let dragging = false;
  let dragDist = 0;
  let lastX = 0;
  let lastY = 0;
  let mode = 'yard';
  let reduceMotion = false;
  let careEnergy = 100;
  let previewing = false;
  let previewKey = '';
  let celebrateT = 0;

  function applyOrbit() {
    const base = (mode === 'fight' || mode === 'preview') ? RING : YARD;
    const focus = base.look;
    const lookK = reduceMotion ? 1 : 0.08;
    const camK = reduceMotion ? 1 : 0.12;
    look.lerp(focus, lookK);
    const x = focus.x + Math.sin(yaw) * dist * Math.cos(pitch);
    const y = focus.y + dist * Math.sin(pitch);
    const z = focus.z + Math.cos(yaw) * dist * Math.cos(pitch);
    camTarget.set(x, y, z);
    camera.position.lerp(camTarget, camK);
    camera.lookAt(look);
  }

  function setMode(next) {
    mode = next;
    if (next === 'fight' || next === 'preview') {
      yaw = 0.1;
      pitch = 0.3;
      dist = 7.0;
    } else {
      yaw = 0.46;
      pitch = 0.36;
      dist = 8.1;
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    dragging = true;
    dragDist = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    if (Math.abs(dx) + Math.abs(dy) < 1) return;
    dragDist += Math.abs(dx) + Math.abs(dy);
    celebrateT = 0;
    yaw -= dx * 0.005;
    pitch = Math.max(0.22, Math.min(0.72, pitch + dy * 0.004));
  });
  function endDrag(e) {
    dragging = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  canvas.addEventListener('click', (e) => {
    if (dragDist > 8) return;
    if (fighting && fighting.done) {
      if (emit.onContinue) emit.onContinue();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickables, true);
    if (!hits.length) return;
    let obj = hits[0].object;
    while (obj && !obj.userData.kind) obj = obj.parent;
    if (!obj || !emit.onPick) return;
    emit.onPick(obj.userData.kind, obj.userData.slot);
  });

  // ---------- animation ----------
  const clock = { t: 0 };
  let fighting = null;
  const BEAT = 0.42;
  const floats = [];
  const parts = [];
  const partPool = [];

  function burst(x, y, z, color, n) {
    const count = quality === 'phone' ? Math.min(n, 6) : n;
    for (let i = 0; i < count; i += 1) {
      const p = partPool.pop() || mesh(geo.box, color, 0, 0, 0, 0.08, 0.08, 0.08);
      p.material = mat(color);
      p.position.set(x, y, z);
      p.userData.vx = (Math.random() - 0.5) * 3.2;
      p.userData.vy = 1.6 + Math.random() * 2.4;
      p.userData.vz = (Math.random() - 0.5) * 3.2;
      p.userData.life = 0.7;
      p.visible = true;
      if (!p.parent) root.add(p);
      parts.push(p);
    }
  }

  function worldToScreen(pos) {
    const v = pos.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * canvas.clientWidth, y: (-v.y * 0.5 + 0.5) * canvas.clientHeight };
  }

  function poseChicken(ch, dt) {
    const a = ch.userData.anim;
    const p = ch.userData.parts;
    a.flash = Math.max(0, a.flash - dt * 4);
    const bob = Math.sin(clock.t * 4 + ch.position.x) * 0.03;
    p.body.position.y = 0.62 + bob + a.hop;
    p.head.position.y = 1.02 + bob + a.hop;
    p.head.rotation.x = a.peck * 0.7;
    p.head.position.z = 0.38 + a.peck * 0.22;
    const flap = a.flap ? Math.sin(clock.t * 18) * 0.55 : Math.sin(clock.t * 3) * 0.08;
    p.wingL.rotation.z = 0.2 + flap;
    p.wingR.rotation.z = -0.2 - flap;
    ch.rotation.z = a.lean + (a.dead ? -a.dead * 1.2 : 0);
    ch.rotation.y = a.face > 0 ? 0.15 : Math.PI - 0.15;
    const sleepy = ch === me && careEnergy < 20 && mode === 'yard';
    const blinkGap = sleepy ? 1.6 : 3.6;
    const blink = (clock.t + ch.position.x) % blinkGap < (sleepy ? 0.22 : 0.12) || a.dead;
    p.eyeL.scale.y = blink ? 0.15 : 1;
    p.eyeR.scale.y = blink ? 0.15 : 1;
    p.glintL.visible = !blink;
    p.glintR.visible = !blink;
    p.body.material.emissive = hex(a.flash > 0 ? '#ffffff' : '#000000');
    p.body.material.emissiveIntensity = a.flash;
  }

  function play(kind, extra) {
    if (previewing && !fighting) hideRival();
    const a = me.userData.anim;
    a.kind = kind;
    a.t = 0;
    a.slot = extra && extra.slot != null ? extra.slot : 0;
  }

  function stepYard(dt) {
    const a = me.userData.anim;
    a.t += dt;
    a.peck = 0;
    a.hop = 0;
    a.run = false;
    a.flap = false;
    a.lean = 0;
    if (a.kind === 'peck') {
      a.peck = Math.max(0, Math.sin(a.t * 22));
      a.face = -1;
      me.position.x += (-2.7 - me.position.x) * Math.min(1, dt * 6);
      me.position.z += (1.75 - me.position.z) * Math.min(1, dt * 6);
      if (a.t > 0.85) a.kind = null;
    } else if (a.kind === 'run') {
      a.run = true;
      a.flap = true;
      const p = a.t / 1.15;
      const ang = p * Math.PI * 2;
      me.position.set(-0.7 + Math.sin(ang) * 1.55, 0, 0.05 + Math.cos(ang) * 1.55);
      a.face = Math.cos(ang) >= 0 ? 1 : -1;
      if (a.t > 1.15) { a.kind = null; me.position.set(0.25, 0, 0.55); a.face = 1; }
    } else if (a.kind === 'dodge') {
      const p = a.t / 0.8;
      a.hop = Math.abs(Math.sin(p * Math.PI * 3)) * 0.45;
      a.flap = a.hop > 0.1;
      me.position.set(-2.15 + Math.sin(p * Math.PI * 3) * 0.45, 0, 2.35);
      if (a.t > 0.8) { a.kind = null; me.position.set(0.25, 0, 0.55); }
    } else if (a.kind === 'eat') {
      me.position.x += (2.75 - me.position.x) * Math.min(1, dt * 5);
      me.position.z += (1.85 - me.position.z) * Math.min(1, dt * 5);
      a.face = 1;
      a.peck = a.t > 0.25 ? Math.max(0, Math.sin(a.t * 20)) : 0;
      if (a.t > 1.15) a.kind = null;
    } else if (a.kind === 'nap') {
      me.position.x += (-3.2 - me.position.x) * Math.min(1, dt * 4);
      me.position.z += (-1.8 - me.position.z) * Math.min(1, dt * 4);
      a.lean = 0.25;
      if (a.t > 1.4) a.kind = null;
    } else if (a.kind === 'level') {
      a.hop = Math.abs(Math.sin(a.t * 9)) * 0.5;
      a.flap = true;
      if (a.t > 1.05) a.kind = null;
    } else if (a.kind === 'harvest' || a.kind === 'plot') {
      const slot = a.slot | 0;
      const tx = -1.45 + slot * 1.15;
      const tz = 2.15;
      me.position.x += (tx - me.position.x) * Math.min(1, dt * 5);
      me.position.z += (tz - me.position.z) * Math.min(1, dt * 5);
      a.face = tx >= me.position.x ? 1 : -1;
      if (a.t > 0.28) a.peck = Math.max(0, Math.sin(a.t * 16));
      if (a.t > 1.0) a.kind = null;
    } else if (a.kind === 'egg') {
      me.position.x += (4.15 - me.position.x) * Math.min(1, dt * 5);
      me.position.z += (-1.7 - me.position.z) * Math.min(1, dt * 5);
      a.face = 1;
      a.peck = a.t > 0.3 ? Math.max(0, Math.sin(a.t * 14)) : 0;
      if (a.t > 1.05) a.kind = null;
    } else {
      const mood = careEnergy < 20 ? 'sleepy' : careEnergy < 50 ? 'hungry' : careEnergy >= 80 ? 'perky' : 'idle';
      const wanderChance = mood === 'sleepy' ? 0.002 : 0.008;
      const walk = mood === 'sleepy' ? 0.35 : mood === 'perky' ? 0.9 : 0.7;
      if (Math.abs(me.position.x - a.wander) < 0.08 && Math.random() < wanderChance) a.wander = -0.6 + Math.random() * 1.6;
      const dx = (a.wander || 0.6) - me.position.x;
      if (mood === 'sleepy') {
        a.lean = 0.32;
        if (Math.abs(dx) > 0.2) {
          me.position.x += Math.sign(dx) * dt * walk;
          a.face = dx > 0 ? 1 : -1;
        }
      } else if (Math.abs(dx) > 0.08) {
        me.position.x += Math.sign(dx) * dt * walk;
        a.face = dx > 0 ? 1 : -1;
        a.run = mood === 'perky';
        if (mood === 'perky') a.hop = Math.abs(Math.sin(clock.t * 6)) * 0.06;
      } else if (mood === 'hungry' && (clock.t % 3.2) < 0.55) {
        a.peck = Math.max(0, Math.sin(clock.t * 16));
        a.face = 1;
      } else if ((clock.t % 5) < 0.45) a.peck = Math.max(0, Math.sin(clock.t * 16));
    }
    poseChicken(me, dt);
    if (foe && !fighting) {
      foe.userData.anim.hop = Math.abs(Math.sin(clock.t * 3.2)) * 0.08;
      poseChicken(foe, dt);
    }
  }

  function ensureFoe(color, comb) {
    if (foe) {
      paintChicken(foe, color, comb);
      if (!foe.parent) root.add(foe);
      return foe;
    }
    foe = makeChicken(color, comb);
    foe.scale.setScalar(BIRD);
    root.add(foe);
    return foe;
  }

  function showRival(color, comb) {
    if (fighting && !fighting.done) return;
    const key = String(color) + '|' + String(comb);
    if (previewing && previewKey === key && foe && mode === 'preview') return;
    previewKey = key;
    previewing = true;
    ensureFoe(color, comb);
    Object.assign(foe.userData.anim, { kind: null, peck: 0, hop: 0, flash: 0, lean: 0, dead: 0, face: -1 });
    foe.position.set(ARENA_X + 1.55, 0, 0.1);
    me.position.set(ARENA_X - 1.55, 0, 0.1);
    Object.assign(me.userData.anim, { kind: null, peck: 0, hop: 0, flash: 0, lean: 0, dead: 0, face: 1 });
    if (!fighting) setMode('preview');
  }

  function hideRival() {
    if (fighting) return;
    previewing = false;
    previewKey = '';
    if (foe) { root.remove(foe); foe = null; }
    me.position.set(0.25, 0, 0.55);
    Object.assign(me.userData.anim, { dead: 0, hop: 0, lean: 0, face: 1, kind: null });
    setMode('yard');
  }

  function startFight(result) {
    previewing = false;
    previewKey = '';
    ensureFoe(result.foe.color, result.foe.comb);
    foe.position.set(ARENA_X + 1.55, 0, 0.1);
    Object.assign(foe.userData.anim, { kind: null, peck: 0, hop: 0, flash: 0, lean: 0, dead: 0, face: -1 });
    me.position.set(ARENA_X - 1.55, 0, 0.1);
    Object.assign(me.userData.anim, { kind: null, peck: 0, hop: 0, flash: 0, lean: 0, dead: 0, face: 1 });
    setMode('fight');
    fighting = {
      result: result,
      i: -1,
      t: 0,
      phase: 'intro',
      maxYou: result.youMax || 100,
      maxFoe: result.foe.hp,
      done: false,
      impact: false,
    };
    if (reduceMotion) {
      fighting.phase = 'end';
      fighting.done = true;
      fighting.i = result.log.length;
      if (emit.onHp) emit.onHp(result.pHp / fighting.maxYou, result.aHp / fighting.maxFoe);
      if (emit.onFightOver) emit.onFightOver(result);
      return;
    }
    if (emit.onBanner) {
      emit.onBanner({
        text: 'VS ' + result.foe.name.toUpperCase(),
        sub: (result.firstSide === 'you' ? 'You' : result.foe.name) + ' is faster — strikes first',
        tap: false,
      });
    }
  }

  function stepFight(dt) {
    const f = fighting;
    if (!f || !foe) return;
    f.t += dt;
    const aMe = me.userData.anim;
    const aFoe = foe.userData.anim;
    aMe.peck = 0;
    aFoe.peck = 0;
    aMe.flap = false;
    aFoe.flap = false;
    const homeMe = ARENA_X - 1.55;
    const homeFoe = ARENA_X + 1.55;
    if (f.phase === 'intro') {
      me.position.x = homeMe;
      foe.position.x = homeFoe;
      aMe.hop = Math.abs(Math.sin(f.t * 8)) * 0.14;
      aFoe.hop = Math.abs(Math.sin(f.t * 8 + 1)) * 0.14;
      if (f.t > 1.25) { f.phase = 'beats'; f.t = 0; f.i = 0; if (emit.onBanner) emit.onBanner(null); aMe.hop = 0; aFoe.hop = 0; }
      poseChicken(me, dt);
      poseChicken(foe, dt);
      return;
    }
    if (f.phase === 'beats') {
      const beat = f.result.log[f.i];
      if (!beat) { endFight(); poseChicken(me, dt); poseChicken(foe, dt); return; }
      const len = beat.kind === 'crit' ? BEAT * 1.5 : BEAT;
      const p = f.t / len;
      const att = beat.who === 'you' ? me : foe;
      const def = beat.who === 'you' ? foe : me;
      const attA = att.userData.anim;
      const defA = def.userData.anim;
      const attHome = beat.who === 'you' ? homeMe : homeFoe;
      const defHome = beat.who === 'you' ? homeFoe : homeMe;
      const dir = beat.who === 'you' ? 1 : -1;
      const lunge = p < 0.45 ? p / 0.45 : p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
      const ease = 1 - (1 - Math.max(0, lunge)) * (1 - Math.max(0, lunge));
      att.position.x = attHome + dir * 1.25 * ease;
      attA.peck = p > 0.35 && p < 0.65 ? 1 : 0;
      attA.flap = p < 0.5;
      attA.face = dir;
      defA.face = -dir;
      if (beat.kind === 'dodge') {
        const h = p > 0.3 && p < 0.8 ? Math.sin((p - 0.3) / 0.5 * Math.PI) : 0;
        defA.hop = h * 0.55;
        def.position.x = defHome + dir * h * 0.45;
        defA.flap = h > 0.1;
      } else {
        const kb = p > 0.45 ? Math.max(0, 1 - (p - 0.45) / 0.4) : 0;
        def.position.x = defHome + dir * kb * 0.28;
        defA.hop = 0;
      }
      if (!f.impact && p >= 0.45) {
        f.impact = true;
        if (beat.kind === 'dodge') {
          if (emit.onSfx) emit.onSfx('dodge');
          if (emit.onFloat) emit.onFloat(worldToScreen(def.position.clone().setY(1.6)), 'DODGE!', '#6fd3ff');
        } else {
          defA.flash = 1;
          if (emit.onHp) emit.onHp(beat.youHp / f.maxYou, beat.foeHp / f.maxFoe);
          const crit = beat.kind === 'crit';
          if (emit.onSfx) emit.onSfx(crit ? 'crit' : 'hit');
          if (emit.onFloat) emit.onFloat(worldToScreen(def.position.clone().setY(1.55)), (crit ? 'CRIT ' : '-') + beat.dmg, crit ? '#ffd34d' : '#ffffff');
          burst(def.position.x, 0.9, def.position.z, crit ? '#ffd34d' : '#ffffff', crit ? 10 : 5);
        }
      }
      if (f.t >= len) {
        f.t = 0; f.i += 1; f.impact = false;
        att.position.x = attHome; def.position.x = defHome; defA.hop = 0;
      }
      poseChicken(me, dt);
      poseChicken(foe, dt);
      return;
    }
    if (f.phase === 'end') {
      const winner = f.result.won ? me : foe;
      const loser = f.result.won ? foe : me;
      if (!reduceMotion) {
        winner.userData.anim.hop = Math.abs(Math.sin(f.t * 9)) * 0.38;
        winner.userData.anim.flap = true;
        loser.userData.anim.dead = Math.min(1, loser.userData.anim.dead + dt * 3);
      }
      poseChicken(me, dt);
      poseChicken(foe, dt);
    }
  }

  function endFight() {
    const f = fighting;
    if (!f || f.phase === 'end') return;
    f.phase = 'end';
    f.t = 0;
    f.done = true;
    me.position.x = ARENA_X - 1.55;
    if (foe) foe.position.x = ARENA_X + 1.55;
    me.userData.anim.hop = 0;
    if (foe) foe.userData.anim.hop = 0;
    if (emit.onHp) emit.onHp(f.result.pHp / f.maxYou, f.result.aHp / f.maxFoe);
    if (emit.onFightOver) emit.onFightOver(f.result);
  }

  function leaveFight() {
    fighting = null;
    previewing = false;
    previewKey = '';
    if (foe) { root.remove(foe); foe = null; }
    me.position.set(0.25, 0, 0.55);
    Object.assign(me.userData.anim, { dead: 0, hop: 0, lean: 0, face: 1, kind: null });
    setMode('yard');
    if (emit.onBanner) emit.onBanner(null);
    if (emit.onHp) emit.onHp(null, null);
  }

  function celebrateChampion() {
    barn.userData.star.visible = true;
    celebrateT = reduceMotion ? 0.2 : 2.4;
    burst(barn.position.x, 2.6, barn.position.z, '#ffd34d', reduceMotion ? 4 : 18);
    yaw = 2.55;
    pitch = 0.4;
    dist = 9.0;
  }

  function resize() {
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  let last = performance.now();
  let hidden = false;
  let slow = 0;
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (!hidden) last = performance.now(); });

  function frame(now) {
    requestAnimationFrame(frame);
    if (hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock.t += dt;
    if (dt > 0.033) slow += 1; else slow = Math.max(0, slow - 1);
    if (slow > 45 && quality !== 'phone') {
      quality = 'phone';
      applyQuality();
    }
    if (mode === 'fight') stepFight(dt);
    else stepYard(dt);
    if (celebrateT > 0) {
      celebrateT -= dt;
      if (celebrateT <= 0 && mode === 'yard') {
        yaw = 0.46;
        pitch = 0.36;
        dist = 8.1;
      }
    }
    applyOrbit();
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const p = parts[i];
      p.userData.life -= dt;
      p.userData.vy -= 6 * dt;
      p.position.x += p.userData.vx * dt;
      p.position.y += p.userData.vy * dt;
      p.position.z += p.userData.vz * dt;
      p.rotation.x += dt * 6;
      if (p.userData.life <= 0) {
        p.visible = false;
        parts.splice(i, 1);
        partPool.push(p);
      }
    }
    for (let i = 0; i < clouds.length; i += 1) {
      const c = clouds[i];
      c.position.x = c.userData.baseX + Math.sin(clock.t * 0.12 * c.userData.drift) * 1.4;
    }
    if (coop.userData.egg && coop.userData.egg.visible && !reduceMotion) {
      coop.userData.egg.position.y = 0.34 + Math.sin(clock.t * 3) * 0.03;
    }
    renderer.render(scene, camera);
  }

  applyQuality();
  resize();
  requestAnimationFrame(frame);
  window.addEventListener('resize', resize);

  return {
    play: play,
    setLook: function (body, comb) { paintChicken(me, body, comb); },
    setGarden: function (states) {
      states.forEach((s, i) => {
        if (!plots[i]) return;
        plots[i].userData.sprout.visible = s === 'growing';
        plots[i].userData.ready.visible = s === 'ready';
      });
    },
    setEgg: function (ready) {
      if (coop.userData.egg) coop.userData.egg.visible = !!ready;
    },
    setCare: function (energy) { careEnergy = Number(energy) || 0; },
    setReduceMotion: function (on) { reduceMotion = !!on; },
    getReduceMotion: function () { return reduceMotion; },
    showRival: showRival,
    hideRival: hideRival,
    setChampion: function (on) { barn.userData.star.visible = !!on; },
    celebrateChampion: celebrateChampion,
    startFight: function (result) { startFight(result); },
    skipFight: function () { if (fighting) endFight(); },
    leaveFight: function () { leaveFight(); },
    fighting: function () { return fighting; },
    burstAtMe: function (color, n) { burst(me.position.x, 1.1, me.position.z, color || '#ffd34d', n || 8); },
    meScreen: function () { return worldToScreen(me.position.clone().setY(1.55)); },
    setQuality: function (q) { quality = q === 'high' ? 'high' : 'phone'; applyQuality(); resize(); },
    getQuality: function () { return quality; },
    resize: resize,
    floats: floats,
  };
}
