import * as THREE from 'three';

/* ------------------------------------------------------------------
   CONFIGURACIÓN Y CONSTANTES
-------------------------------------------------------------------*/
const MAP_SIZE         = 200;
const MAP_HEIGHT_LIMIT = 150;

const FORWARD_ACCELERATION = 0.8;   // pitch → avance/retroceso
const LATERAL_ACCELERATION = 0.7;   // roll  → lateral (der/izq)
const LIFT_ACCELERATION    = 2.5;   // throttle (↑)  ← ¡Más potente!
const YAW_ACCELERATION     = 2.0;   // giro cabecera
const PITCH_ACCELERATION   = 1.8;   // loops (eje X)
const ROLL_ACCELERATION    = 1.8;   // roll (eje Z)

const GRAVITY       = 0.04;         // ← gravedad más acusada
const DRAG          = 0.97;
const ROTATION_DRAG = 0.94;

const MAX_HORIZONTAL_SPEED = 3.0;
const MAX_VERTICAL_SPEED   = 2.5;
const MAX_ROTATION_SPEED   = 2.0;   // rad/s aprox.

const DEADZONE = 0.12;

/* ------------------------------------------------------------------
   VARIABLES GLOBALES
-------------------------------------------------------------------*/
let scene, camera, renderer;
let drone, droneVelocity, droneAngularVelocity;
let clock;
let gamepad = null;
let houses = [], mountains = [], hoops = [];

/* ------------------------------------------------------------------
   INICIALIZACIÓN
-------------------------------------------------------------------*/
function init() {
  clock = new THREE.Clock();

  /* Escena y cámara */
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xadd8e6);
  scene.fog        = new THREE.Fog(0xadd8e6, MAP_SIZE * 0.6, MAP_SIZE * 2);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);

  /* Renderer */
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  document.getElementById('container').appendChild(renderer.domElement);

  /* Luces */
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(50, 100, 75);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.near  = 0.5;
  dirLight.shadow.camera.far   = 500;
  dirLight.shadow.camera.left  =
    dirLight.shadow.camera.bottom = -MAP_SIZE;
  dirLight.shadow.camera.right =
    dirLight.shadow.camera.top    =  MAP_SIZE;
  scene.add(dirLight);

  /* Suelo */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x8fbc8f, side: THREE.DoubleSide })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  /* Dron */
  drone = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.2, 0.8),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  drone.position.set(0, 1, 0);
  drone.castShadow = true;
  drone.rotation.order = 'YXZ';
  scene.add(drone);

  droneVelocity        = new THREE.Vector3();
  droneAngularVelocity = new THREE.Vector3();

  createEnvironment();
  createHoops();
  setupEventListeners();
  animate();
}

/* ------------------------------------------------------------------
   ENTORNO: CASAS Y MONTAÑAS
-------------------------------------------------------------------*/
function createEnvironment() {
  const houseGeo = new THREE.BoxGeometry(5, 8, 5);
  const houseMat = new THREE.MeshStandardMaterial({ color: 0xdeb887 });

  const mountainGeo = new THREE.ConeGeometry(12, 35, 8);
  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x778899 });

  const half = MAP_SIZE / 2;

  for (let i = 0; i < 25; i++) {
    const h = new THREE.Mesh(houseGeo, houseMat);
    h.position.set(
      (Math.random() - 0.5) * MAP_SIZE * 0.9,
      houseGeo.parameters.height / 2,
      (Math.random() - 0.5) * MAP_SIZE * 0.9
    );
    if (h.position.length() < 15) {
      h.position.set(
        half * (0.6 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1),
        houseGeo.parameters.height / 2,
        half * (0.6 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1)
      );
    }
    h.castShadow = h.receiveShadow = true;
    scene.add(h);
    houses.push(h);
  }

  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(mountainGeo, mountainMat);
    let x, z;
    do {
      x = (Math.random() - 0.5) * MAP_SIZE * 1.1;
      z = (Math.random() - 0.5) * MAP_SIZE * 1.1;
    } while (Math.abs(x) < half * 0.4 || Math.abs(z) < half * 0.4);
    m.position.set(x, mountainGeo.parameters.height / 2, z);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    mountains.push(m);
  }
}

