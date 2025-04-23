import * as THREE from 'three';
// Opcional: Cargar modelos GLTF
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Configuración Inicial ---
const scene = new THREE.Scene();
const clock = new THREE.Clock();
let gamePaused = false;
let isGameOver = false;

// --- Elementos UI ---
const scoreEl = document.getElementById('score');
const altitudeEl = document.getElementById('altitude');
const speedEl = document.getElementById('speed');
const throttleDisplayEl = document.getElementById('throttle-display'); // Elemento para mostrar throttle
const gamepadStatusEl = document.getElementById('gamepad-status');
const crashMessageEl = document.getElementById('crash-message');

// --- Cámara ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50000); // *** Mayor distancia de visión ***
camera.position.set(0, 50, 150); // Se ajustará al inicio

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('container').appendChild(renderer.domElement);

// --- Iluminación ---
const ambientLight = new THREE.AmbientLight(0xADD8E6, 0.7); // Un poco más de ambiente
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0); // Sol un poco más brillante
sunLight.position.set(1500, 2000, 1000); // Posición ajustada para mapa grande
sunLight.castShadow = true;
// Ajustar sombras para el mapa grande
sunLight.shadow.mapSize.width = 2048; // Mantener o aumentar si hay problemas de calidad
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 200;
sunLight.shadow.camera.far = 6000; // Mayor alcance
sunLight.shadow.camera.left = -4000; // Área de sombra más grande
sunLight.shadow.camera.right = 4000;
sunLight.shadow.camera.top = 4000;
sunLight.shadow.camera.bottom = -4000;
scene.add(sunLight);
// const helper = new THREE.CameraHelper( sunLight.shadow.camera ); // Debug sombras
// scene.add( helper );

// --- Cielo con Gradiente ---
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 2;
skyCanvas.height = 128;
const skyCtx = skyCanvas.getContext('2d');
const gradient = skyCtx.createLinearGradient(0, 0, 0, 128);
gradient.addColorStop(0.0, '#0055dd'); // Azul más profundo arriba
gradient.addColorStop(0.6, '#40a0ff');
gradient.addColorStop(1.0, '#c0e8ff'); // Horizonte más claro
skyCtx.fillStyle = gradient;
skyCtx.fillRect(0, 0, 2, 128);
const skyTexture = new THREE.CanvasTexture(skyCanvas);
skyTexture.magFilter = THREE.LinearFilter;
skyTexture.minFilter = THREE.LinearFilter;
scene.background = skyTexture;

// --- Niebla ---
scene.fog = new THREE.Fog(0xc0e8ff, 2000, 35000); // *** Niebla empieza más lejos y termina más lejos ***

// --- Avión (Modelo sin cambios, pero podrías reemplazarlo) ---
const airplane = new THREE.Group();
const bodyGeometry = new THREE.ConeGeometry(10, 50, 8);
const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: false });
const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
bodyMesh.rotation.z = -Math.PI / 2;
bodyMesh.position.x = -15;
bodyMesh.castShadow = true;
airplane.add(bodyMesh);
const cockpitGeometry = new THREE.SphereGeometry(8, 16, 8);
const cockpitMaterial = new THREE.MeshPhongMaterial({ color: 0x3333ff, emissive:0x111155, transparent: true, opacity: 0.7 });
const cockpitMesh = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
cockpitMesh.position.x = 10;
cockpitMesh.scale.set(1, 0.8, 0.8);
airplane.add(cockpitMesh);
const wingGeometry = new THREE.BoxGeometry(20, 2, 80);
const wingMaterial = new THREE.MeshPhongMaterial({ color: 0xbbbbbb });
const wingMesh = new THREE.Mesh(wingGeometry, wingMaterial);
wingMesh.position.x = -10;
wingMesh.castShadow = true;
airplane.add(wingMesh);
const tailGeometry = new THREE.BoxGeometry(5, 20, 3);
const tailMaterial = new THREE.MeshPhongMaterial({ color: 0xbb0000 });
const tailMesh = new THREE.Mesh(tailGeometry, tailMaterial);
tailMesh.position.set(-30, 12, 0);
tailMesh.castShadow = true;
airplane.add(tailMesh);
const hTailGeometry = new THREE.BoxGeometry(5, 2, 25);
const hTailMesh = new THREE.Mesh(hTailGeometry, wingMaterial);
hTailMesh.position.set(-30, 3, 0);
hTailMesh.castShadow = true;
airplane.add(hTailMesh);
const propGeometry = new THREE.BoxGeometry(1, 25, 3);
const propMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
const propeller = new THREE.Mesh(propGeometry, propMaterial);
propeller.position.set(25, 0, 0);
airplane.add(propeller);
airplane.scale.set(0.8, 0.8, 0.8);
airplane.rotation.order = 'YXZ';
scene.add(airplane);

