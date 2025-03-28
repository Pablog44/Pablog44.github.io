import * as THREE from 'three';
import Stats from 'stats.js/src/Stats'; // Importar Stats

// --- DOM Elements ---
const startScreen = document.getElementById('start-screen');
const gameContainer = document.getElementById('game-container'); // Contenedor principal
const onePlayerBtn = document.getElementById('one-player-btn');
const twoPlayersBtn = document.getElementById('two-players-btn');
const gameCanvas = document.getElementById('game-canvas'); // Canvas para Three.js
const minimapCanvas = document.getElementById('minimap-canvas'); // Canvas para Minimapa
const hud1 = document.getElementById('hud1');
const hud2 = document.getElementById('hud2');
const gamepadStatus = document.getElementById('gamepad-status');
const gamepadList = document.getElementById('gamepad-list');
const statsOutput = document.getElementById('stats-output'); // Div para Stats.js

// --- Three.js Setup ---
let scene, renderer, cameras = [], clock, stats;
let minimapCtx; // Contexto 2D para el minimapa

// --- Game State ---
let numPlayers = 1;
let gameRunning = false;
let animationFrameId;
let connectedGamepads = {};

// --- Game Constants ---
const CAR_WIDTH = 2; // Ajustado para escala 3D
const CAR_HEIGHT = 1;
const CAR_DEPTH = 4; // Profundidad del coche
const ACCELERATION = 5.0; // Ajustar para sensación 3D
const BRAKING = 10.0;
const REVERSE_ACCELERATION = 3.0;
const MAX_SPEED = 50.0;
const MAX_REVERSE_SPEED = -15.0;
const TURN_SPEED = 1.5; // Radians per second
const FRICTION = 0.98; // Factor de multiplicación (más cercano a 1 = menos fricción)
const CAMERA_DISTANCE = 15; // Distancia de la cámara al coche
const CAMERA_HEIGHT = 6;   // Altura de la cámara

// --- Car Objects ---
let cars = []; // Ahora contendrá { state: {...}, mesh: THREE.Mesh }

// --- Track Definition (simple oval in XZ plane) ---
const TRACK_CENTER_X = 0;
const TRACK_CENTER_Z = 0;
const TRACK_WIDTH_RADIUS = 60; // Radio mayor de la elipse
const TRACK_HEIGHT_RADIUS = 30; // Radio menor de la elipse
const TRACK_THICKNESS = 15; // Ancho de la pista

// --- Input State ---
let inputs = [
    { accelerate: false, brake: false, left: false, right: false }, // Player 1
    { accelerate: false, brake: false, left: false, right: false }  // Player 2
];

// --- Lap Counting (adaptado a XZ) ---
const FINISH_LINE_Z = TRACK_CENTER_Z; // En el centro Z
const FINISH_LINE_X_START = TRACK_CENTER_X + TRACK_WIDTH_RADIUS - TRACK_THICKNESS / 2;
const FINISH_LINE_X_END = TRACK_CENTER_X + TRACK_WIDTH_RADIUS + TRACK_THICKNESS / 2;
const FINISH_LINE_WIDTH = 1; // En el mundo 3D

// ----------------------------------------
// --- Initialization and Setup ---
// ----------------------------------------

function setupThreeJS() {
    // --- Renderer ---
    renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setScissorTest(true); // NECESARIO para pantalla dividida

    // --- Scene ---
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    scene.fog = new THREE.Fog(0x87CEEB, 100, 300); // Niebla suave

    // --- Clock ---
    clock = new THREE.Clock();

    // --- Stats (FPS Counter) ---
    stats = new Stats();
    stats.dom.style.position = 'relative'; // Ensure it fits in our container
    statsOutput.appendChild(stats.dom);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 75);
    directionalLight.castShadow = true; // Opcional: sombras
    // Configuración básica de sombras (puede requerir ajustes)
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    // renderer.shadowMap.enabled = true; // Habilitar sombras (costoso)

    // --- Track Geometry ---
    createTrackGeometry();

    // --- Minimap Setup ---
    setupMinimap();
}

function setupMinimap() {
    minimapCtx = minimapCanvas.getContext('2d');
    minimapCanvas.width = 150 * (window.devicePixelRatio || 1);
    minimapCanvas.height = 100 * (window.devicePixelRatio || 1);
    minimapCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    minimapCanvas.style.width = '150px';
    minimapCanvas.style.height = '100px';
}