/* ------------------------------------------------------------------
   AROS
-------------------------------------------------------------------*/
function createHoops() {
  const hoopGeo = new THREE.TorusGeometry(4, 0.3, 16, 50);
  const hoopMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xaa8800,
    roughness: 0.4,
    metalness: 0.6,
  });

  const half = MAP_SIZE / 2;
  for (let i = 0; i < 10; i++) {
    const h = new THREE.Mesh(hoopGeo, hoopMat);
    const angle  = (i / 10) * Math.PI * 2;
    const radius = half * (0.3 + Math.random() * 0.5);
    h.position.set(
      Math.cos(angle) * radius,
      10 + Math.random() * (MAP_HEIGHT_LIMIT - 20),
      Math.sin(angle) * radius
    );
    h.rotation.set(
      Math.random() * Math.PI * 0.5 - Math.PI * 0.25,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 0.5 - Math.PI * 0.25
    );
    h.castShadow = true;
    scene.add(h);
    hoops.push(h);
  }
}

/* ------------------------------------------------------------------
   GAMEPAD INPUT
-------------------------------------------------------------------*/
function handleGamepadInput(dt) {
  if (!gamepad || !gamepad.connected) return;
  gamepad = navigator.getGamepads()[gamepad.index];
  if (!gamepad) return;

  // Zona muerta
  const dead = v => (Math.abs(v) > DEADZONE ? v : 0);

  /* Ejes */
  const lx = dead(gamepad.axes[0]);  // roll
  const ly = dead(gamepad.axes[1]);  // pitch
  const rx = dead(gamepad.axes[2]);  // yaw
  const ry = dead(gamepad.axes[3]);  // throttle

  /* Entradas */
  const liftInput    = -ry;  // +1 sube
  const yawInput     = -rx;  // + izq, - der
  const pitchInput   = -ly;  // loops
  const rollInput    =  lx;  // lateral

  /* Aceleración lineal (avance/deriva + lift) */
  const acc = new THREE.Vector3();
  const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(drone.quaternion);
  const sideVec    = new THREE.Vector3(1, 0, 0).applyQuaternion(drone.quaternion);
  const upVec      = new THREE.Vector3(0, 1, 0).applyQuaternion(drone.quaternion); // ↑ local

  acc.addScaledVector(forwardVec, pitchInput * FORWARD_ACCELERATION);
  acc.addScaledVector(sideVec,    rollInput  * LATERAL_ACCELERATION);
  acc.addScaledVector(upVec,      liftInput  * LIFT_ACCELERATION);

  droneVelocity.addScaledVector(acc, dt);

  /* Aceleración angular */
  droneAngularVelocity.x += pitchInput * PITCH_ACCELERATION * dt;
  droneAngularVelocity.y += yawInput   * YAW_ACCELERATION   * dt;
  droneAngularVelocity.z += rollInput  * ROLL_ACCELERATION  * dt;
}

/* ------------------------------------------------------------------
   ACTUALIZAR DRON
-------------------------------------------------------------------*/
function updateDrone(dt) {
  droneVelocity.multiplyScalar(Math.pow(DRAG, dt * 60));
  if (drone.position.y > 0.1) droneVelocity.y -= GRAVITY * dt;  // gravedad global ↓

  /* Velocidad máxima */
  const h = new THREE.Vector2(droneVelocity.x, droneVelocity.z);
  if (h.length() > MAX_HORIZONTAL_SPEED) {
    h.setLength(MAX_HORIZONTAL_SPEED);
    droneVelocity.x = h.x;
    droneVelocity.z = h.y;
  }
  droneVelocity.y = THREE.MathUtils.clamp(droneVelocity.y, -MAX_VERTICAL_SPEED, MAX_VERTICAL_SPEED);

  /* Drag angular y límite */
  droneAngularVelocity.multiplyScalar(Math.pow(ROTATION_DRAG, dt * 60));
  if (droneAngularVelocity.length() > MAX_ROTATION_SPEED) {
    droneAngularVelocity.setLength(MAX_ROTATION_SPEED);
  }

  /* Rotación */
  const dq = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      droneAngularVelocity.x * dt,
      droneAngularVelocity.y * dt,
      droneAngularVelocity.z * dt,
      drone.rotation.order
    )
  );
  drone.quaternion.multiplyQuaternions(drone.quaternion, dq);

  /* Posición */
  drone.position.addScaledVector(droneVelocity, dt);

  /* Colisiones */
  handleBoundariesAndCollisions();
}

