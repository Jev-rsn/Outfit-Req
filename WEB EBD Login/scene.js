/**
 * MAISON — 3D Scene Module
 * Creates an immersive fashion showroom environment
 * Uses procedural geometry (no external model dependencies)
 */
import * as THREE from 'three';

// Brand colors
const CREAM = 0xFFF8E7;
const DARK_BG = 0x0F0D0E;
const WHITE = 0xFFFFFF;
const BURGUNDY = 0x6D001A;
const BLACK = 0x000000;

export class MaisonScene {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.clock = new THREE.Clock();
    this.animatables = [];
    this.disposed = false;

    // Interactive 3D Clothing Rail state
    this.rackGarments = [];
    this.rackHitBoxes = [];
    this.activeGarmentIndex = 0;
    this.garmentRotY = [0, -1.05, -1.05, -1.05, -1.05, -1.05];
    this.garmentTargetRotY = [0, -1.05, -1.05, -1.05, -1.05, -1.05];
    this.garmentRotZ = [0, 0, 0, 0, 0, 0];
    this.garmentVelZ = [0, 0, 0, 0, 0, 0];
    this.garmentFlipped = [false, false, false, false, false, false];
    this.autoplayActive = true;
    this.autoplayInterval = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initLights();
    this._buildEnvironment();
    this._initRaycasterEvents();
    this.startAutoplay();
    this._onResize = this._handleResize.bind(this);
    window.addEventListener('resize', this._onResize);