function createTrackGeometry() {
    // Ground Plane (Grass)
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x5a8a5a, side: THREE.DoubleSide });
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2; // Rotate flat
    groundPlane.receiveShadow = true; // Opcional
    scene.add(groundPlane);

    // Track Path (simple Ring/Annulus)
    const trackShape = new THREE.Shape();
    const outerRadius = TRACK_WIDTH_RADIUS + TRACK_THICKNESS / 2;
    const innerRadius = TRACK_WIDTH_RADIUS - TRACK_THICKNESS / 2;
    // Nota: Usaremos radios X e Y para la elipse, Three.js Ring usa un solo radio.
    // Para una elipse real, necesitarías crearla con curvas o importar un modelo.
    // Usaremos un Círculo como aproximación simple aquí (RingGeometry).
    const trackGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128); // Inner, Outer, Segments
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x404040, side: THREE.DoubleSide });
    const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    trackMesh.rotation.x = -Math.PI / 2; // Rotate flat
    trackMesh.position.set(TRACK_CENTER_X, 0.1, TRACK_CENTER_Z); // Slightly above ground
    trackMesh.receiveShadow = true; // Opcional
    scene.add(trackMesh);

     // Finish Line Visualisation (optional)
    const finishLineGeo = new THREE.PlaneGeometry(TRACK_THICKNESS, FINISH_LINE_WIDTH);
    const finishLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const finishLineMesh = new THREE.Mesh(finishLineGeo, finishLineMat);
    finishLineMesh.rotation.x = -Math.PI / 2;
    finishLineMesh.position.set(TRACK_CENTER_X + TRACK_WIDTH_RADIUS, 0.15, FINISH_LINE_Z);
    scene.add(finishLineMesh);
}


function initCar(playerIndex, color) {
    // Car Geometry and Material
    const carGeometry = new THREE.BoxGeometry(CAR_WIDTH, CAR_HEIGHT, CAR_DEPTH);
    const carMaterial = new THREE.MeshStandardMaterial({ color: color });
    const carMesh = new THREE.Mesh(carGeometry, carMaterial);
    carMesh.castShadow = true; // Opcional
    carMesh.position.y = CAR_HEIGHT / 2 + 0.1; // Sit on the track

    // Initial State (adapted to XZ plane)
    const startOffset = playerIndex * CAR_DEPTH * 1.5; // Offset P2 start slightly
    const carState = {
        x: TRACK_CENTER_X + TRACK_WIDTH_RADIUS,
        z: TRACK_CENTER_Z - startOffset, // Start near finish line on the right side
        y: carMesh.position.y, // Keep track of Y position (height)
        angle: -Math.PI / 2, // Pointing "down" the track initially (along negative Z)
        speed: 0,
        color: color,
        playerIndex: playerIndex,
        lap: 0,
        onFinishLineHalf: false // For lap counting logic
    };

    // Set initial mesh position and rotation
    carMesh.position.set(carState.x, carState.y, carState.z);
    carMesh.rotation.y = carState.angle; // Rotation around Y axis

    scene.add(carMesh); // Add mesh to the scene

    return { state: carState, mesh: carMesh };
}


function initGame() {
    console.log(`Iniciando juego 3D con ${numPlayers} jugador(es)`);
    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    gameContainer.className = ' '; // Reset classes
    gameContainer.classList.add('game-container'); // Re-add base class

    if (numPlayers === 1) {
        gameContainer.classList.add('single-player');
        hud2.style.display = 'none';
    } else {
        gameContainer.classList.add('two-players');
        hud2.style.display = 'block'; // Asegurar que HUD2 sea visible
    }

    // Initialize Cameras
    cameras = [];
    for (let i = 0; i < numPlayers; i++) {
        const aspect = (numPlayers === 1) ? window.innerWidth / window.innerHeight : (window.innerWidth / 2) / window.innerHeight;
        const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        cameras.push(camera);
        // Initial camera position will be set in the first updateCamera call
    }

    // Initialize Cars
    cars = [];
    cars.push(initCar(0, 0xff0000)); // Player 1 car (Red)
    hud1.textContent = `Vueltas P1: 0`;
    if (numPlayers === 2) {
        cars.push(initCar(1, 0x0000ff)); // Player 2 car (Blue)
        hud2.textContent = `Vueltas P2: 0`;
    }

    gameRunning = true;
    clock.start(); // Start the clock
    gameLoop(); // Start the main game loop
}