/* ------------------------------------------------------------------
   COLISIONES Y LÍMITES
-------------------------------------------------------------------*/
function handleBoundariesAndCollisions() {
  const half = MAP_SIZE / 2;
  const box  = new THREE.Box3().setFromObject(drone);
  const size = new THREE.Vector3();
  box.getSize(size);
  const r = Math.max(size.x, size.z) / 2;

  /* Suelo */
  if (box.min.y < 0) {
    drone.position.y -= box.min.y;
    if (droneVelocity.y < 0) droneVelocity.y = 0;
    droneVelocity.multiplyScalar(0.9);
    droneAngularVelocity.multiplyScalar(0.8);
  }

  /* Altura */
  if (drone.position.y > MAP_HEIGHT_LIMIT) {
    drone.position.y = MAP_HEIGHT_LIMIT;
    if (droneVelocity.y > 0) droneVelocity.y = 0;
  }

  /* Bordes XZ */
  if (drone.position.x < -half + r) {
    drone.position.x = -half + r;
    if (droneVelocity.x < 0) droneVelocity.x = 0;
  }
  if (drone.position.x > half - r) {
    drone.position.x = half - r;
    if (droneVelocity.x > 0) droneVelocity.x = 0;
  }
  if (drone.position.z < -half + r) {
    drone.position.z = -half + r;
    if (droneVelocity.z < 0) droneVelocity.z = 0;
  }
  if (drone.position.z > half - r) {
    drone.position.z = half - r;
    if (droneVelocity.z > 0) droneVelocity.z = 0;
  }

  /* Casas y montañas */
  const push = obj => {
    const objBox = new THREE.Box3().setFromObject(obj);
    box.setFromObject(drone);
    if (!box.intersectsBox(objBox)) return;

    const overlap = new THREE.Vector3(
      Math.min(box.max.x, objBox.max.x) - Math.max(box.min.x, objBox.min.x),
      Math.min(box.max.y, objBox.max.y) - Math.max(box.min.y, objBox.min.y),
      Math.min(box.max.z, objBox.max.z) - Math.max(box.min.z, objBox.min.z)
    );
    if (overlap.x < overlap.y && overlap.x < overlap.z) {
      drone.position.x += Math.sign(drone.position.x - obj.position.x) * overlap.x * 1.01;
      droneVelocity.x = 0;
    } else if (overlap.y < overlap.x && overlap.y < overlap.z) {
      drone.position.y += Math.sign(drone.position.y - obj.position.y) * overlap.y * 1.01;
      droneVelocity.y = 0;
    } else {
      drone.position.z += Math.sign(drone.position.z - obj.position.z) * overlap.z * 1.01;
      droneVelocity.z = 0;
    }
    droneVelocity.multiplyScalar(0.8);
    droneAngularVelocity.multiplyScalar(0.8);
  };
  houses.forEach(push);
  mountains.forEach(push);
}

/* ------------------------------------------------------------------
   CÁMARA
-------------------------------------------------------------------*/
function updateCamera() {
  const offset = new THREE.Vector3(0, 3.5, 7.5).applyQuaternion(drone.quaternion);
  const target = drone.position.clone().add(offset);
  camera.position.lerp(target, 0.08);

  const lookAt = drone.position.clone().add(
    new THREE.Vector3(0, 0.5, -2).applyQuaternion(drone.quaternion)
  );
  camera.lookAt(lookAt);
}

/* ------------------------------------------------------------------
   ANIMACIÓN PRINCIPAL
-------------------------------------------------------------------*/
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  if (gamepad && gamepad.connected) {
    handleGamepadInput(dt);
  } else {
    droneVelocity.multiplyScalar(Math.pow(DRAG, dt * 60));
    droneAngularVelocity.multiplyScalar(Math.pow(ROTATION_DRAG, dt * 60));
    if (drone.position.y > 0.1) droneVelocity.y -= GRAVITY * dt;
  }

  updateDrone(dt);
  updateCamera();
  renderer.render(scene, camera);
}

/* ------------------------------------------------------------------
   EVENTOS
-------------------------------------------------------------------*/
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupEventListeners() {
  window.addEventListener('resize', onResize);

  window.addEventListener('gamepadconnected', e => {
    if (!gamepad) {
      gamepad = e.gamepad;
      document.getElementById('info').textContent =
        `Gamepad: ${gamepad.id}\n` +
        `LStick ➜ Pitch (↑↓ loops) + Roll (←→)\n` +
        `RStick ➜ Throttle (↑↓) + Yaw (←→)`;
    }
  });

  window.addEventListener('gamepaddisconnected', e => {
    if (gamepad && gamepad.index === e.gamepad.index) {
      gamepad = null;
      document.getElementById('info').textContent = 'Gamepad desconectado.';
      droneVelocity.set(0, 0, 0);
      droneAngularVelocity.set(0, 0, 0);
    }
  });
}

/* ------------------------------------------------------------------
   ¡ARRANQUE!
-------------------------------------------------------------------*/
init();