    // Sinkronisasi tema Gelap / Terang untuk background 3D
    this._onThemeChange = (e) => this.setTheme(e && e.detail && e.detail.theme);
    window.addEventListener('themechange', this._onThemeChange);
    this.setTheme();
  }

  // ─── Renderer ──────────────────────────────
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(CREAM, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  // ─── Scene ─────────────────────────────────
  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CREAM);
    this.scene.fog = new THREE.Fog(CREAM, 12, 35);
  }

  setTheme(theme) {
    const isDark = theme ? theme === 'dark' : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
    const targetBg = isDark ? DARK_BG : CREAM;
    if (this.renderer) {
      this.renderer.setClearColor(targetBg, 1);
    }
    if (this.scene) {
      this.scene.background = new THREE.Color(targetBg);
      if (this.scene.fog) {
        this.scene.fog.color.setHex(targetBg);
      }
    }
  }

  // ─── Camera ────────────────────────────────
  _initCamera() {
    const aspect = this.width / this.height;
    // Responsive adaptive FOV for mobile portrait screens
    const fov = aspect < 1 ? Math.min(65, 45 + (1 - aspect) * 25) : 45;
    this.camera = new THREE.PerspectiveCamera(
      fov, aspect, 0.1, 100
    );
    // Initial position — wide shot of the showroom
    this.camera.position.set(0, 2.2, 10);
    this.camera.lookAt(0, 1.5, 0);

    // Target position — zoomed in focal point
    this.cameraStart = new THREE.Vector3(0, 2.2, 10);
    this.cameraEnd = new THREE.Vector3(0, 1.8, 2.5);
    this.lookAtStart = new THREE.Vector3(0, 1.5, 0);
    this.lookAtEnd = new THREE.Vector3(0, 1.6, 0);
    this.currentLookAt = new THREE.Vector3(0, 1.5, 0);

    // Mouse parallax
    this.mouseOffset = { x: 0, y: 0 };
    this.currentMouseOffset = { x: 0, y: 0 };
  }

  // ─── Lights ────────────────────────────────
  _initLights() {
    // Warm ambient
    const ambient = new THREE.AmbientLight(0xFFF5E0, 0.5);
    this.scene.add(ambient);

    // Key light — warm directional (sun through window)
    const key = new THREE.DirectionalLight(0xFFF0D4, 1.2);
    key.position.set(5, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    key.shadow.bias = -0.001;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);

    // Fill light — cool side
    const fill = new THREE.DirectionalLight(0xE8E0FF, 0.3);
    fill.position.set(-4, 4, -2);
    this.scene.add(fill);

    // Rim light
    const rim = new THREE.DirectionalLight(0xFFE8D0, 0.4);
    rim.position.set(-2, 3, 8);
    this.scene.add(rim);

    // Accent spot — burgundy tint
    const spot = new THREE.SpotLight(0xFF8899, 0.6, 15, Math.PI / 6, 0.5, 1);
    spot.position.set(2, 5, 3);
    spot.target.position.set(0, 0, 0);
    this.scene.add(spot);
    this.scene.add(spot.target);

    // Hemisphere for overall soft fill
    const hemi = new THREE.HemisphereLight(0xFFF8E7, 0xE8DDD0, 0.35);
    this.scene.add(hemi);
  }

  // ─── Environment ───────────────────────────
  _buildEnvironment() {
    this._createFloor();
    this._createWalls();
    // 3D Clothing Rail Gallery terintegrasi mulus dengan showroom
    this._createClothingRack();
    this._createMannequins();
    this._createDisplayPedestals();
    this._createDecoElements();
    this._createArchElements();
  }

  _mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.7,
      metalness: opts.metalness ?? 0.0,
      ...opts,
    });
  }

  // Floor
  _createFloor() {
    const geo = new THREE.PlaneGeometry(30, 30, 1, 1);
    const mat = this._mat(0xF5EDD8, { roughness: 0.85 });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Subtle floor pattern — thin lines
    const lineGeo = new THREE.PlaneGeometry(30, 0.01);
    const lineMat = this._mat(0xE8DCC8, { roughness: 0.9 });
    for (let i = -10; i <= 10; i += 2) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.001, i);
      this.scene.add(line);
    }
  }

  // Walls
  _createWalls() {
    const wallMat = this._mat(0xFAF3E3, { roughness: 0.9 });

    // Back wall
    const backGeo = new THREE.BoxGeometry(24, 8, 0.15);
    const backWall = new THREE.Mesh(backGeo, wallMat);
    backWall.position.set(0, 4, -5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Left wall
    const sideGeo = new THREE.BoxGeometry(0.15, 8, 16);
    const leftWall = new THREE.Mesh(sideGeo, wallMat);
    leftWall.position.set(-8, 4, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Right wall (partial, with opening)
    const rightWall = new THREE.Mesh(sideGeo, wallMat);
    rightWall.position.set(8, 4, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // Wall molding — horizontal accent strip (burgundy)
    const moldingGeo = new THREE.BoxGeometry(24, 0.06, 0.2);
    const moldingMat = this._mat(BURGUNDY, { roughness: 0.5, metalness: 0.1 });
    const molding = new THREE.Mesh(moldingGeo, moldingMat);
    molding.position.set(0, 3.0, -4.87);
    this.scene.add(molding);

    // Lower chair-rail molding
    const lowerMolding = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.04, 0.18),
      this._mat(0xE8DCC8)
    );
    lowerMolding.position.set(0, 1.0, -4.88);
    this.scene.add(lowerMolding);
  }

  // Clothing Rack (central feature with interactive 3D physics)
  _createClothingRack() {
    const group = new THREE.Group();

    // Rack pole (horizontal bar)
    const poleMat = this._mat(0x1A1A1A, { roughness: 0.25, metalness: 0.85 });
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 3.4, 16),
      poleMat
    );
    pole.rotation.z = Math.PI / 2;
    pole.position.set(0, 2.3, -2);
    pole.castShadow = true;
    group.add(pole);

    // Supports (two vertical stands positioned proportionally)
    for (const x of [-1.6, 1.6]) {
      // Main upright
      const upright = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.022, 2.3, 12),
        poleMat
      );
      upright.position.set(x, 1.15, -2);
      upright.castShadow = true;
      group.add(upright);

      // Base foot
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.038, 24),
        poleMat
      );
      foot.position.set(x, 0.019, -2);
      foot.castShadow = true;
      group.add(foot);
    }

    // 6 Curated signature pieces with generous spacing (Tidak Numpuk!)
    const collectionItems = [
      { type: 'tshirt', color: 0xF3EFE6 },    // Heavyweight Tee · Bone
      { type: 'shirt', color: 0xA2C4D9 },     // Oxford Shirt · Sky Blue
      { type: 'cardigan', color: 0x6B7C52 },  // Knit Cardigan · Olive Earth
      { type: 'hoodie', color: 0x9EA4AA },    // Luxury Hoodie · Heather Grey
      { type: 'henley', color: 0xA8533E },    // Field Henley · Terracotta
      { type: 'sweatshirt', color: 0x222326 } // Minimalist Noir
    ];

    const count = collectionItems.length;
    const spacing = 0.52;
    const startX = -(count - 1) * spacing / 2;

    this.rackGarments = [];
    this.rackHitBoxes = [];

    collectionItems.forEach((item, i) => {
      const gGroup = new THREE.Group();
      const x = startX + i * spacing;

      // 1. Realistic Warm Sienna Wood & Chrome Hanger (No text tag)
      const hanger = this._createHanger(false, '');
      gGroup.add(hanger);

      // 2. Realistic 3D Garment Mesh
      let garmentMesh;
      switch (item.type) {
        case 'cardigan':
          garmentMesh = this._createCardigan(item.color);
          break;
        case 'henley':
          garmentMesh = this._createHenley(item.color);
          break;
        case 'hoodie':
          garmentMesh = this._createHoodie(item.color);
          break;
        case 'sweatshirt':
          garmentMesh = this._createSweatshirt(item.color);
          break;
        case 'shirt':
          garmentMesh = this._createLongSleeveShirt(item.color);
          break;
        case 'tshirt':
        default:
          garmentMesh = this._createOversizedTShirt(item.color);
          break;
      }
      gGroup.add(garmentMesh);

      // 3. Invisible Hit Box for direct 3D Raycasting
      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 1.15, 0.32),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.set(0, -0.45, 0);
      hitBox.userData = { garmentIndex: i };
      gGroup.add(hitBox);
      this.rackHitBoxes.push(hitBox);

      // Initial position & orientation
      gGroup.position.set(x, 2.3, i === 0 ? -1.94 : -2.0);
      gGroup.rotation.y = this.garmentRotY[i];

      this.rackGarments.push(gGroup);
      group.add(gGroup);
    });

    // Dynamic Physics & Spring Sway loop
    let lastTime = 0;
    this.animatables.push({
      update: (t) => {
        const dt = THREE.MathUtils.clamp(t - (lastTime || t - 0.016), 0.001, 0.05);
        lastTime = t;

        for (let i = 0; i < this.rackGarments.length; i++) {
          const g = this.rackGarments[i];

          // Smooth Y rotation to target (front = 0, rest = -1.05, flip = Math.PI)
          this.garmentRotY[i] += (this.garmentTargetRotY[i] - this.garmentRotY[i]) * 0.12;
          g.rotation.y = this.garmentRotY[i];

          // Spring physics on Z axis (pendulum swing)
          const springK = 36.0;
          const damping = 0.88;
          const force = -springK * this.garmentRotZ[i];
          this.garmentVelZ[i] = (this.garmentVelZ[i] + force * dt) * damping;
          this.garmentRotZ[i] += this.garmentVelZ[i] * dt;

          // Subtle organic breathing sway
          const idleSway = Math.sin(t * 0.85 + i * 1.1) * 0.008;
          g.rotation.z = this.garmentRotZ[i] + idleSway;

          // Active garment steps subtly forward for depth focus
          const targetZ = i === this.activeGarmentIndex ? -1.94 : -2.0;
          g.position.z += (targetZ - g.position.z) * 0.1;
        }
      }
    });

    this.scene.add(group);
    this.clothingRack = group;
  }

  // ─── Procedural Garments Builders ───────────

  // Realistic clothes hanger (Warm sienna oak wood + gleaming chrome hook + hang tag)
  _createHanger(isTrouser = false, tagText = '') {
    const hanger = new THREE.Group();
    // Warm sienna wood matching Ruang Kurasi 3D
    const woodMat = this._mat(0xA65E2E, { roughness: 0.32, metalness: 0.06 });
    // Brilliant reflective chrome hook
    const chromeMat = this._mat(0xF4F4F6, { roughness: 0.12, metalness: 0.98 });

    // Metal hook hooking over the horizontal rail
    const hook = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.0042, 10, 24, Math.PI * 1.25),
      chromeMat
    );
    hook.rotation.z = -Math.PI / 4;
    hook.position.set(-0.012, 0.038, 0);
    hook.castShadow = true;
    hanger.add(hook);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0042, 0.0042, 0.045, 10),
      chromeMat
    );
    stem.position.set(0, 0.008, 0);
    hanger.add(stem);

    // Chrome ferrule collar at wood entry
    const ferrule = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.01, 12),
      chromeMat
    );
    ferrule.position.set(0, -0.015, 0);
    hanger.add(ferrule);

    if (!isTrouser) {
      // Contoured shoulder arms for tops with smooth warm wood
      const armLength = 0.23;
      const armAngle = 0.26; // ~15 degrees downward
      const armGeo = new THREE.CylinderGeometry(0.009, 0.013, armLength, 14);

      const leftArm = new THREE.Mesh(armGeo, woodMat);
      leftArm.rotation.z = Math.PI / 2 + armAngle;
      leftArm.position.set(-armLength * 0.48 * Math.cos(armAngle), -0.025 - armLength * 0.48 * Math.sin(armAngle), 0);
      leftArm.castShadow = true;
      hanger.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, woodMat);
      rightArm.rotation.z = -(Math.PI / 2 + armAngle);
      rightArm.position.set(armLength * 0.48 * Math.cos(armAngle), -0.025 - armLength * 0.48 * Math.sin(armAngle), 0);
      rightArm.castShadow = true;
      hanger.add(rightArm);

      // Rounded end caps
      for (const [sx, rot] of [[-1, Math.PI / 2 + armAngle], [1, -(Math.PI / 2 + armAngle)]]) {
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.0125, 10, 10),
          woodMat
        );
        cap.position.set(sx * armLength * 0.95 * Math.cos(armAngle), -0.025 - armLength * 0.95 * Math.sin(armAngle), 0);
        hanger.add(cap);
      }

      // Center neck block
      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.03, 12),
        woodMat
      );
      neck.position.set(0, -0.025, 0);
      hanger.add(neck);

      // Horizontal cross brace
      const crossBrace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.38, 8),
        woodMat
      );
      crossBrace.rotation.z = Math.PI / 2;
      crossBrace.position.set(0, -0.082, 0);
      hanger.add(crossBrace);
    } else {
      // Trouser hanger with horizontal wooden bar
      const bar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.42, 16),
        woodMat
      );
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, -0.08, 0);
      bar.castShadow = true;
      hanger.add(bar);

      for (const sx of [-0.18, 0.18]) {
        const wire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.003, 0.003, 0.065, 8),
          chromeMat
        );
        wire.position.set(sx, -0.05, 0);
        hanger.add(wire);
      }
    }

    // Signature Hang Tag hanging on thread
    if (tagText) {
      const tagGroup = new THREE.Group();
      const threadMat = this._mat(0x333333, { roughness: 0.9 });
      const thread = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0008, 0.0008, 0.08, 4),
        threadMat
      );
      thread.position.set(0.12, -0.06, 0.02);
      thread.rotation.z = -0.35;
      tagGroup.add(thread);

      // Card tag (white cardboard with subtle border shadow)
      const cardMat = this._mat(0xFAF8F5, { roughness: 0.75 });
      const card = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.08, 0.002),
        cardMat
      );
      card.position.set(0.145, -0.11, 0.02);
      card.rotation.z = -0.3;
      card.castShadow = true;
      tagGroup.add(card);

      hanger.add(tagGroup);
    }

    return hanger;
  }

  // ─── Additional Garments from Ruang Kurasi 3D ───

  // Chunky Knit Cardigan with wooden buttons & ribbed trims
  _createCardigan(color) {
    const group = new THREE.Group();
    const fabricMat = this._mat(color, { roughness: 0.95, side: THREE.DoubleSide });
    const ribMat = this._mat(color, { roughness: 0.98 });
    const woodButtonMat = this._mat(0x4A2E18, { roughness: 0.38, metalness: 0.05 });

    // 1. Ribbed V-Neck collar trim
    const vPlacketLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.32, 8),
      ribMat
    );
    vPlacketLeft.position.set(-0.065, -0.15, 0.045);
    vPlacketLeft.rotation.z = -0.38;
    group.add(vPlacketLeft);

    const vPlacketRight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.32, 8),
      ribMat
    );
    vPlacketRight.position.set(0.065, -0.15, 0.045);
    vPlacketRight.rotation.z = 0.38;
    group.add(vPlacketRight);

    // Center vertical button placket
    const centerPlacket = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.58, 0.015),
      ribMat
    );
    centerPlacket.position.set(0, -0.58, 0.045);
    group.add(centerPlacket);

    // 4 Wooden Buttons
    for (let b = 0; b < 4; b++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.006, 12),
        woodButtonMat
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, -0.33 - b * 0.15, 0.054);
      group.add(btn);
    }

    // 2. Torso body with chunky drape
    const bodyGeo = new THREE.BoxGeometry(0.48, 0.84, 0.09, 2, 4, 2);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > 0.20) {
        pos.setY(i, y - (Math.abs(x) / 0.24) * 0.055);
      }
    }
    pos.needsUpdate = true;
    bodyGeo.computeVertexNormals();

    const body = new THREE.Mesh(bodyGeo, fabricMat);
    body.position.set(0, -0.49, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 3. Patch pockets on lower left & right
    for (const sx of [-0.13, 0.13]) {
      const pocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.13, 0.01),
        fabricMat
      );
      pocket.position.set(sx, -0.66, 0.05);
      group.add(pocket);
    }

    // 4. Sleeves with chunky knit cuffs
    const sleeveLen = 0.74;
    const sleeveR = 0.07;
    for (const sx of [-0.27, 0.27]) {
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR, sleeveR * 0.9, sleeveLen, 16),
        fabricMat
      );
      sleeve.position.set(sx, -0.44, 0);
      sleeve.castShadow = true;
      group.add(sleeve);

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR * 0.92, sleeveR * 0.92, 0.06, 16),
        ribMat
      );
      cuff.position.set(sx, -0.44 - sleeveLen / 2 + 0.03, 0);
      group.add(cuff);
    }

    // 5. Ribbed hem
    const hem = new THREE.Mesh(
      new THREE.BoxGeometry(0.485, 0.06, 0.095),
      ribMat
    );
    hem.position.set(0, -0.91, 0);
    hem.castShadow = true;
    group.add(hem);

    return group;
  }

  // Piqué Polo Shirt with collar & 2-button placket
  _createPolo(color) {
    const group = new THREE.Group();
    const fabricMat = this._mat(color, { roughness: 0.88, side: THREE.DoubleSide });
    const ribMat = this._mat(color, { roughness: 0.92 });
    const buttonMat = this._mat(0xF4F4F5, { roughness: 0.3, metalness: 0.1 });

    // 1. Polo ribbed collar
    const collarBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.075, 0.035, 16, 1, true),
      ribMat
    );
    collarBand.position.set(0, -0.06, 0);
    group.add(collarBand);

    for (const sx of [-0.04, 0.04]) {
      const point = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.055, 0.01),
        ribMat
      );
      point.position.set(sx, -0.082, 0.042);
      point.rotation.z = (sx > 0 ? -1 : 1) * 0.4;
      group.add(point);
    }

    // 2. 2-Button front placket
    const placket = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, 0.22, 0.01),
      ribMat
    );
    placket.position.set(0, -0.16, 0.042);
    group.add(placket);

    for (let b = 0; b < 2; b++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.003, 10),
        buttonMat
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, -0.11 - b * 0.07, 0.048);
      group.add(btn);
    }

    // 3. Body
    const bodyGeo = new THREE.BoxGeometry(0.47, 0.80, 0.076, 2, 4, 2);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > 0.20) pos.setY(i, y - (Math.abs(x) / 0.24) * 0.06);
    }
    pos.needsUpdate = true;
    bodyGeo.computeVertexNormals();

    const body = new THREE.Mesh(bodyGeo, fabricMat);
    body.position.set(0, -0.47, 0);
    body.castShadow = true;
    group.add(body);

    // 4. Short sleeves with ribbed armbands
    const sleeveLength = 0.24;
    const sleeveRadius = 0.074;
    for (const [sx, rot] of [[-0.28, Math.PI / 5], [0.28, -Math.PI / 5]]) {
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveRadius * 0.95, sleeveRadius, sleeveLength, 16, 1, true),
        fabricMat
      );
      sleeve.position.set(sx, -0.19, 0);
      sleeve.rotation.z = rot;
      sleeve.castShadow = true;
      group.add(sleeve);

      const cuff = new THREE.Mesh(
        new THREE.TorusGeometry(sleeveRadius, 0.008, 8, 20),
        ribMat
      );
      cuff.position.set(sx + Math.sin(rot) * sleeveLength * 0.48, -0.19 - Math.cos(rot) * sleeveLength * 0.48, 0);
      cuff.rotation.x = Math.PI / 2;
      cuff.rotation.y = rot;
      group.add(cuff);
    }

    // 5. Hem
    const hem = new THREE.Mesh(
      new THREE.BoxGeometry(0.475, 0.035, 0.08),
      fabricMat
    );
    hem.position.set(0, -0.87, 0);
    group.add(hem);

    return group;
  }

  // Henley with 3-button placket & long sleeves
  _createHenley(color) {
    const group = new THREE.Group();
    const fabricMat = this._mat(color, { roughness: 0.9, side: THREE.DoubleSide });
    const ribMat = this._mat(color, { roughness: 0.95 });
    const buttonMat = this._mat(0xEAE4D8, { roughness: 0.35, metalness: 0.1 });

    // Crewneck collar
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.072, 0.012, 10, 24),
      ribMat
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, -0.065, 0);
    group.add(collar);

    // 3-Button Placket
    const placket = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.26, 0.01),
      ribMat
    );
    placket.position.set(0, -0.18, 0.044);
    group.add(placket);

    for (let b = 0; b < 3; b++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.003, 10),
        buttonMat
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, -0.10 - b * 0.075, 0.05);
      group.add(btn);
    }

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.45, 0.82, 0.08, 2, 4, 2);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > 0.20) pos.setY(i, y - (Math.abs(x) / 0.22) * 0.055);
    }
    pos.needsUpdate = true;
    bodyGeo.computeVertexNormals();

    const body = new THREE.Mesh(bodyGeo, fabricMat);
    body.position.set(0, -0.48, 0);
    body.castShadow = true;
    group.add(body);

    // Long sleeves
    const sleeveLen = 0.74;
    const sleeveR = 0.065;
    for (const sx of [-0.255, 0.255]) {
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR, sleeveR * 0.88, sleeveLen, 16),
        fabricMat
      );
      sleeve.position.set(sx, -0.44, 0);
      sleeve.castShadow = true;
      group.add(sleeve);

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR * 0.9, sleeveR * 0.9, 0.05, 16),
        ribMat
      );
      cuff.position.set(sx, -0.44 - sleeveLen / 2 + 0.025, 0);
      group.add(cuff);
    }

    return group;
  }

  // Breton stripe long sleeve shirt (ecru with horizontal navy stripes)
  _createBreton(color) {
    const group = new THREE.Group();
    const ecruMat = this._mat(color, { roughness: 0.88, side: THREE.DoubleSide });
    const navyMat = this._mat(0x1A2840, { roughness: 0.88, side: THREE.DoubleSide });

    // Boatneck collar
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.082, 0.01, 8, 24),
      ecruMat
    );
    collar.scale.set(1.25, 0.8, 1);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, -0.065, 0);
    group.add(collar);

    // Main ecru body
    const bodyGeo = new THREE.BoxGeometry(0.46, 0.82, 0.078, 2, 4, 2);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > 0.20) pos.setY(i, y - (Math.abs(x) / 0.23) * 0.055);
    }
    pos.needsUpdate = true;
    bodyGeo.computeVertexNormals();

    const body = new THREE.Mesh(bodyGeo, ecruMat);
    body.position.set(0, -0.48, 0);
    body.castShadow = true;
    group.add(body);

    // Navy horizontal stripe bands
    for (let s = 0; s < 7; s++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.466, 0.032, 0.082),
        navyMat
      );
      stripe.position.set(0, -0.28 - s * 0.085, 0);
      group.add(stripe);
    }

    // Long sleeves
    const sleeveLen = 0.74;
    const sleeveR = 0.068;
    for (const sx of [-0.26, 0.26]) {
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR, sleeveR * 0.88, sleeveLen, 16),
        ecruMat
      );
      sleeve.position.set(sx, -0.44, 0);
      sleeve.castShadow = true;
      group.add(sleeve);

      // Sleeve stripes
      for (let ss = 0; ss < 5; ss++) {
        const sStripe = new THREE.Mesh(
          new THREE.CylinderGeometry(sleeveR * 0.99, sleeveR * 0.99, 0.03, 16),
          navyMat
        );
        sStripe.position.set(sx, -0.28 - ss * 0.09, 0);
        group.add(sStripe);
      }
    }

    return group;
  }

  // Oversized T-Shirt (elongated relaxed luxury cut)
  _createOversizedTShirt(color) {
    const group = new THREE.Group();
    const fabricMat = this._mat(color, { roughness: 0.88, side: THREE.DoubleSide });
    const ribMat = this._mat(color, { roughness: 0.95 });

    // 1. Crewneck ribbed collar
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.075, 0.012, 10, 28),
      ribMat
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, -0.062, 0);
    collar.castShadow = true;
    group.add(collar);

    // 2. Elongated torso body with sloped shoulders and relaxed drape
    const bodyGeo = new THREE.BoxGeometry(0.48, 0.80, 0.075, 2, 4, 2);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (y > 0.20) {
        const factor = Math.abs(x) / 0.24;
        pos.setY(i, y - factor * 0.06);
      }
      if (Math.abs(z) > 0.01) {
        pos.setZ(i, z * (1 + (1 - Math.abs(x) / 0.24) * 0.18));
      }
    }
    pos.needsUpdate = true;
    bodyGeo.computeVertexNormals();

    const body = new THREE.Mesh(bodyGeo, fabricMat);
    body.position.set(0, -0.47, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 3. Dropped short sleeves (wide, angled downwards)
    const sleeveLength = 0.26;
    const sleeveRadius = 0.078;
    const sleeveGeo = new THREE.CylinderGeometry(sleeveRadius * 0.95, sleeveRadius, sleeveLength, 16, 1, true);

    const leftSleeve = new THREE.Mesh(sleeveGeo, fabricMat);
    leftSleeve.position.set(-0.29, -0.19, 0);
    leftSleeve.rotation.z = Math.PI / 5;
    leftSleeve.castShadow = true;
    group.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, fabricMat);
    rightSleeve.position.set(0.29, -0.19, 0);
    rightSleeve.rotation.z = -Math.PI / 5;
    rightSleeve.castShadow = true;
    group.add(rightSleeve);

    // Sleeve hem bands
    for (const [sx, rot] of [[-0.29, Math.PI / 5], [0.29, -Math.PI / 5]]) {
      const cuff = new THREE.Mesh(
        new THREE.TorusGeometry(sleeveRadius, 0.007, 8, 20),
        ribMat
      );
      cuff.position.set(sx + Math.sin(rot) * sleeveLength * 0.48, -0.19 - Math.cos(rot) * sleeveLength * 0.48, 0);
      cuff.rotation.x = Math.PI / 2;
      cuff.rotation.y = rot;
      group.add(cuff);
    }

    // 4. Ribbed bottom hem
    const hem = new THREE.Mesh(
      new THREE.BoxGeometry(0.485, 0.04, 0.08),
      ribMat
    );
    hem.position.set(0, -0.87, 0);
    hem.castShadow = true;
    group.add(hem);

    return group;
  }

  // Luxury Hoodie with 3D draped hood, drawstrings, kangaroo pocket (full length)
  _createHoodie(color) {
    const group = new THREE.Group();
    const fabricMat = this._mat(color, { roughness: 0.92, side: THREE.DoubleSide });
    const ribMat = this._mat(color, { roughness: 0.95 });
    const metalMat = this._mat(0x888888, { roughness: 0.25, metalness: 0.9 });

    // 1. Draped 3D Hood at back of neck
    const hoodGroup = new THREE.Group();
    const hoodGeo = new THREE.SphereGeometry(0.13, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.7);
    const hood = new THREE.Mesh(hoodGeo, fabricMat);
    hood.scale.set(0.9, 1.1, 0.75);
    hood.rotation.x = Math.PI / 3;
    hood.position.set(0, -0.01, -0.06);
    hood.castShadow = true;
    hoodGroup.add(hood);

    const hoodRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.082, 0.014, 10, 24),
      fabricMat
    );
    hoodRim.rotation.x = Math.PI / 2;
    hoodRim.position.set(0, -0.06, 0.01);
    hoodRim.castShadow = true;
    hoodGroup.add(hoodRim);
    group.add(hoodGroup);

    // 2. Drawstrings with metallic aglets
    for (const [xOffset, length] of [[-0.038, 0.24], [0.038, 0.22]]) {
      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0028, 0.0028, length, 8),
        ribMat
      );
      cord.position.set(xOffset, -0.075 - length / 2, 0.055);
      group.add(cord);

      const aglet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0035, 0.0035, 0.018, 8),
        metalMat
      );
      aglet.position.set(xOffset, -0.075 - length + 0.009, 0.055);
      group.add(aglet);
    }

    // 3. Elongated torso body
    const bodyGeo = new THREE.BoxGeometry(0.47, 0.84, 0.095, 2, 4, 2);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > 0.22) {
        pos.setY(i, y - (Math.abs(x) / 0.24) * 0.06);
      }
    }
    pos.needsUpdate = true;
    bodyGeo.computeVertexNormals();

    const body = new THREE.Mesh(bodyGeo, fabricMat);
    body.position.set(0, -0.49, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 4. Front kangaroo pocket
    const pocketGeo = new THREE.BoxGeometry(0.28, 0.18, 0.024);
    const pocket = new THREE.Mesh(pocketGeo, fabricMat);
    pocket.position.set(0, -0.58, 0.056);
    pocket.castShadow = true;
    group.add(pocket);

    for (const sx of [-0.135, 0.135]) {
      const trim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.16, 8),
        ribMat
      );
      trim.position.set(sx, -0.58, 0.062);
      trim.rotation.z = (sx > 0 ? -1 : 1) * 0.2;
      group.add(trim);
    }

    // 5. Full-length sleeves with cuffs
    const sleeveLen = 0.76;
    const sleeveR = 0.072;
    for (const sx of [-0.265, 0.265]) {
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR * 0.95, sleeveR * 0.85, sleeveLen, 16),
        fabricMat
      );
      sleeve.position.set(sx, -0.45, 0);
      sleeve.rotation.z = (sx > 0 ? -1 : 1) * 0.035;
      sleeve.castShadow = true;
      group.add(sleeve);

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR * 0.86, sleeveR * 0.86, 0.055, 16),
        ribMat
      );
      cuff.position.set(sx, -0.45 - sleeveLen / 2 + 0.027, 0);
      group.add(cuff);
    }

    // 6. Ribbed waistband hem
    const waistband = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.06, 0.098),
      ribMat
    );
    waistband.position.set(0, -0.91, 0);
    waistband.castShadow = true;
    group.add(waistband);

    return group;
  }

  // Minimalist Sweatshirt (Crewneck, elongated relaxed fit)
  _createSweatshirt(color) {
    const group = new THREE.Group();
    const fabricMat = this._mat(color, { roughness: 0.9, side: THREE.DoubleSide });
    const ribMat = this._mat(color, { roughness: 0.95 });

    // 1. Ribbed crewneck collar
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.072, 0.013, 10, 24),
      ribMat
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, -0.065, 0);
    collar.castShadow = true;
    group.add(collar);

    // 2. Triangle V-stitch detail below front collar
    const vStitch = new THREE.Mesh(
      new THREE.ConeGeometry(0.024, 0.035, 3),
      ribMat
    );
    vStitch.rotation.z = Math.PI;
    vStitch.position.set(0, -0.098, 0.045);
    group.add(vStitch);

    // 3. Elongated torso body
    const bodyGeo = new THREE.BoxGeometry(0.45, 0.82, 0.085, 2, 4, 2);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > 0.20) {
        pos.setY(i, y - (Math.abs(x) / 0.22) * 0.055);
      }
    }
    pos.needsUpdate = true;
    bodyGeo.computeVertexNormals();

    const body = new THREE.Mesh(bodyGeo, fabricMat);
    body.position.set(0, -0.48, 0);
    body.castShadow = true;
    group.add(body);

    // 4. Long sleeves with ribbed cuffs
    const sleeveLen = 0.74;
    const sleeveR = 0.068;
    for (const sx of [-0.255, 0.255]) {
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR, sleeveR * 0.88, sleeveLen, 16),
        fabricMat
      );
      sleeve.position.set(sx, -0.44, 0);
      sleeve.castShadow = true;
      group.add(sleeve);

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR * 0.89, sleeveR * 0.89, 0.05, 16),
        ribMat
      );
      cuff.position.set(sx, -0.44 - sleeveLen / 2 + 0.025, 0);
      group.add(cuff);
    }

    // 5. Ribbed bottom waistband
    const waistband = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.055, 0.088),
      ribMat
    );
    waistband.position.set(0, -0.89, 0);
    waistband.castShadow = true;
    group.add(waistband);

    return group;
  }

  // Tailored Long-Sleeve Shirt with collar & placket (full length)
  _createLongSleeveShirt(color) {
    const group = new THREE.Group();
    const fabricMat = this._mat(color, { roughness: 0.82, side: THREE.DoubleSide });
    const accentMat = this._mat(color === WHITE ? 0xEFEFEF : 0xE5DEC9, { roughness: 0.7 });
    const buttonMat = this._mat(0xEAE6DD, { roughness: 0.3, metalness: 0.2 });

    // 1. Folded shirt collar with points
    const collarBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.072, 0.035, 16, 1, true),
      fabricMat
    );
    collarBand.position.set(0, -0.06, 0);
    group.add(collarBand);

    for (const sx of [-0.035, 0.035]) {
      const point = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.05, 0.01),
        fabricMat
      );
      point.position.set(sx, -0.082, 0.042);
      point.rotation.z = (sx > 0 ? -1 : 1) * 0.35;
      group.add(point);
    }

    // 2. Elongated torso body with curved shirt-tail hem
    const bodyGeo = new THREE.BoxGeometry(0.43, 0.84, 0.072, 2, 4, 2);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > 0.20) {
        pos.setY(i, y - (Math.abs(x) / 0.21) * 0.055);
      }
      if (y < -0.25) {
        const factor = (Math.abs(x) / 0.21);
        pos.setY(i, y + factor * 0.035);
      }
    }
    pos.needsUpdate = true;
    bodyGeo.computeVertexNormals();

    const body = new THREE.Mesh(bodyGeo, fabricMat);
    body.position.set(0, -0.49, 0);
    body.castShadow = true;
    group.add(body);

    // 3. Front button placket
    const placket = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.83, 0.01),
      accentMat
    );
    placket.position.set(0, -0.49, 0.04);
    group.add(placket);

    // 6 delicate buttons
    for (let b = 0; b < 6; b++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.003, 10),
        buttonMat
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0, -0.13 - b * 0.13, 0.046);
      group.add(btn);
    }

    // 4. Chest patch pocket on left
    const pocket = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.095, 0.005),
      fabricMat
    );
    pocket.position.set(-0.11, -0.28, 0.04);
    group.add(pocket);

    // 5. Tailored sleeves with buttoned cuffs
    const sleeveLen = 0.75;
    const sleeveR = 0.06;
    for (const sx of [-0.245, 0.245]) {
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR, sleeveR * 0.85, sleeveLen, 16),
        fabricMat
      );
      sleeve.position.set(sx, -0.45, 0);
      sleeve.castShadow = true;
      group.add(sleeve);

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR * 0.88, sleeveR * 0.88, 0.05, 16),
        accentMat
      );
      cuff.position.set(sx, -0.45 - sleeveLen / 2 + 0.025, 0);
      group.add(cuff);
    }

    return group;
  }

  // Minimalist Jacket with metal zip, slider, and welt pockets (full tailored length)
  _createMinimalistJacket(color) {
    const group = new THREE.Group();
    const fabricMat = this._mat(color, { roughness: 0.72, metalness: 0.05, side: THREE.DoubleSide });
    const ribMat = this._mat(color, { roughness: 0.85 });
    const metalMat = this._mat(0xB0B0B0, { roughness: 0.2, metalness: 0.95 });

    // 1. Stand collar band
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.082, 0.045, 18, 1, true),
      ribMat
    );
    collar.position.set(0, -0.055, 0);
    collar.castShadow = true;
    group.add(collar);

    // 2. Structured elongated jacket body
    const bodyGeo = new THREE.BoxGeometry(0.49, 0.86, 0.105, 2, 4, 2);
    const pos = bodyGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (y > 0.20) {
        pos.setY(i, y - (Math.abs(x) / 0.24) * 0.05);
      }
    }
    pos.needsUpdate = true;
    bodyGeo.computeVertexNormals();

    const body = new THREE.Mesh(bodyGeo, fabricMat);
    body.position.set(0, -0.50, 0);
    body.castShadow = true;
    group.add(body);

    // 3. Metallic center zipper track & slider
    const zipTrack = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.85, 0.01),
      metalMat
    );
    zipTrack.position.set(0, -0.50, 0.056);
    group.add(zipTrack);

    const slider = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.03, 0.016),
      metalMat
    );
    slider.position.set(0, -0.32, 0.063);
    group.add(slider);

    // 4. Welt side pockets
    for (const sx of [-0.14, 0.14]) {
      const welt = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.015, 0.01),
        ribMat
      );
      welt.position.set(sx, -0.58, 0.055);
      welt.rotation.z = (sx > 0 ? -1 : 1) * 0.1;
      group.add(welt);
    }

    // 5. Structured jacket sleeves
    const sleeveLen = 0.78;
    const sleeveR = 0.072;
    for (const sx of [-0.28, 0.28]) {
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR * 0.98, sleeveR * 0.88, sleeveLen, 16),
        fabricMat
      );
      sleeve.position.set(sx, -0.46, 0);
      sleeve.castShadow = true;
      group.add(sleeve);

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(sleeveR * 0.9, sleeveR * 0.9, 0.05, 16),
        ribMat
      );
      cuff.position.set(sx, -0.46 - sleeveLen / 2 + 0.025, 0);
      group.add(cuff);
    }

    // 6. Jacket waist hem band
    const hem = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.055, 0.108),
      ribMat
    );
    hem.position.set(0, -0.93, 0);
    hem.castShadow = true;
    group.add(hem);

    return group;
  }

  // Tailored Trousers folded over trouser hanger bar (full tailored length)
  _createTrousers(color) {
    const group = new THREE.Group();
    const fabricMat = this._mat(color, { roughness: 0.8, side: THREE.DoubleSide });
    const foldMat = this._mat(color, { roughness: 0.85, side: THREE.DoubleSide });
    const creaseMat = this._mat(color === BURGUNDY ? 0x580015 : 0x080808, { roughness: 0.6 });

    // 1. Folded fabric draped over the hanger crossbar (y = -0.08)
    const foldGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.36, 16, 1, false, 0, Math.PI);
    const fold = new THREE.Mesh(foldGeo, foldMat);
    fold.rotation.z = Math.PI / 2;
    fold.position.set(0, -0.078, 0);
    fold.castShadow = true;
    group.add(fold);

    // 2. Two tailored legs hanging down (front & back drapes, full length)
    const legWidth = 0.155;
    const legHeight = 0.88;
    const legDepth = 0.038;

    for (const sx of [-0.088, 0.088]) {
      const legGeo = new THREE.BoxGeometry(legWidth, legHeight, legDepth);
      const leg = new THREE.Mesh(legGeo, fabricMat);
      leg.position.set(sx, -0.078 - legHeight / 2, 0);
      leg.castShadow = true;
      group.add(leg);

      // Sharp pressed center crease down front of leg
      const crease = new THREE.Mesh(
        new THREE.BoxGeometry(0.005, legHeight * 0.96, 0.006),
        creaseMat
      );
      crease.position.set(sx, -0.078 - legHeight / 2, legDepth / 2 + 0.002);
      group.add(crease);

      // Tailored turn-up hem cuff at bottom of each leg
      const cuff = new THREE.Mesh(
        new THREE.BoxGeometry(legWidth + 0.006, 0.038, legDepth + 0.006),
        fabricMat
      );
      cuff.position.set(sx, -0.078 - legHeight + 0.019, 0);
      cuff.castShadow = true;
      group.add(cuff);
    }

    // 3. Tailored waistband and belt loop accents visible near top fold
    const waistband = new THREE.Mesh(
      new THREE.BoxGeometry(0.365, 0.035, legDepth + 0.008),
      fabricMat
    );
    waistband.position.set(0, -0.11, 0);
    group.add(waistband);

    // Subtle belt loops
    for (const bx of [-0.14, -0.05, 0.05, 0.14]) {
      const loop = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.038, 0.005),
        fabricMat
      );
      loop.position.set(bx, -0.11, legDepth / 2 + 0.005);
      group.add(loop);
    }

    return group;
  }

  // Mannequins
  _createMannequins() {
    const createMannequin = (x, z, rotY, dressColor) => {
      const group = new THREE.Group();

      // Body (elongated capsule shape)
      const torsoGeo = new THREE.CylinderGeometry(0.18, 0.15, 1.2, 16);
      const torsoMat = this._mat(0xF0E8D8, { roughness: 0.6 });
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.y = 1.8;
      torso.castShadow = true;
      group.add(torso);

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 12),
        torsoMat
      );
      head.position.y = 2.55;
      head.castShadow = true;
      group.add(head);

      // Neck
      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 0.15, 8),
        torsoMat
      );
      neck.position.y = 2.42;
      group.add(neck);

      // Dress / outfit (cone-shaped skirt)
      const dressGeo = new THREE.CylinderGeometry(0.17, 0.38, 1.0, 24);
      const dressMat = this._mat(dressColor, { roughness: 0.75 });
      const dress = new THREE.Mesh(dressGeo, dressMat);
      dress.position.y = 0.9;
      dress.castShadow = true;
      group.add(dress);

      // Stand
      const standMat = this._mat(0x1A1A1A, { roughness: 0.3, metalness: 0.7 });
      const standPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.4, 8),
        standMat
      );
      standPole.position.y = 0.2;
      group.add(standPole);

      const standBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.2, 0.03, 24),
        standMat
      );
      standBase.position.y = 0.015;
      standBase.castShadow = true;
      group.add(standBase);

      group.position.set(x, 0, z);
      group.rotation.y = rotY;
      this.scene.add(group);
      return group;
    };

    createMannequin(-3.5, -3, 0.3, 0xFAF5ED);     // cream dress
    createMannequin(3.5, -3.5, -0.25, BURGUNDY);   // burgundy dress
    createMannequin(-5.5, -1, 0.5, 0x1A1A1A);      // black dress
  }

  // Display pedestals
  _createDisplayPedestals() {
    const pedMat = this._mat(WHITE, { roughness: 0.4 });

    // Left pedestal
    const ped1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.6, 32),
      pedMat
    );
    ped1.position.set(-2.5, 0.3, 1.5);
    ped1.castShadow = true;
    ped1.receiveShadow = true;
    this.scene.add(ped1);

    // Object on pedestal (bag-like shape)
    const bag = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.25, 0.15, 1, 1, 1),
      this._mat(BURGUNDY, { roughness: 0.5 })
    );
    bag.position.set(-2.5, 0.72, 1.5);
    bag.rotation.y = 0.3;
    bag.castShadow = true;
    this.scene.add(bag);

    // Handle
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.01, 8, 16, Math.PI),
      this._mat(0x1A1A1A, { roughness: 0.3, metalness: 0.6 })
    );
    handle.position.set(-2.5, 0.9, 1.5);
    handle.rotation.y = 0.3;
    this.scene.add(handle);

    // Right pedestal
    const ped2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.8, 0.5),
      pedMat
    );
    ped2.position.set(3, 0.4, 2);
    ped2.castShadow = true;
    ped2.receiveShadow = true;
    this.scene.add(ped2);

    // Vase on pedestal
    const vasePts = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const r = 0.06 + Math.sin(t * Math.PI) * 0.06 + t * 0.02;
      vasePts.push(new THREE.Vector2(r, t * 0.4));
    }
    const vase = new THREE.Mesh(
      new THREE.LatheGeometry(vasePts, 24),
      this._mat(0xF0E8D8, { roughness: 0.3 })
    );
    vase.position.set(3, 0.8, 2);
    vase.castShadow = true;
    this.scene.add(vase);
  }

  // Decorative elements
  _createDecoElements() {
    // Hanging pendant lights
    const lightMat = this._mat(0x1A1A1A, { roughness: 0.25, metalness: 0.8 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFF5E0 });

    const positions = [
      [-3, 5.5, 0], [0, 5.8, 1], [3, 5.3, -1], [-1.5, 5.6, -3]
    ];

    positions.forEach(([x, y, z], i) => {
      // Wire
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, y - 3.8, 4),
        lightMat
      );
      wire.position.set(x, (y + 3.8) / 2, z);
      this.scene.add(wire);

      // Shade
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.15, 0.2, 16, 1, true),
        this._mat(0xF5F0E8, { roughness: 0.6, side: THREE.DoubleSide })
      );
      shade.position.set(x, 3.8, z);
      shade.castShadow = true;
      this.scene.add(shade);

      // Glow bulb
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        glowMat
      );
      bulb.position.set(x, 3.72, z);
      this.scene.add(bulb);

      // Point light from pendant
      if (i < 2) { // Only first two for performance
        const pLight = new THREE.PointLight(0xFFF0D0, 0.4, 6, 2);
        pLight.position.set(x, 3.7, z);
        this.scene.add(pLight);
      }
    });

    // Side art frames (preserve architectural depth and balance)
    const frameMat = this._mat(0x1A1A1A, { roughness: 0.3, metalness: 0.5 });
    for (const x of [-5.5, 5.5]) {
      const sFrame = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.3, 0.04),
        frameMat
      );
      sFrame.position.set(x, 2.8, -4.88);
      this.scene.add(sFrame);

      const sInner = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 1.15, 0.05),
        this._mat(0xF5EDD8, { roughness: 0.9 })
      );
      sInner.position.set(x, 2.8, -4.85);
      this.scene.add(sInner);
    }
  }

  // Architectural archways
  _createArchElements() {
    // Archway columns on sides
    const colMat = this._mat(0xF0E8D8, { roughness: 0.6 });

    for (const x of [-5, 5]) {
      // Column
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.18, 5.5, 20),
        colMat
      );
      col.position.set(x, 2.75, 1);
      col.castShadow = true;
      this.scene.add(col);

      // Capital
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.15, 0.5),
        colMat
      );
      cap.position.set(x, 5.55, 1);
      this.scene.add(cap);

      // Base
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.15, 0.45),
        colMat
      );
      base.position.set(x, 0.075, 1);
      this.scene.add(base);
    }

    // Ceiling plane
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 16),
      this._mat(0xFAF3E3, { roughness: 0.95 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 5.6;
    this.scene.add(ceiling);

    // Subtle floating particles
    this._createParticles();
  }

  _createParticles() {
    const count = 80;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      sizes[i] = Math.random() * 3 + 1;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      color: 0xE8DDD0,
      size: 0.03,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);

    this.animatables.push({
      update: (t) => {
        const pos = this.particles.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
          pos[i * 3 + 1] += Math.sin(t * 0.2 + i) * 0.001;
          pos[i * 3] += Math.cos(t * 0.15 + i * 0.5) * 0.0005;
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
      }
    });
  }

  // ─── Camera Interpolation ─────────────────
  setCameraProgress(progress) {
    // progress: 0 = intro, 1 = zoomed in
    const p = Math.max(0, Math.min(1, progress));

    this.camera.position.lerpVectors(this.cameraStart, this.cameraEnd, p);
    this.currentLookAt.lerpVectors(this.lookAtStart, this.lookAtEnd, p);

    // Apply mouse parallax (reduced as we zoom in)
    const parallaxStrength = (1 - p) * 0.3;
    this.currentMouseOffset.x += (this.mouseOffset.x - this.currentMouseOffset.x) * 0.05;
    this.currentMouseOffset.y += (this.mouseOffset.y - this.currentMouseOffset.y) * 0.05;
    this.camera.position.x += this.currentMouseOffset.x * parallaxStrength;
    this.camera.position.y += this.currentMouseOffset.y * parallaxStrength * 0.5;

    this.camera.lookAt(this.currentLookAt);

    // Adjust FOV for a slight dolly zoom feel
    this.camera.fov = THREE.MathUtils.lerp(45, 35, p);
    this.camera.updateProjectionMatrix();

    // Fade fog closer as we zoom in
    this.scene.fog.near = THREE.MathUtils.lerp(12, 6, p);
    this.scene.fog.far = THREE.MathUtils.lerp(35, 18, p);
  }

  setMouseOffset(x, y) {
    this.mouseOffset.x = x;
    this.mouseOffset.y = y;
  }

  // ─── Render Loop ───────────────────────────
  render() {
    if (this.disposed) return;
    const t = this.clock.getElapsedTime();
    this.animatables.forEach(a => a.update(t));
    this.renderer.render(this.scene, this.camera);
  }

  // ─── Resize ────────────────────────────────
  _handleResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    if (this.camera.aspect < 1) {
      this.camera.fov = Math.min(65, 45 + (1 - this.camera.aspect) * 25);
    } else {
      this.camera.fov = 45;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  // ─── Interactive Raycaster & Physics Handlers ───
  _initRaycasterEvents() {
    this._onPointerMove = (e) => {
      if (!this.renderer || !this.renderer.domElement) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.rackHitBoxes, false);
      if (intersects.length > 0) {
        const idx = intersects[0].object.userData.garmentIndex;
        if (idx !== undefined && idx !== this.activeGarmentIndex) {
          this.stopAutoplay();
          this.setActiveGarment(idx);
          this.impulseGarment(idx, idx % 2 === 0 ? 0.08 : -0.08);
        }
      }
    };

    this._onPointerDown = (e) => {
      this._dragStartX = e.clientX;
    };

    this._onPointerUp = (e) => {
      if (Math.abs(e.clientX - (this._dragStartX || e.clientX)) < 6) {
        if (!this.renderer || !this.renderer.domElement) return;
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.rackHitBoxes, false);
        if (intersects.length > 0) {
          const idx = intersects[0].object.userData.garmentIndex;
          if (idx !== undefined) {
            this.stopAutoplay();
            if (idx === this.activeGarmentIndex) {
              this.toggleFlipGarment(idx);
            } else {
              this.setActiveGarment(idx);
              this.impulseGarment(idx, 0.12);
            }
          }
        }
      }
    };

    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('pointerdown', this._onPointerDown, { passive: true });
    window.addEventListener('pointerup', this._onPointerUp, { passive: true });
  }

  setActiveGarment(index) {
    this.activeGarmentIndex = index;
    for (let i = 0; i < this.rackGarments.length; i++) {
      if (i === index) {
        this.garmentTargetRotY[i] = this.garmentFlipped[i] ? Math.PI : 0;
      } else {
        this.garmentTargetRotY[i] = -1.05; // -60 deg resting angle
      }
    }
  }

  toggleFlipGarment(index) {
    this.garmentFlipped[index] = !this.garmentFlipped[index];
    this.garmentTargetRotY[index] = this.garmentFlipped[index] ? Math.PI : 0;
    this.impulseGarment(index, this.garmentFlipped[index] ? 0.08 : -0.08);
  }

  impulseGarment(index, amount) {
    if (this.garmentVelZ && this.garmentVelZ[index] !== undefined) {
      this.garmentVelZ[index] += amount * 8.0;
    }
  }

  startAutoplay() {
    this.autoplayActive = true;
    clearInterval(this.autoplayInterval);
    this.autoplayInterval = setInterval(() => {
      if (!this.autoplayActive || this.rackGarments.length === 0) return;
      const next = (this.activeGarmentIndex + 1) % this.rackGarments.length;
      this.setActiveGarment(next);
      this.impulseGarment(next, next % 2 === 0 ? 0.08 : -0.08);
    }, 3000);
  }

  stopAutoplay() {
    this.autoplayActive = false;
    clearInterval(this.autoplayInterval);
  }

  // ─── Cleanup ───────────────────────────────
  dispose() {
    this.disposed = true;
    this.stopAutoplay();
    if (this._onPointerMove) window.removeEventListener('pointermove', this._onPointerMove);
    if (this._onPointerDown) window.removeEventListener('pointerdown', this._onPointerDown);
    if (this._onPointerUp) window.removeEventListener('pointerup', this._onPointerUp);
    if (this._onThemeChange) window.removeEventListener('themechange', this._onThemeChange);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  // ─── Loading Progress (simulated for procedural scene) ──
  static getLoadProgress() {
    return 1; // Procedural scene is immediately ready
  }
}
