import * as THREE from 'three';

// Free low-poly models, authored in code from primitives. No downloads,
// no GLTF, no image files: textures are drawn on a canvas at startup.
// Static props are baked into one vertex-coloured mesh so a whole set of
// them costs a single draw call on phones.

export function createModels(mat, geo, quality) {
  const phone = () => quality() === 'phone';

  function part(geometry, color, x, y, z, sx, sy, sz, extra) {
    const m = new THREE.Mesh(geometry, mat(color, extra));
    m.position.set(x || 0, y || 0, z || 0);
    if (sx != null) m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
    return m;
  }

  // Merge every plain mesh under `group` into one mesh with vertex colours.
  // Transparent or textured meshes are left alone.
  function bake(group) {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const pos = [];
    const nor = [];
    const col = [];
    const keep = [];
    const m4 = new THREE.Matrix4();
    const n3 = new THREE.Matrix3();
    const v = new THREE.Vector3();
    group.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o === group) return;
      const material = o.material;
      if (!material || material.transparent || material.map || !material.color) { keep.push(o); return; }
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      m4.multiplyMatrices(inv, o.matrixWorld);
      n3.getNormalMatrix(m4);
      const p = g.attributes.position;
      const n = g.attributes.normal;
      const c = material.color;
      for (let i = 0; i < p.count; i += 1) {
        v.fromBufferAttribute(p, i).applyMatrix4(m4);
        pos.push(v.x, v.y, v.z);
        v.fromBufferAttribute(n, i).applyMatrix3(n3).normalize();
        nor.push(v.x, v.y, v.z);
        col.push(c.r, c.g, c.b);
      }
      if (g !== o.geometry) g.dispose();
    });
    const out = new THREE.Group();
    out.position.copy(group.position);
    out.rotation.copy(group.rotation);
    out.scale.copy(group.scale);
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    merged.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.add(new THREE.Mesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
    keep.forEach((o) => {
      o.updateMatrixWorld(true);
      const local = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      local.decompose(o.position, o.quaternion, o.scale);
      out.add(o);
    });
    return out;
  }

  // ---------- canvas textures ----------
  function chainTexture() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 64, 64);
    g.strokeStyle = '#c9ced6';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 32); g.lineTo(32, 0); g.lineTo(64, 32); g.lineTo(32, 64); g.closePath();
    g.stroke();
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function logoTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    g.translate(128, 128);
    g.fillStyle = '#b3121b';
    g.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
      g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 118, Math.sin(a) * 118);
    }
    g.closePath();
    g.fill();
    g.fillStyle = '#ffd34d';
    g.textAlign = 'center';
    g.font = '900 54px system-ui, sans-serif';
    g.fillText('CLUCK', 0, -6);
    g.font = '900 64px system-ui, sans-serif';
    g.fillText('FC', 0, 58);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ---------- the cage ----------
  const CAGE_R = 3.6;
  const FENCE_H = 1.5;

  function octagon() {
    const arena = new THREE.Group();
    const statics = new THREE.Group();
    const floor = part(geo.circle, '#1d1828', 0, -0.01, 0, 10, 1, 10);
    floor.rotation.x = -Math.PI / 2;
    statics.add(floor);
    // An 8-sided circle is an octagon. Rotate so a flat side faces the camera.
    const oct = new THREE.CircleGeometry(1, 8);
    const apron = new THREE.Mesh(oct, mat('#111018'));
    apron.scale.set(CAGE_R + 0.45, CAGE_R + 0.45, 1);
    apron.rotation.set(-Math.PI / 2, 0, Math.PI / 8);
    apron.position.y = 0.02;
    statics.add(apron);
    const canvasMat = new THREE.Mesh(oct, mat('#ece6d8'));
    canvasMat.scale.set(CAGE_R, CAGE_R, 1);
    canvasMat.rotation.set(-Math.PI / 2, 0, Math.PI / 8);
    canvasMat.position.y = 0.04;
    statics.add(canvasMat);
    // Base skirt and posts.
    for (let i = 0; i < 8; i += 1) {
      const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
      const x = Math.cos(a) * CAGE_R;
      const z = Math.sin(a) * CAGE_R;
      statics.add(part(geo.cyl, '#15131c', x, FENCE_H / 2 + 0.2, z, 0.09, FENCE_H + 0.4, 0.09));
      statics.add(part(geo.cyl, '#222', x, FENCE_H + 0.42, z, 0.13, 0.12, 0.13));
      const a2 = a + Math.PI / 4;
      const mx = (x + Math.cos(a2) * CAGE_R) / 2;
      const mz = (z + Math.sin(a2) * CAGE_R) / 2;
      const side = 2 * CAGE_R * Math.sin(Math.PI / 8);
      const skirt = part(geo.box, '#1a1724', mx, 0.12, mz, side, 0.24, 0.12);
      skirt.rotation.y = -Math.atan2(mz, mx) + Math.PI / 2;
      statics.add(skirt);
      const pad = part(geo.box, '#0f0e14', mx, FENCE_H + 0.42, mz, side, 0.12, 0.14);
      pad.rotation.y = skirt.rotation.y;
      statics.add(pad);
    }
    // Light rig over the cage.
    const rigY = 5.2;
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2;
      const bar = part(geo.box, '#2c2a33', Math.cos(a) * 2.4, rigY, Math.sin(a) * 2.4, i % 2 ? 0.14 : 4.8, 0.14, i % 2 ? 4.8 : 0.14);
      statics.add(bar);
    }
    // Stands: three stepped tiers around the back three-quarters.
    for (let t = 0; t < 3; t += 1) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(5.2 + t * 0.8, 5.2 + t * 0.8, 0.5, 24, 1, true, Math.PI * 0.75, Math.PI * 1.5), mat('#2b2540'));
      ring.material.side = THREE.DoubleSide;
      ring.position.y = 0.25 + t * 0.45;
      statics.add(ring);
    }
    arena.add(bake(statics));

    // Light boxes glow (MeshBasic ignores lighting).
    const glow = new THREE.MeshBasicMaterial({ color: 0xfff1c4 });
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const l = new THREE.Mesh(geo.box, glow);
      l.position.set(Math.cos(a) * 2.4, 5.05, Math.sin(a) * 2.4);
      l.scale.set(0.35, 0.12, 0.35);
      arena.add(l);
    }

    // Chain-link fence: alpha-tested so it needs no sorting.
    const chain = chainTexture();
    const side = 2 * CAGE_R * Math.sin(Math.PI / 8);
    chain.repeat.set(side * 5, FENCE_H * 5);
    const fenceMat = new THREE.MeshLambertMaterial({ map: chain, alphaTest: 0.4, transparent: false, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i += 1) {
      const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
      const a2 = a + Math.PI / 4;
      const mx = (Math.cos(a) + Math.cos(a2)) / 2 * CAGE_R;
      const mz = (Math.sin(a) + Math.sin(a2)) / 2 * CAGE_R;
      const panel = new THREE.Mesh(geo.plane, fenceMat);
      panel.scale.set(side, FENCE_H, 1);
      panel.position.set(mx, FENCE_H / 2 + 0.3, mz);
      panel.lookAt(0, panel.position.y, 0);
      arena.add(panel);
    }

    // Mat logo.
    const logo = new THREE.Mesh(geo.plane, new THREE.MeshLambertMaterial({ map: logoTexture(), transparent: true, depthWrite: false }));
    logo.rotation.x = -Math.PI / 2;
    logo.position.y = 0.05;
    logo.scale.set(1.9, 1.9, 1);
    arena.add(logo);

    // Crowd: one instanced mesh, coloured per seat.
    const n = phone() ? 42 : 90;
    const crowd = new THREE.InstancedMesh(geo.sphere, new THREE.MeshLambertMaterial({ flatShading: true }), n);
    const d = new THREE.Object3D();
    const shirt = ['#ff5a5f', '#ffc93c', '#4aa8ff', '#a77bff', '#4cd17b', '#fff4e0', '#b5652b', '#ff8ab8'];
    const c = new THREE.Color();
    for (let i = 0; i < n; i += 1) {
      const tier = i % 3;
      const k = Math.floor(i / 3) / Math.ceil(n / 3);
      const a = Math.PI * 0.8 + k * Math.PI * 1.4;
      const r = 5.2 + tier * 0.8;
      d.position.set(Math.cos(a) * r, 0.78 + tier * 0.45, Math.sin(a) * r);
      d.scale.set(0.24, 0.3, 0.24);
      d.updateMatrix();
      crowd.setMatrixAt(i, d.matrix);
      crowd.setColorAt(i, c.set(shirt[(i * 5) % shirt.length]));
    }
    crowd.instanceMatrix.needsUpdate = true;
    if (crowd.instanceColor) crowd.instanceColor.needsUpdate = true;
    const crowdGroup = new THREE.Group();
    crowdGroup.add(crowd);
    arena.add(crowdGroup);

    return { arena: arena, crowd: crowdGroup, radius: CAGE_R };
  }

  // ---------- chicken add-ons ----------
  // Rooster sickle tail: three curved feathers fanned up and back.
  function roosterTail(color) {
    const g = new THREE.Group();
    const dark = '#22382c';
    [[-0.12, dark, 1.25], [0, color, 1.05], [0.12, dark, 0.85]].forEach(([x, col, tilt], i) => {
      const f = part(geo.cone, col, x, 1.0 + i * 0.04, -0.62, 0.09, 0.62, 0.05);
      f.rotation.x = -tilt;
      g.add(f);
    });
    const wattle = part(geo.sphere, '#d12f2f', 0, 0.86, 0.66, 0.07, 0.1, 0.05);
    g.add(wattle);
    return g;
  }

  function crown() {
    const g = new THREE.Group();
    g.add(part(geo.cyl, '#ffd34d', 0, 0, 0, 0.17, 0.08, 0.17));
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      g.add(part(geo.cone, '#ffd34d', Math.cos(a) * 0.14, 0.09, Math.sin(a) * 0.14, 0.045, 0.12, 0.045));
    }
    g.add(part(geo.sphere, '#e0245e', 0, 0.02, 0.17, 0.035, 0.035, 0.02));
    return g;
  }

  // Referee stripes and a bow tie, added to a plain white chicken.
  function refereeKit() {
    const g = new THREE.Group();
    for (let i = -1; i <= 1; i += 1) {
      const s = part(geo.box, '#1a1a1a', 0, 0.62 + i * 0.16, 0.02, 0.98, 0.06, 1.12);
      g.add(s);
    }
    g.add(part(geo.box, '#1a1a1a', 0, 0.92, 0.5, 0.18, 0.08, 0.05));
    return g;
  }

  // Cartoon damage: slashes, a bruise and a swollen eye, revealed in stages.
  function wounds(gore) {
    const g = new THREE.Group();
    const red = gore ? '#b3121b' : '#6b5a52';
    const slash = (x, y, z, rz, len) => {
      const s = part(geo.box, red, x, y, z, 0.035, len, 0.03);
      s.rotation.z = rz;
      s.visible = false;
      g.add(s);
      return s;
    };
    const stages = [
      [slash(0.36, 0.7, 0.36, 0.6, 0.22)],
      [slash(-0.3, 0.6, 0.42, -0.5, 0.26), part(geo.sphere, gore ? '#7a3a6a' : '#5f5470', 0.2, 1.1, 0.48, 0.09, 0.07, 0.04)],
      [slash(0.05, 1.12, 0.6, 0.3, 0.16), part(geo.sphere, gore ? '#8a2a5a' : '#5f5470', 0.12, 1.08, 0.58, 0.07, 0.07, 0.05)],
    ];
    stages.forEach((st) => st.forEach((m) => { m.visible = false; g.add(m); }));
    g.userData.stages = stages;
    return g;
  }

  function xEyes() {
    const g = new THREE.Group();
    [0.12, -0.12].forEach((x) => {
      const a = part(geo.box, '#1a1a1a', x, 0.06, 0.22, 0.14, 0.03, 0.02);
      const b = part(geo.box, '#1a1a1a', x, 0.06, 0.22, 0.14, 0.03, 0.02);
      a.rotation.z = 0.8;
      b.rotation.z = -0.8;
      g.add(a, b);
    });
    g.visible = false;
    return g;
  }

  function dizzyStars() {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i += 1) {
      const s = part(geo.box, '#ffd34d', 0, 0, 0, 0.08, 0.08, 0.08);
      s.rotation.set(0.6, 0.6, 0);
      g.add(s);
    }
    g.visible = false;
    return g;
  }

  // ---------- farm props ----------
  function windmill() {
    const g = new THREE.Group();
    const statics = new THREE.Group();
    const tower = part(geo.cyl, '#e9d3a6', 0, 1.6, 0, 0.32, 3.2, 0.32);
    tower.scale.set(0.42, 3.2, 0.42);
    statics.add(tower);
    statics.add(part(geo.cone, '#8e2a20', 0, 3.45, 0, 0.62, 0.7, 0.62));
    statics.add(part(geo.box, '#5a2a10', 0, 0.45, 0.4, 0.3, 0.6, 0.06));
    g.add(bake(statics));
    const hub = new THREE.Group();
    hub.position.set(0, 2.85, 0.46);
    hub.add(part(geo.sphere, '#5a2a10', 0, 0, 0, 0.12, 0.12, 0.12));
    for (let i = 0; i < 4; i += 1) {
      const blade = new THREE.Group();
      blade.rotation.z = (i / 4) * Math.PI * 2;
      blade.add(part(geo.box, '#7a4a22', 0, 0.7, 0, 0.06, 1.4, 0.04));
      blade.add(part(geo.box, '#fff6e8', 0.13, 0.85, 0, 0.24, 1.0, 0.02));
      hub.add(blade);
    }
    g.add(hub);
    g.userData.blades = hub;
    return g;
  }

  function scarecrow() {
    const g = new THREE.Group();
    g.add(part(geo.box, '#7a4a22', 0, 0.75, 0, 0.07, 1.5, 0.07));
    g.add(part(geo.box, '#7a4a22', 0, 1.15, 0, 1.0, 0.06, 0.06));
    g.add(part(geo.box, '#4a78b8', 0, 1.02, 0, 0.42, 0.5, 0.24));
    g.add(part(geo.box, '#c94f3a', -0.42, 1.15, 0, 0.2, 0.14, 0.14));
    g.add(part(geo.box, '#c94f3a', 0.42, 1.15, 0, 0.2, 0.14, 0.14));
    g.add(part(geo.sphere, '#e6c15a', 0, 1.48, 0, 0.2, 0.2, 0.2));
    g.add(part(geo.cyl, '#8a5a32', 0, 1.66, 0, 0.32, 0.04, 0.32));
    g.add(part(geo.cyl, '#8a5a32', 0, 1.74, 0, 0.15, 0.16, 0.15));
    g.add(part(geo.sphere, '#1a1a1a', 0.07, 1.52, 0.17, 0.025, 0.025, 0.02));
    g.add(part(geo.sphere, '#1a1a1a', -0.07, 1.52, 0.17, 0.025, 0.025, 0.02));
    return bake(g);
  }

  function well() {
    const g = new THREE.Group();
    g.add(part(geo.cyl, '#8f949c', 0, 0.3, 0, 0.5, 0.6, 0.5));
    g.add(part(geo.cyl, '#2b4a6b', 0, 0.61, 0, 0.4, 0.02, 0.4));
    g.add(part(geo.box, '#7a4a22', 0.44, 0.95, 0, 0.07, 1.3, 0.07));
    g.add(part(geo.box, '#7a4a22', -0.44, 0.95, 0, 0.07, 1.3, 0.07));
    const roof = part(geo.cone, '#8e2a20', 0, 1.72, 0, 0.75, 0.5, 0.55);
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    g.add(part(geo.box, '#9a6b3d', 0, 0.92, 0, 0.32, 0.22, 0.22));
    return bake(g);
  }

  function pumpkins(spots) {
    const g = new THREE.Group();
    spots.forEach(([x, z, s]) => {
      g.add(part(geo.sphere, '#ef8a1c', x, 0.18 * s, z, 0.26 * s, 0.2 * s, 0.24 * s));
      g.add(part(geo.box, '#4e7a2a', x, 0.42 * s, z, 0.04, 0.12 * s, 0.04));
    });
    return bake(g);
  }

  function hayRolls(spots) {
    const g = new THREE.Group();
    spots.forEach(([x, z, ry]) => {
      const r = part(geo.cyl, '#e6c15a', x, 0.34, z, 0.36, 0.55, 0.36);
      r.rotation.set(0, ry, Math.PI / 2);
      g.add(r);
      const end = part(geo.cyl, '#d4a63c', x, 0.34, z, 0.3, 0.57, 0.3);
      end.rotation.copy(r.rotation);
      g.add(end);
    });
    return bake(g);
  }

  function mailbox() {
    const g = new THREE.Group();
    g.add(part(geo.box, '#7a4a22', 0, 0.45, 0, 0.07, 0.9, 0.07));
    g.add(part(geo.box, '#c0392b', 0, 0.95, 0, 0.24, 0.2, 0.42));
    g.add(part(geo.box, '#ffd34d', 0.14, 1.05, -0.08, 0.02, 0.18, 0.08));
    return bake(g);
  }

  return {
    bake: bake,
    octagon: octagon,
    roosterTail: roosterTail,
    crown: crown,
    refereeKit: refereeKit,
    wounds: wounds,
    xEyes: xEyes,
    dizzyStars: dizzyStars,
    windmill: windmill,
    scarecrow: scarecrow,
    well: well,
    pumpkins: pumpkins,
    hayRolls: hayRolls,
    mailbox: mailbox,
  };
}