// --- Física del Avión ---
let velocity = new THREE.Vector3();
let acceleration = 1.8; // Empuje máximo un poco mayor
let drag = 0.988;        // Ligeramente más resistencia para compensar minThrottle
let lift = 0.992;        // Ligeramente más sustentación
let gravityForce = 0.12; // Gravedad un poco más fuerte
let currentThrottle = 0.3; // Acelerador inicial
const minThrottle = 0.20; // *** Throttle mínimo para mantener vuelo ***
let angularVelocity = new THREE.Vector3();
let angularDamping = 0.95; // Amortiguación angular
const controlSensitivity = {
    pitch: 1.4, // *** Sensibilidad de Pitch AUMENTADA ***
    roll: 1.0,  // Sensibilidad de Roll (ajustar si es necesario)
    yaw: 0.5,   // Yaw sigue siendo bajo (no controlado por sticks principales)
    throttle: 0.04 // *** Sensibilidad de Throttle (gatillos/teclas) aumentada ***
};

// --- Terreno con Montañas Onduladas ---
const terrainSize = 40000; // *** MAPA MUCHO MÁS GRANDE ***
const terrainSegments = 200; // Más segmentos para el tamaño
const terrainMaxHeight = 1800; // Montañas potencialmente más altas

const terrainGeometry = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
terrainGeometry.rotateX(-Math.PI / 2);

// Generación de altura (sin cambios en la fórmula, pero afecta a un área mayor)
const vertices = terrainGeometry.attributes.position.array;
const frequency1 = 0.0002; // Frecuencias ajustadas ligeramente para la escala
const frequency2 = 0.0008;
const amplitude1 = terrainMaxHeight * 0.6;
const amplitude2 = terrainMaxHeight * 0.25; // Más detalle

for (let i = 0; i <= terrainSegments; i++) {
    for (let j = 0; j <= terrainSegments; j++) {
        const index = (i * (terrainSegments + 1) + j) * 3;
        const x = vertices[index];
        const z = vertices[index + 2];
        const baseHeight = amplitude1 * (Math.sin(x * frequency1) * Math.cos(z * frequency1 * 0.8 + 0.5));
        const detailHeight = amplitude2 * Math.cos(x * frequency2 * 1.5 + 1) * Math.sin(z * frequency2);
        const noise = (Math.random() - 0.5) * terrainMaxHeight * 0.05;
        vertices[index + 1] = baseHeight + detailHeight + noise;
    }
}
terrainGeometry.attributes.position.needsUpdate = true;
terrainGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({
    color: 0x338833, // Verde un poco más oscuro
    roughness: 0.95,
    metalness: 0.05,
    // map: texture, // Podrías añadir una textura de terreno aquí
});
const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.receiveShadow = true;
terrain.position.y = -200; // Nivel base del terreno más bajo
scene.add(terrain);

// --- Raycaster para Colisión con Suelo ---
const raycaster = new THREE.Raycaster();
const downVector = new THREE.Vector3(0, -1, 0);
const minimumAltitude = 10; // Un poco más de margen