// ----------------------------------------
// --- Gamepad Handling (Mostly Unchanged)---
// ----------------------------------------
function updateGamepadStatus() {
    connectedGamepads = {};
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : []; // Handle potential null
    let listHTML = '';
    let foundP1 = false;
    let foundP2 = false;

    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp) {
            connectedGamepads[gp.index] = gp;
            listHTML += `<li>Gamepad ${gp.index}: ${gp.id.substring(0, 25)}... ${gp.connected ? '(Conectado)' : '(Desconectado)'}</li>`;
             // Use gp.index to assign players reliably
            if (gp.index === 0) foundP1 = true;
            if (gp.index === 1) foundP2 = true;
        }
    }
    gamepadList.innerHTML = listHTML || '<li>No hay gamepads conectados</li>';

    // Enable/Disable buttons
    onePlayerBtn.disabled = !foundP1; // Need at least gamepad 0 for 1 player
    twoPlayersBtn.disabled = !(foundP1 && foundP2); // Need gamepad 0 and 1 for 2 players

    if (!foundP1) gamepadStatus.querySelector('p').textContent = "Conecta al menos un gamepad (será Jugador 1).";
    else if (!foundP2 && numPlayers === 2) gamepadStatus.querySelector('p').textContent = "Conecta un segundo gamepad (será Jugador 2).";
     else if (!foundP2) gamepadStatus.querySelector('p').textContent = "Gamepad P1 detectado. Conecta otro para 2 jugadores.";
    else gamepadStatus.querySelector('p').textContent = "Gamepads detectados:";
}


function handleGamepadInput() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

    // Reset inputs
    inputs.forEach(input => {
        input.accelerate = false;
        input.brake = false;
        input.left = false;
        input.right = false;
    });

    for (let i = 0; i < numPlayers; i++) {
        // Use specific gamepad index for each player (P1=gp[0], P2=gp[1])
        const gp = gamepads[i];
        if (gp && gp.connected) {
            const accelerateButton = gp.buttons[7] || gp.buttons[0]; // RT or A
            const brakeButton = gp.buttons[6] || gp.buttons[1];    // LT or B
            const steerAxis = gp.axes[0]; // Left stick X
            const dpadLeft = gp.buttons[14];
            const dpadRight = gp.buttons[15];

            if (accelerateButton) inputs[i].accelerate = accelerateButton.pressed || accelerateButton.value > 0.1;
            if (brakeButton) inputs[i].brake = brakeButton.pressed || brakeButton.value > 0.1;
            if (steerAxis < -0.3 || (dpadLeft && dpadLeft.pressed)) inputs[i].left = true;
            if (steerAxis > 0.3 || (dpadRight && dpadRight.pressed)) inputs[i].right = true;
        }
        // No keyboard fallback in this version for simplicity with modules/gamepads
    }
}

window.addEventListener("gamepadconnected", (event) => {
    console.log("Gamepad conectado:", event.gamepad.index, event.gamepad.id);
    updateGamepadStatus();
});

window.addEventListener("gamepaddisconnected", (event) => {
    console.log("Gamepad desconectado:", event.gamepad.index, event.gamepad.id);
    delete connectedGamepads[event.gamepad.index];
    updateGamepadStatus();
    // Might need logic here to pause game or handle player dropping out
});

// Initial check
updateGamepadStatus();

// ----------------------------------------
// --- Game Logic (Adapted for 3D) ---
// ----------------------------------------