// --- Anillos ---
const rings = [];
const ringGeometry = new THREE.TorusGeometry(70, 12, 16, 60); // Anillos un poco más grandes
const ringMaterialActive = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0xccaa00, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
const ringMaterialPassed = new THREE.MeshPhongMaterial({ color: 0x00ff00, emissive: 0x007700, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
const numRings = 50; // Más anillos para el mapa grande
const ringPathRadius = 12000; // *** Radio del camino de anillos MUCHO MAYOR ***
const ringPathHeightVariation = 1500; // Mayor variación de altura

function setupRings() {
    rings.forEach(r => scene.remove(r));
    rings.length = 0;

    for (let i = 0; i < numRings; i++) {
        const angle = (i / numRings) * Math.PI * 2 * (Math.random() * 0.4 + 0.8); // Añade irregularidad al espaciado angular
        const radiusVariation = (Math.random() - 0.5) * ringPathRadius * 0.4;
        const x = Math.cos(angle) * (ringPathRadius + radiusVariation);
        const z = Math.sin(angle) * (ringPathRadius + radiusVariation);
        const y = terrain.position.y + 500 + Math.sin(angle * 1.5) * ringPathHeightVariation + Math.random() * 600; // Más altura base y variación

        const ring = new THREE.Mesh(ringGeometry, ringMaterialActive.clone());
        ring.position.set(x, Math.max(y, terrain.position.y + 150), z); // Asegurar que no esté bajo el nivel base
        ring.userData = { passed: false, index: i };
        rings.push(ring);
        scene.add(ring);
    }

    // Orientar anillos
    for (let i = 0; i < numRings; i++) {
        const nextIndex = (i + 1) % numRings;
        rings[i].lookAt(rings[nextIndex].position);
    }
}

// --- Controles (Gamepad y Teclado) ---
const controls = { pitch: 0, roll: 0, yaw: 0 };
let gamepad = null;

// Mapeo de Ejes y Botones/Gatillos
// ============================================================
// VERIFICA ESTOS VALORES CON html5gamepad.com
const AXIS_RIGHT_STICK_X = 2; // *** Controlará ROLL *** (Suele ser 2)
const AXIS_RIGHT_STICK_Y = 3; // Controlará PITCH (Suele ser 3, ¡verifica!)
// Los gatillos (LT/RT) a menudo se mapean a BOTONES con un valor de presión
const BUTTON_LT = 6;          // Índice común para LT (puede variar)
const BUTTON_RT = 7;          // Índice común para RT (puede variar)
const BUTTON_B = 1;           // Reset
// ============================================================

window.addEventListener('gamepadconnected', (event) => {
    console.log('Gamepad conectado:', event.gamepad);
    gamepad = event.gamepad;
    gamepadStatusEl.textContent = `Gamepad: ${gamepad.id}`;
    gamepadStatusEl.style.color = 'lightgreen';
});

window.addEventListener('gamepaddisconnected', (event) => {
    console.log('Gamepad desconectado:', event.gamepad);
    if (gamepad && gamepad.index === event.gamepad.index) {
        gamepad = null;
        gamepadStatusEl.textContent = 'Gamepad: No detectado';
        gamepadStatusEl.style.color = 'white';
        controls.pitch = 0; controls.roll = 0; controls.yaw = 0;
    }
});

function updateGamepadInput() {
    if (!gamepad) return;

    const currentGamepads = navigator.getGamepads();
    gamepad = currentGamepads[gamepad.index];
    if (!gamepad) return;

    const deadzone = 0.15;

    // Leer sticks derecho
    let rightX = gamepad.axes[AXIS_RIGHT_STICK_X] || 0; // Roll
    let rightY = gamepad.axes[AXIS_RIGHT_STICK_Y] || 0; // Pitch

    // Leer gatillos (como botones con valor)
    let leftTriggerValue = gamepad.buttons[BUTTON_LT]?.value || 0;
    let rightTriggerValue = gamepad.buttons[BUTTON_RT]?.value || 0;

    // Aplicar Roll y Pitch (desde stick derecho)
    controls.roll = Math.abs(rightX) > deadzone ? -rightX : 0;
    controls.pitch = Math.abs(rightY) > deadzone ? -rightY : 0; // Stick Y invertido es estándar
    controls.yaw = 0; // Yaw no controlado por sticks principales ahora

    // --- Control de Throttle con Gatillos ---
    let throttleDelta = (rightTriggerValue - leftTriggerValue) * controlSensitivity.throttle * 1.5; // Más impacto de gatillos
    currentThrottle += throttleDelta;

    // Aplicar throttle mínimo, A MENOS que se esté frenando activamente
    if (leftTriggerValue < 0.1) { // Si LT no está presionado significativamente
        currentThrottle = Math.max(minThrottle, currentThrottle);
    }

    // Clamp final del throttle entre 0 y 1
    currentThrottle = Math.max(0, Math.min(1, currentThrottle));

    // Botón de Reset
    if (gamepad.buttons[BUTTON_B]?.pressed && isGameOver) {
        resetGame();
    }
}

// --- Controles de Teclado ---
const keyMap = {};
window.addEventListener('keydown', (e) => {
    keyMap[e.code] = true;
    if (e.code === 'KeyR' && isGameOver) {
        resetGame();
    }
});
window.addEventListener('keyup', (e) => keyMap[e.code] = false);

function updateKeyboardInput() {
    // Priorizar Gamepad si está activo en ejes/gatillos principales
    let gamepadInUse = gamepad && (
        Math.abs(gamepad.axes[AXIS_RIGHT_STICK_X]) > 0.1 ||
        Math.abs(gamepad.axes[AXIS_RIGHT_STICK_Y]) > 0.1 ||
        (gamepad.buttons[BUTTON_LT]?.value || 0) > 0.1 ||
        (gamepad.buttons[BUTTON_RT]?.value || 0) > 0.1
    );

    if (gamepadInUse) {
        // Mantener valores de pitch/roll del gamepad
        controls.pitch = controls.pitch;
        controls.roll = controls.roll;
        controls.yaw = controls.yaw; // Mantener yaw (aunque sea 0)

        // Throttle del teclado SOLO si los gatillos no están activos
        if ((gamepad.buttons[BUTTON_LT]?.value || 0) < 0.1 && (gamepad.buttons[BUTTON_RT]?.value || 0) < 0.1) {
             if (keyMap['ShiftLeft'] || keyMap['ShiftRight']) currentThrottle = Math.min(1, currentThrottle + controlSensitivity.throttle);
             else if (keyMap['ControlLeft'] || keyMap['ControlRight']) currentThrottle = Math.max(0, currentThrottle - controlSensitivity.throttle);

             // Aplicar minThrottle si no se está frenando con teclado
             if (!keyMap['ControlLeft'] && !keyMap['ControlRight']) {
                 currentThrottle = Math.max(minThrottle, currentThrottle);
             }
             currentThrottle = Math.max(0, Math.min(1, currentThrottle)); // Clamp
        }
        return; // Salir, gamepad tiene control
    }

    // --- Si no hay gamepad activo, usar teclado ---
    // Pitch (W/S)
    if (keyMap['KeyW']) controls.pitch = 1.0;
    else if (keyMap['KeyS']) controls.pitch = -1.0;
    else controls.pitch = 0;

    // Roll (A/D) *** NUEVO ***
    if (keyMap['KeyA']) controls.roll = 1.0;
    else if (keyMap['KeyD']) controls.roll = -1.0;
    else controls.roll = 0;

    // Yaw (Q/E) - Desactivado por defecto, puedes reasignarlo si quieres
    controls.yaw = 0;
    // if (keyMap['KeyQ']) controls.yaw = 1.0;
    // else if (keyMap['KeyE']) controls.yaw = -1.0;
    // else controls.yaw = 0;

    // Throttle (Shift/Ctrl)
    if (keyMap['ShiftLeft'] || keyMap['ShiftRight']) currentThrottle = Math.min(1, currentThrottle + controlSensitivity.throttle);
    else if (keyMap['ControlLeft'] || keyMap['ControlRight']) currentThrottle = Math.max(0, currentThrottle - controlSensitivity.throttle);

    // Aplicar minThrottle si no se está frenando con teclado
    if (!keyMap['ControlLeft'] && !keyMap['ControlRight']) {
        currentThrottle = Math.max(minThrottle, currentThrottle);
    }
    currentThrottle = Math.max(0, Math.min(1, currentThrottle)); // Clamp
}


// --- Límites y Colisiones ---
const worldBounds = terrainSize / 2 * 0.99; // Casi al borde absoluto
const ceiling = 15000; // Techo más alto
let score = 0;

function checkCollisions() {
    if (isGameOver) return;

    const airplanePos = airplane.position;
    const ringCheckRadiusSq = 85 * 85; // Radio chequeo anillo (Torus radius + tube + buffer)^2

    // 1. Colisión con Anillos
    rings.forEach(ring => {
        if (!ring.userData.passed) {
            if (airplanePos.distanceToSquared(ring.position) < ringCheckRadiusSq) {
                ring.material = ringMaterialPassed;
                ring.userData.passed = true;
                score++;
            }
        }
    });

    // 2. Colisión con Límites
    let boundaryCollision = false;
    if (Math.abs(airplanePos.x) > worldBounds) {
        velocity.x *= -0.5;
        airplanePos.x = Math.sign(airplanePos.x) * worldBounds;
        boundaryCollision = true;
    }
     if (Math.abs(airplanePos.z) > worldBounds) {
        velocity.z *= -0.5;
        airplanePos.z = Math.sign(airplanePos.z) * worldBounds;
        boundaryCollision = true;
     }
     if (airplanePos.y > ceiling) {
        velocity.y *= -0.5;
        airplanePos.y = ceiling;
        boundaryCollision = true;
     }

    // 3. Colisión con Suelo (Raycasting)
    raycaster.set(airplanePos, downVector);
    const intersects = raycaster.intersectObject(terrain);

    if (intersects.length > 0) {
        if (intersects[0].distance < minimumAltitude) {
            handleCrash();
        }
    } else if (airplanePos.y < terrain.position.y - 500) { // Si cae muy por debajo del nivel base
             handleCrash();
    }
}

function handleCrash() {
    if (isGameOver) return;
    console.log("¡CRASH!");
    gamePaused = true;
    isGameOver = true;
    velocity.multiplyScalar(0.1); // Frenazo brusco
    angularVelocity.multiplyScalar(0.1);
    crashMessageEl.style.display = 'block';
}

// --- Función de Reset ---
function resetGame() {
    console.log("Reseteando juego...");
    gamePaused = false;
    isGameOver = false;
    crashMessageEl.style.display = 'none';
    score = 0;

    velocity.set(0, 0, 0);
    angularVelocity.set(0, 0, 0);
    currentThrottle = minThrottle; // Empezar en throttle mínimo
    controls.pitch = 0; controls.roll = 0; controls.yaw = 0;

    setInitialAirplanePosition(); // Recolocar avión

    rings.forEach(ring => {
        ring.material = ringMaterialActive.clone();
        ring.userData.passed = false;
    });
    clock.start();
}

// --- Establecer Posición Inicial Segura ---
function setInitialAirplanePosition() {
    const startCheckPos = new THREE.Vector3(0, 10000, 0); // Empezar chequeo MUY alto
    raycaster.set(startCheckPos, downVector);
    const intersects = raycaster.intersectObject(terrain);
    let groundAltitudeAtStart = terrain.position.y;

    if (intersects.length > 0) {
        groundAltitudeAtStart = intersects[0].point.y;
    } else {
         console.warn("No se detectó terreno en (0,0) para la posición inicial.");
    }

    const initialSafeAltitude = groundAltitudeAtStart + 2000; // *** ALTITUD INICIAL MUCHO MAYOR ***
    airplane.position.set(Math.random()*1000-500, initialSafeAltitude, Math.random()*1000-500); // Posición inicial ligeramente aleatoria en X/Z
    airplane.rotation.set(0, Math.random() * Math.PI * 2, 0); // Orientación inicial aleatoria en Y
    airplane.quaternion.setFromEuler(airplane.rotation);

    // Resetear cámara a la nueva posición
    const cameraIdealOffset = new THREE.Vector3(-200, 80, 0); // Offset ajustado
    cameraIdealOffset.applyQuaternion(airplane.quaternion);
    const cameraIdealTarget = airplane.position.clone().add(cameraIdealOffset);
    camera.position.copy(cameraIdealTarget);
    camera.lookAt(airplane.position);

    console.log(`Posición inicial del avión establecida en Y: ${airplane.position.y.toFixed(2)}`);
}


// --- Bucle de Animación ---
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = Math.min(clock.getDelta(), 0.1);

    // 1. Actualizar Controles
    if (gamepad) {
        updateGamepadInput();
    }
    updateKeyboardInput(); // Siempre procesa (la lógica interna decide prioridad)

    if (gamePaused && isGameOver) {
        renderer.render(scene, camera);
        return;
    }

    // 2. Actualizar Física y Movimiento
    const rotAmount = 2.5 * deltaTime; // Rotación base un poco más rápida
    angularVelocity.x += controls.pitch * controlSensitivity.pitch * rotAmount;
    angularVelocity.y += controls.yaw * controlSensitivity.yaw * rotAmount; // Yaw (si se activa)
    angularVelocity.z += controls.roll * controlSensitivity.roll * rotAmount; // Roll

    angularVelocity.multiplyScalar(angularDamping);

    airplane.rotation.x += angularVelocity.x * deltaTime;
    airplane.rotation.y += angularVelocity.y * deltaTime;
    airplane.rotation.z += angularVelocity.z * deltaTime;

    // Aplicar Cuaternión desde Euler para cálculos de dirección
    airplane.quaternion.setFromEuler(airplane.rotation);

    const forward = new THREE.Vector3(1, 0, 0);
    forward.applyQuaternion(airplane.quaternion);

    // Calcular empuje usando el throttle actual (que ya incluye el mínimo)
    const thrustForce = acceleration * currentThrottle;
    const thrust = forward.clone().multiplyScalar(thrustForce * deltaTime * 110); // Factor de potencia ajustado
    velocity.add(thrust);

    // Simular Sustentación y Gravedad
    const speed = velocity.length();
    // Lift más dependiente de la velocidad y menos del ángulo (simplificado)
    const liftForce = Math.min(1.5, speed * 0.008); // Aumentado el factor de velocidad
    const effectiveLift = lift * liftForce;
    const gravityEffect = gravityForce * Math.max(0, 1.0 - effectiveLift) * deltaTime * 100; // No aplicar sustentación negativa

    velocity.y -= gravityEffect;
    velocity.y *= 0.99; // Amortiguación vertical

    // Aplicar Resistencia del Aire (Drag)
    const dragCoefficient = 1.0 + speed * 0.0005; // Ajustado coeficiente de drag
    velocity.multiplyScalar(Math.pow(drag, dragCoefficient));

    // Aplicar velocidad a la posición
    airplane.position.add(velocity.clone().multiplyScalar(deltaTime * 70)); // Multiplicador de velocidad ajustado

    // Rotar hélice
    propeller.rotation.x += 0.5 + currentThrottle * 3.0; // Más rápida

    // 3. Actualizar Cámara
    const cameraIdealOffset = new THREE.Vector3(-200, 80, 0); // Offset ajustado
    cameraIdealOffset.applyQuaternion(airplane.quaternion);
    const cameraIdealTarget = airplane.position.clone().add(cameraIdealOffset);
    camera.position.lerp(cameraIdealTarget, 0.07); // Suavizado ligero

    const lookAtPoint = airplane.position.clone().add(forward.multiplyScalar(100));
    camera.lookAt(lookAtPoint);

    // 4. Comprobar Colisiones
    checkCollisions();

    // 5. Actualizar UI
    scoreEl.textContent = `Anillos: ${score}`;
    altitudeEl.textContent = `Altitud: ${airplane.position.y.toFixed(0)} m`;
    const speedValue = speed * 18; // Factor de velocidad UI ajustado
    speedEl.textContent = `Velocidad: ${speedValue.toFixed(0)}`;
    throttleDisplayEl.textContent = `Throttle: ${(currentThrottle * 100).toFixed(0)}%`; // Mostrar throttle


    // 6. Renderizar
    renderer.render(scene, camera);
}

// --- Manejador de Redimensionamiento ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// --- Inicialización del Juego ---
setupRings();
setInitialAirplanePosition();
console.log("Simulador de vuelo Extendido listo.");
console.log(`CONTROLES GAMEPAD: Stick Derecho(X/Y)=Roll/Pitch, LT/RT=Freno/Acelerar`);
console.log(`CONTROLES TECLADO: W/S=Pitch, A/D=Roll, Shift/Ctrl=Acelerar/Freno`);
console.log(`=== VERIFICA TU GAMEPAD ===\nAsegúrate que AXIS_RIGHT_STICK_Y (${AXIS_RIGHT_STICK_Y}) es correcto para PITCH.`);
console.log(`Asegúrate que BUTTON_LT (${BUTTON_LT}) y BUTTON_RT (${BUTTON_RT}) son correctos para los Gatillos.`);
animate();