function updateCar(car, input, deltaTime) {
    const state = car.state;
    const mesh = car.mesh;

    // Apply Friction (exponential decay)
    state.speed *= FRICTION;
    // Stop if speed is very low
    if (Math.abs(state.speed) < 0.1) state.speed = 0;


    // Acceleration / Braking using deltaTime for frame independence
    if (input.accelerate) {
        state.speed += ACCELERATION * deltaTime;
    }
    if (input.brake) {
        if (state.speed > 0.1) { // Braking only if moving forward significantly
            state.speed -= BRAKING * deltaTime;
        } else { // Reversing
            state.speed -= REVERSE_ACCELERATION * deltaTime;
        }
    }

    // Clamp Speed
    state.speed = Math.max(MAX_REVERSE_SPEED, Math.min(MAX_SPEED, state.speed));

    // Steering (only when moving) - uses deltaTime
    if (Math.abs(state.speed) > 0.1) {
        const turnFactor = 1 - Math.abs(state.speed) / (MAX_SPEED * 1.5); // Reduced turn at high speed
        const turnAmount = TURN_SPEED * turnFactor * deltaTime * (state.speed > 0 ? 1 : -1); // Invert steer in reverse
        if (input.left) {
            state.angle += turnAmount; // Positive angle turn left in our coordinate system
        }
        if (input.right) {
            state.angle -= turnAmount; // Negative angle turn right
        }
    }

    // Update Position using deltaTime (XZ plane)
    state.x += state.speed * Math.sin(state.angle) * deltaTime; // Sin for X due to angle definition
    state.z += state.speed * Math.cos(state.angle) * deltaTime; // Cos for Z

    // Update Mesh Position and Rotation
    mesh.position.set(state.x, state.y, state.z);
    mesh.rotation.y = state.angle; // Rotate mesh around Y axis

    // --- Lap Counting Logic (using XZ coordinates) ---
    const flZ = FINISH_LINE_Z;
    const flX1 = FINISH_LINE_X_START;
    const flX2 = FINISH_LINE_X_END;
    const movingTowardsFinish = Math.cos(state.angle) < -0.1; // Moving mostly in negative Z direction

    // Check if car is near the finish line X-wise and moving towards it
    if (state.x > flX1 && state.x < flX2 && movingTowardsFinish) {
        const crossedFinishLine = state.z < flZ && (state.z - state.speed * Math.cos(state.angle) * deltaTime) >= flZ;
        const isOnLowerHalf = state.z < flZ; // Is the car past the line Z-wise?

        if (crossedFinishLine && state.onFinishLineHalf) {
             state.lap++;
             console.log(`Player ${state.playerIndex + 1} completed lap ${state.lap}`);
             if(state.playerIndex === 0) hud1.textContent = `Vueltas P1: ${state.lap}`;
             else hud2.textContent = `Vueltas P2: ${state.lap}`;
             state.onFinishLineHalf = false; // Reset for next lap
        } else if (!isOnLowerHalf) { // If on the "upper" half (before the line)
             // Mark that the car is ready to complete lap on next pass
             state.onFinishLineHalf = true;
        }
    }
     // Basic reset condition if they move far away or reverse significantly
     if (state.x < flX1 - 10 || state.x > flX2 + 10 || !movingTowardsFinish) {
          if (state.z > flZ + 10) { // Only reset if they are clearly back on the 'upper' side
             state.onFinishLineHalf = false;
          }
     }

    // --- Basic Track Boundaries (Very Simple - Push back) ---
    // A proper physics engine or better collision detection is needed for robust boundaries
    const distFromCenterSq = (state.x - TRACK_CENTER_X)**2 + (state.z - TRACK_CENTER_Z)**2;
    const outerBoundarySq = (TRACK_WIDTH_RADIUS + TRACK_THICKNESS / 2 + CAR_WIDTH)**2; // Approx outer edge
    const innerBoundarySq = (TRACK_WIDTH_RADIUS - TRACK_THICKNESS / 2 - CAR_WIDTH)**2; // Approx inner edge

    if (distFromCenterSq > outerBoundarySq || distFromCenterSq < innerBoundarySq) {
         // Very basic: push towards center and reduce speed drastically
        // state.x -= Math.sign(state.x - TRACK_CENTER_X) * 0.5;
        // state.z -= Math.sign(state.z - TRACK_CENTER_Z) * 0.5;
        state.speed *= 0.8; // Slow down significantly
    }
}

function updateCamera(car, camera) {
    const state = car.state;
    const mesh = car.mesh;

    // Calculate desired camera position behind the car
    const camOffsetX = Math.sin(state.angle) * CAMERA_DISTANCE;
    const camOffsetZ = Math.cos(state.angle) * CAMERA_DISTANCE;

    const desiredCamPos = new THREE.Vector3(
        state.x - camOffsetX,
        state.y + CAMERA_HEIGHT,
        state.z - camOffsetZ
    );

    // Smoothly interpolate camera position (lerp)
    camera.position.lerp(desiredCamPos, 0.1); // Adjust lerp factor (0.1 is quite smooth)

    // Make camera look at the car
    camera.lookAt(mesh.position);
}


// ----------------------------------------
// --- Drawing / Rendering ---
// ----------------------------------------

function drawMinimap() {
    const mapW = 150; // CSS width
    const mapH = 100; // CSS height
    minimapCtx.clearRect(0, 0, mapW, mapH);

    // Calculate scaling factors to fit track onto minimap
    const trackTotalWidth = (TRACK_WIDTH_RADIUS + TRACK_THICKNESS / 2) * 2;
    const trackTotalHeight = (TRACK_HEIGHT_RADIUS + TRACK_THICKNESS / 2) * 2; // Approximation if elliptic
    const scaleX = mapW / trackTotalWidth * 0.9; // Add some padding
    const scaleZ = mapH / trackTotalHeight * 0.9;
    const scale = Math.min(scaleX, scaleZ); // Use uniform scaling

    const mapCenterX = mapW / 2;
    const mapCenterY = mapH / 2;

    // Function to convert world coords (x, z) to minimap coords (mx, my)
    const worldToMinimap = (wx, wz) => {
        const mapX = mapCenterX + (wx - TRACK_CENTER_X) * scale;
        const mapY = mapCenterY + (wz - TRACK_CENTER_Z) * scale; // Z maps to Y on minimap
        return { x: mapX, y: mapY };
    };

    // Draw Track Outline (Approximation - Ellipse)
    minimapCtx.strokeStyle = '#888';
    minimapCtx.lineWidth = 2 * scale; // Thin line
    minimapCtx.beginPath();
    minimapCtx.ellipse(
        mapCenterX, mapCenterY,
        TRACK_WIDTH_RADIUS * scale, TRACK_HEIGHT_RADIUS * scale, // Use separate radii if needed
        0, 0, Math.PI * 2
    );
    minimapCtx.stroke();

    // Draw Finish Line on Minimap
    const flMapStart = worldToMinimap(FINISH_LINE_X_START, FINISH_LINE_Z);
    const flMapEnd = worldToMinimap(FINISH_LINE_X_END, FINISH_LINE_Z);
    minimapCtx.strokeStyle = '#fff';
    minimapCtx.lineWidth = 2;
    minimapCtx.beginPath();
    minimapCtx.moveTo(flMapStart.x, flMapStart.y);
    minimapCtx.lineTo(flMapEnd.x, flMapEnd.y);
    minimapCtx.stroke();

    // Draw Cars on Minimap
    cars.forEach(car => {
        const pos = worldToMinimap(car.state.x, car.state.z);
        minimapCtx.fillStyle = car.state.color; // Use THREE color hex
        minimapCtx.beginPath();
        minimapCtx.arc(pos.x, pos.y, 3, 0, Math.PI * 2); // Draw a small circle
        minimapCtx.fill();
    });
}


function render() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setViewport(0, 0, width, height); // Set full viewport initially
    renderer.setScissor(0, 0, width, height);   // Set full scissor initially
    renderer.clear();                           // Clear the whole buffer

    if (numPlayers === 1) {
        // Render Player 1 (Full Screen)
        renderer.setViewport(0, 0, width, height);
        renderer.setScissor(0, 0, width, height);
        renderer.render(scene, cameras[0]);
    } else {
        // Render Player 1 (Left Half)
        const halfWidth = Math.floor(width / 2);
        renderer.setViewport(0, 0, halfWidth, height);
        renderer.setScissor(0, 0, halfWidth, height);
        renderer.render(scene, cameras[0]);

        // Render Player 2 (Right Half)
        renderer.setViewport(halfWidth, 0, width - halfWidth, height); // Use remaining width
        renderer.setScissor(halfWidth, 0, width - halfWidth, height);
        renderer.render(scene, cameras[1]);
    }
}

// ----------------------------------------
// --- Main Game Loop ---
// ----------------------------------------

function gameLoop(timestamp) {
    if (!gameRunning) return;

    stats.begin(); // Start FPS counter

    const deltaTime = clock.getDelta(); // Time since last frame

    // 1. Handle Input
    handleGamepadInput(); // Reads gamepad state into `inputs` array

    // 2. Update Game State
    cars.forEach((car, index) => {
        updateCar(car, inputs[index], deltaTime);
        if (cameras[index]) { // Check if camera exists
             updateCamera(car, cameras[index]);
        }
    });

    // 3. Render 3D Scene (Handles split screen internally)
    render();

    // 4. Draw 2D Minimap Overlay
    drawMinimap();

    stats.end(); // End FPS counter

    // Request next frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ----------------------------------------
// --- Event Listeners ---
// ----------------------------------------

onePlayerBtn.addEventListener('click', () => {
    numPlayers = 1;
    initGame();
});

twoPlayersBtn.addEventListener('click', () => {
    numPlayers = 2;
    initGame();
});

// Handle window resizing
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update renderer size
    renderer.setSize(width, height);

    // Update camera aspect ratios
    cameras.forEach((camera, index) => {
        const aspect = (numPlayers === 1) ? width / height : (width / 2) / height;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
    });

    // Re-setup minimap canvas size for DPR changes if necessary (optional)
    // setupMinimap();

    // Note: Rendering happens in the loop, no need to force redraw here unless paused
});

// --- Initial Setup ---
setupThreeJS(); // Setup renderer, scene, lights, track etc. once