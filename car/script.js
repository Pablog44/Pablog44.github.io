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
let connectedGamepads = {}; // Guarda los gamepads conectados por su índice

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
const TRACK_WIDTH_RADIUS = 60; // Radio mayor de la elipse (usado como radio X)
const TRACK_HEIGHT_RADIUS = 30; // Radio menor de la elipse (usado como radio Z para el dibujo del minimapa)
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
// --- Initialization and Setup Functions ---
// ----------------------------------------

function setupThreeJS() {
    console.log("Setting up Three.js...");
    try {
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
        clock = new THREE.Clock(false); // No iniciar automáticamente

        // --- Stats (FPS Counter) ---
        stats = new Stats();
        stats.dom.style.position = 'relative';
        statsOutput.appendChild(stats.dom);

        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 75);
        // Sombras opcionales (pueden impactar el rendimiento)
        // directionalLight.castShadow = true;
        // directionalLight.shadow.mapSize.width = 1024;
        // directionalLight.shadow.mapSize.height = 1024;
        scene.add(directionalLight);
        // renderer.shadowMap.enabled = true;

        // --- Track Geometry ---
        createTrackGeometry();

        // --- Minimap Setup ---
        setupMinimap();

        console.log("Three.js Setup Complete.");

    } catch (error) {
        console.error("Error during Three.js setup:", error);
        // Podrías mostrar un mensaje al usuario aquí
    }
}

function setupMinimap() {
    if (!minimapCanvas) return;
    minimapCtx = minimapCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    minimapCanvas.width = 150 * dpr; // Usar tamaño base CSS
    minimapCanvas.height = 100 * dpr;
    minimapCtx.scale(dpr, dpr);
    minimapCanvas.style.width = '150px';
    minimapCanvas.style.height = '100px';
}


function createTrackGeometry() {
    if (!scene) return;
    // Ground Plane (Grass)
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x5a8a5a, side: THREE.DoubleSide });
    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2; // Rotate flat
    // groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // Track Path (Ring Geometry for simplicity)
    const trackOuterRadius = TRACK_WIDTH_RADIUS + TRACK_THICKNESS / 2;
    const trackInnerRadius = TRACK_WIDTH_RADIUS - TRACK_THICKNESS / 2;
    const trackGeometry = new THREE.RingGeometry(trackInnerRadius, trackOuterRadius, 128);
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x404040, side: THREE.DoubleSide });
    const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    trackMesh.rotation.x = -Math.PI / 2;
    trackMesh.position.set(TRACK_CENTER_X, 0.1, TRACK_CENTER_Z); // Slightly above ground
    // trackMesh.receiveShadow = true;
    scene.add(trackMesh);

     // Finish Line Visualization
    const finishLineGeo = new THREE.PlaneGeometry(TRACK_THICKNESS, FINISH_LINE_WIDTH);
    const finishLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const finishLineMesh = new THREE.Mesh(finishLineGeo, finishLineMat);
    finishLineMesh.rotation.x = -Math.PI / 2;
    finishLineMesh.position.set(TRACK_CENTER_X + TRACK_WIDTH_RADIUS, 0.15, FINISH_LINE_Z); // Centered on radius
    scene.add(finishLineMesh);
}


function initCar(playerIndex, color) {
    if (!scene) {
        console.error("Scene is not available to add car!");
        return null;
    }
    // Car Geometry and Material
    const carGeometry = new THREE.BoxGeometry(CAR_WIDTH, CAR_HEIGHT, CAR_DEPTH);
    const carMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5, metalness: 0.3 });
    const carMesh = new THREE.Mesh(carGeometry, carMaterial);
    // carMesh.castShadow = true;
    carMesh.position.y = CAR_HEIGHT / 2 + 0.1; // Sit slightly above track

    // Initial State
    const startOffset = playerIndex * CAR_DEPTH * 1.5; // Offset P2 start
    const carState = {
        x: TRACK_CENTER_X + TRACK_WIDTH_RADIUS,
        z: TRACK_CENTER_Z - startOffset, // Start near finish line, offset P2
        y: carMesh.position.y,
        angle: -Math.PI / 2, // Pointing "down" (negative Z)
        speed: 0,
        color: color, // Store the color hex value
        playerIndex: playerIndex,
        lap: 0,
        onFinishLineHalf: true // Start before the line, ready to cross
    };

    // Set initial mesh position and rotation
    carMesh.position.set(carState.x, carState.y, carState.z);
    carMesh.rotation.y = carState.angle;

    scene.add(carMesh);
    console.log(`Car ${playerIndex + 1} initialized and added to scene.`);
    return { state: carState, mesh: carMesh };
}


function initGame() {
    console.log(`Initializing game with ${numPlayers} player(s)...`);
    if (!startScreen || !gameContainer || !hud1 || !hud2 || !scene || !clock) {
        console.error("Cannot initialize game: Essential elements or Three.js setup missing.");
        return;
    }

    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    gameContainer.className = 'game-container'; // Reset classes efficiently
    if (numPlayers === 1) {
        gameContainer.classList.add('single-player');
        hud2.style.display = 'none';
    } else {
        gameContainer.classList.add('two-players');
        hud2.style.display = 'block';
    }

    // --- Initialize Cameras ---
    cameras = [];
    const width = window.innerWidth;
    const height = window.innerHeight;
    for (let i = 0; i < numPlayers; i++) {
        const aspect = (numPlayers === 1) ? width / height : (width / 2) / height;
        const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        // Initial position will be set in the first updateCamera call inside gameLoop
        cameras.push(camera);
    }
    console.log(`${cameras.length} cameras initialized.`);

    // --- Initialize Cars ---
    cars = [];
    const car1 = initCar(0, 0xff0000); // Player 1 car (Red)
    if (car1) cars.push(car1);
    hud1.textContent = `Vueltas P1: 0`;

    if (numPlayers === 2) {
        const car2 = initCar(1, 0x0000ff); // Player 2 car (Blue)
        if (car2) cars.push(car2);
        hud2.textContent = `Vueltas P2: 0`;
    }

    if (cars.length !== numPlayers) {
         console.error(`Failed to initialize all cars. Expected ${numPlayers}, got ${cars.length}`);
         // Maybe stop the game start here?
         return;
    }
    console.log(`${cars.length} cars ready.`);


    // --- Start Game ---
    gameRunning = true;
    clock.start(); // Start the Three.js clock
    console.log("Clock started. Starting game loop...");
    if (animationFrameId) { // Cancel previous loop if any
         cancelAnimationFrame(animationFrameId);
    }
    gameLoop(); // Start the main game loop
}

// ----------------------------------------
// --- Gamepad Handling Functions ---
// ----------------------------------------

function updateGamepadStatus() {
    if (!gamepadList || !gamepadStatus || !onePlayerBtn || !twoPlayersBtn) {
        // console.warn("DOM elements for gamepad status not ready yet.");
        return;
    }
    // console.log("Checking gamepad status...");

    let latestGamepads = {}; // Store currently detected gamepads in this check
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let listHTML = '';
    let foundP1 = false; // Gamepad index 0
    let foundP2 = false; // Gamepad index 1

    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.connected) { // Ensure it's connected
            // console.log(`Found connected gamepad at index ${gp.index}: ${gp.id}`);
            latestGamepads[gp.index] = gp; // Add to our current list
            listHTML += `<li>Gamepad ${gp.index}: ${gp.id.substring(0, 25)}... (Conectado)</li>`;
            if (gp.index === 0) foundP1 = true;
            if (gp.index === 1) foundP2 = true;
        }
    }

    // Update the global state AFTER checking all gamepads
    connectedGamepads = latestGamepads;

    gamepadList.innerHTML = listHTML || '<li>No hay gamepads conectados</li>';

    // Enable/Disable buttons based on FOUND gamepads in THIS check
    onePlayerBtn.disabled = !foundP1;
    twoPlayersBtn.disabled = !(foundP1 && foundP2);

    // Update status message
    const statusP = gamepadStatus.querySelector('p');
    if (!statusP) return;

    if (!foundP1) {
        statusP.textContent = "Conecta un Gamepad (será Jugador 1).";
    } else if (!foundP2) {
        statusP.textContent = "Gamepad P1 OK. Conecta otro (será Jugador 2).";
    } else {
        statusP.textContent = "Gamepads P1 y P2 listos.";
    }
     // console.log("Gamepad status updated. P1:", foundP1, "P2:", foundP2);
}


function handleGamepadInput() {
    // No need to call getGamepads again here if updateGamepadStatus is reliable on connect/disconnect
    // But for safety, we can query again. Let's use the connectedGamepads state populated by updateGamepadStatus.

    // Reset inputs for all potential players
    inputs.forEach(input => {
        input.accelerate = false;
        input.brake = false;
        input.left = false;
        input.right = false;
    });

    for (let i = 0; i < numPlayers; i++) {
        const gp = connectedGamepads[i]; // Get gamepad by expected index (0 for P1, 1 for P2)

        if (gp) { // Check if the expected gamepad exists and is connected
            try {
                const accelerateButton = gp.buttons[7] || gp.buttons[0]; // RT or A (common mappings)
                const brakeButton = gp.buttons[6] || gp.buttons[1];    // LT or B (common mappings)
                const steerAxis = gp.axes[0]; // Left stick horizontal
                const dpadLeft = gp.buttons[14];
                const dpadRight = gp.buttons[15];

                // Check button/axis existence before accessing properties
                if (accelerateButton) inputs[i].accelerate = accelerateButton.pressed || accelerateButton.value > 0.1;
                if (brakeButton) inputs[i].brake = brakeButton.pressed || brakeButton.value > 0.1;

                // Steering: Axis has priority, then D-pad
                if (steerAxis !== undefined && Math.abs(steerAxis) > 0.25) { // Use a deadzone
                     if (steerAxis < -0.25) inputs[i].left = true;
                     else if (steerAxis > 0.25) inputs[i].right = true;
                } else { // Check D-pad if axis is neutral or doesn't exist
                    if (dpadLeft && dpadLeft.pressed) inputs[i].left = true;
                    if (dpadRight && dpadRight.pressed) inputs[i].right = true;
                }
             } catch (error) {
                 console.error(`Error reading input for gamepad ${i}:`, error);
                 // Reset inputs for this player if error occurs
                 inputs[i] = { accelerate: false, brake: false, left: false, right: false };
             }

        } else {
             // console.warn(`Gamepad ${i} not available for input handling.`);
             // Inputs are already reset, so car won't move
        }
    }
}

// Function to attach listeners and perform initial check
function attachGamepadListenersAndCheck() {
    console.log("Attaching gamepad listeners...");
    window.addEventListener("gamepadconnected", (event) => {
        console.log(`>>> Gamepad conectado: Index ${event.gamepad.index}, ID: ${event.gamepad.id}`);
        // No need to manually add to connectedGamepads, updateGamepadStatus will find it
        updateGamepadStatus();
    });

    window.addEventListener("gamepaddisconnected", (event) => {
        console.log(`>>> Gamepad desconectado: Index ${event.gamepad.index}, ID: ${event.gamepad.id}`);
        // No need to manually remove, updateGamepadStatus will notice it's gone
        updateGamepadStatus();
        // Optional: Add logic here if a player disconnects mid-game (e.g., pause)
        if (gameRunning && !connectedGamepads[event.gamepad.index]) {
             console.warn(`Player ${event.gamepad.index + 1}'s gamepad disconnected during game!`);
             // Example: Pause game or show message
             // gameRunning = false;
             // cancelAnimationFrame(animationFrameId);
             // alert(`¡El gamepad del jugador ${event.gamepad.index + 1} se desconectó!`);
        }
    });

    // Perform the initial check AFTER attaching listeners
    console.log("Performing initial gamepad status check...");
    updateGamepadStatus();
}


// ----------------------------------------
// --- Game Logic Functions ---
// ----------------------------------------

function updateCar(car, input, deltaTime) {
    if (!car || !car.state || !car.mesh || !input) return; // Safety check

    const state = car.state;
    const mesh = car.mesh;

    // Apply Friction
    state.speed *= (1 - (1 - FRICTION) * deltaTime * 60); // Make friction somewhat frame-independent
    if (Math.abs(state.speed) < 0.05) state.speed = 0; // Snap to zero if very slow

    // Acceleration / Braking
    if (input.accelerate) {
        state.speed += ACCELERATION * deltaTime;
    }
    if (input.brake) {
        if (state.speed > 0.1) {
            state.speed -= BRAKING * deltaTime;
        } else {
            state.speed -= REVERSE_ACCELERATION * deltaTime;
        }
    }

    // Clamp Speed
    state.speed = Math.max(MAX_REVERSE_SPEED, Math.min(MAX_SPEED, state.speed));

    // Steering
    if (Math.abs(state.speed) > 0.1) {
        const turnFactor = 1 - Math.abs(state.speed) / (MAX_SPEED * 1.5); // Less turn at high speed
        const effectiveTurnSpeed = TURN_SPEED * turnFactor * deltaTime;
        const directionMultiplier = state.speed > 0 ? 1 : -1; // Invert steering in reverse

        if (input.left) {
            state.angle += effectiveTurnSpeed * directionMultiplier;
        }
        if (input.right) {
            state.angle -= effectiveTurnSpeed * directionMultiplier;
        }
    }

    // Normalize angle (optional, keeps it within 0 to 2*PI or -PI to PI)
    // state.angle = state.angle % (2 * Math.PI);

    // Update Position (XZ plane)
    state.x += state.speed * Math.sin(state.angle) * deltaTime;
    state.z += state.speed * Math.cos(state.angle) * deltaTime;

    // Update Mesh Position and Rotation
    mesh.position.set(state.x, state.y, state.z);
    mesh.rotation.y = state.angle;

    // --- Lap Counting Logic ---
    const flZ = FINISH_LINE_Z;
    const flX1 = FINISH_LINE_X_START;
    const flX2 = FINISH_LINE_X_END;
    // Check movement direction more accurately using speed and angle
    const speedComponentZ = state.speed * Math.cos(state.angle);
    const movingTowardsFinish = speedComponentZ < -0.1; // Moving significantly in negative Z

    // Check if car is within X bounds of finish line
    if (state.x > flX1 && state.x < flX2) {
        // Calculate previous Z position to detect crossing
        const prevZ = state.z - speedComponentZ * deltaTime;

        // Did it cross the line (z=flZ) in the correct direction this frame?
        const crossedLineThisFrame = prevZ >= flZ && state.z < flZ && movingTowardsFinish;

        if (crossedLineThisFrame && state.onFinishLineHalf) {
            state.lap++;
            console.log(`Player ${state.playerIndex + 1} completed lap ${state.lap}`);
            const hudElement = state.playerIndex === 0 ? hud1 : hud2;
            if (hudElement) hudElement.textContent = `Vueltas P${state.playerIndex + 1}: ${state.lap}`;
            state.onFinishLineHalf = false; // Needs to go around again
        }
    }
    // Condition to reset the 'onFinishLineHalf' flag:
    // If the car moves significantly "behind" the finish line (positive Z relative to finish)
    if (state.z > flZ + CAR_DEPTH) { // Give some buffer
         state.onFinishLineHalf = true; // Ready to cross again
    }


    // --- Basic Track Boundaries ---
    // This is very basic. Consider a physics library or more complex collision detection.
    const currentRadiusSq = (state.x - TRACK_CENTER_X)**2 + (state.z - TRACK_CENTER_Z)**2; // Using Z for radius now
    const outerTrackLimit = TRACK_WIDTH_RADIUS + TRACK_THICKNESS / 2;
    const innerTrackLimit = TRACK_WIDTH_RADIUS - TRACK_THICKNESS / 2;

    if (currentRadiusSq > outerTrackLimit**2) {
        state.speed *= 0.9; // Slow down on grass
        // Optional: push back slightly (can feel unnatural)
        // const angleToCenter = Math.atan2(state.x - TRACK_CENTER_X, state.z - TRACK_CENTER_Z);
        // state.x -= Math.sin(angleToCenter) * 0.1;
        // state.z -= Math.cos(angleToCenter) * 0.1;
    } else if (currentRadiusSq < innerTrackLimit**2) {
        state.speed *= 0.9; // Slow down on inner grass
        // Optional: push back slightly
        // const angleToCenter = Math.atan2(state.x - TRACK_CENTER_X, state.z - TRACK_CENTER_Z);
        // state.x += Math.sin(angleToCenter) * 0.1;
        // state.z += Math.cos(angleToCenter) * 0.1;
    }
}

function updateCamera(car, camera, deltaTime = 0.016) {
    if (!car || !car.state || !car.mesh || !camera) return;

    const state = car.state;
    const mesh = car.mesh;

    // Calculate desired camera position relative to car's rotation
    const camOffsetX = Math.sin(state.angle) * CAMERA_DISTANCE;
    const camOffsetZ = Math.cos(state.angle) * CAMERA_DISTANCE;

    // Target position for the camera
    const desiredCamPos = new THREE.Vector3(
        state.x - camOffsetX,        // Behind the car based on angle
        state.y + CAMERA_HEIGHT,     // Above the car
        state.z - camOffsetZ         // Behind the car based on angle
    );

    // Smooth camera movement using lerp
    // Adjust the lerp factor (alpha) for smoothness vs responsiveness.
    // A frame-independent lerp is tricky. A simple approach:
    const lerpFactor = 1.0 - Math.pow(0.01, deltaTime * 10); // Adjust base (0.01) and multiplier (10)
    // Or a simpler, less accurate constant lerp:
    // const lerpFactor = 0.08;

    camera.position.lerp(desiredCamPos, lerpFactor);

    // Target point for the camera to look at (slightly in front of the car)
    const lookAtPos = new THREE.Vector3(
        state.x + Math.sin(state.angle) * CAR_DEPTH * 0.5, // Look slightly ahead
        state.y, // Look at the car's height level
        state.z + Math.cos(state.angle) * CAR_DEPTH * 0.5
    );

     // Make camera look at the calculated point
    camera.lookAt(lookAtPos);
}


// ----------------------------------------
// --- Drawing / Rendering Functions ---
// ----------------------------------------

function drawMinimap() {
    if (!minimapCtx || !cars) return; // Ensure context and cars exist

    const mapW = 150; // CSS width
    const mapH = 100; // CSS height
    minimapCtx.clearRect(0, 0, mapW, mapH); // Use CSS dimensions for clearing

    // Calculate scaling factors - Fit the *outer* bounds of the track
    const trackOuterDiameterX = (TRACK_WIDTH_RADIUS + TRACK_THICKNESS / 2) * 2;
    const trackOuterDiameterZ = (TRACK_HEIGHT_RADIUS + TRACK_THICKNESS / 2) * 2; // Use Z radius for height
    const padding = 0.9; // 10% padding around edges
    const scaleX = mapW / trackOuterDiameterX * padding;
    const scaleZ = mapH / trackOuterDiameterZ * padding; // Use Z diameter
    const scale = Math.min(scaleX, scaleZ); // Maintain aspect ratio

    const mapCenterX = mapW / 2;
    const mapCenterY = mapH / 2;

    // Convert world coords (x, z) to minimap coords (mx, my)
    const worldToMinimap = (wx, wz) => ({
        x: mapCenterX + (wx - TRACK_CENTER_X) * scale,
        y: mapCenterY + (wz - TRACK_CENTER_Z) * scale // World Z maps to Minimap Y
    });

    // Draw Track Outline (Ellipse approximation)
    minimapCtx.strokeStyle = '#AAAAAA';
    minimapCtx.lineWidth = Math.max(1, TRACK_THICKNESS * scale * 0.8); // Track thickness on map
    minimapCtx.beginPath();
    minimapCtx.ellipse(
        mapCenterX, mapCenterY,
        TRACK_WIDTH_RADIUS * scale, // Width radius
        TRACK_HEIGHT_RADIUS * scale, // Height radius (using the defined Z radius)
        0, 0, Math.PI * 2
    );
    minimapCtx.stroke();

     // Draw Finish Line
     const flMapStart = worldToMinimap(FINISH_LINE_X_START, FINISH_LINE_Z);
     const flMapEnd = worldToMinimap(FINISH_LINE_X_END, FINISH_LINE_Z);
     minimapCtx.strokeStyle = '#FFFFFF';
     minimapCtx.lineWidth = 2; // Fixed width for visibility
     minimapCtx.beginPath();
     minimapCtx.moveTo(flMapStart.x, flMapStart.y);
     minimapCtx.lineTo(flMapEnd.x, flMapEnd.y);
     minimapCtx.stroke();

    // Draw Cars
    cars.forEach(car => {
        if (!car || !car.state) return;
        const pos = worldToMinimap(car.state.x, car.state.z);
        // Use the THREE.Color hex value directly
        minimapCtx.fillStyle = `#${car.state.color.toString(16).padStart(6, '0')}`;
        minimapCtx.beginPath();
        minimapCtx.arc(pos.x, pos.y, 3, 0, Math.PI * 2); // Small circle for car
        minimapCtx.fill();
         // Optional: Draw direction indicator
         minimapCtx.strokeStyle = '#FFFFFF';
         minimapCtx.lineWidth = 1;
         minimapCtx.beginPath();
         minimapCtx.moveTo(pos.x, pos.y);
         minimapCtx.lineTo(
             pos.x + Math.sin(car.state.angle) * 5, // Use car angle
             pos.y + Math.cos(car.state.angle) * 5
         );
         minimapCtx.stroke();
    });
}


function render() {
    if (!renderer || !scene || !cameras || cameras.length === 0) {
        // console.warn("Render called before initialization is complete.");
        return;
    }
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Ensure renderer size is up-to-date (important after resize)
    renderer.setSize(width, height);

    // Clear the entire canvas once
    renderer.setViewport(0, 0, width, height);
    renderer.setScissor(0, 0, width, height);
    // renderer.clear(); // Clearing handled by scene background usually

    if (numPlayers === 1) {
        // Render Player 1 (Full Screen)
        if (!cameras[0]) return; // Check if camera exists
        renderer.setViewport(0, 0, width, height);
        renderer.setScissor(0, 0, width, height);
        // Check aspect ratio just in case
        if (Math.abs(cameras[0].aspect - width/height) > 0.01) {
             cameras[0].aspect = width / height;
             cameras[0].updateProjectionMatrix();
        }
        renderer.render(scene, cameras[0]);
    } else {
        // Render Player 1 (Left Half)
        if (!cameras[0]) return;
        const halfWidth = Math.floor(width / 2);
        const p1Aspect = halfWidth / height;
         if (Math.abs(cameras[0].aspect - p1Aspect) > 0.01) {
             cameras[0].aspect = p1Aspect;
             cameras[0].updateProjectionMatrix();
        }
        renderer.setViewport(0, 0, halfWidth, height);
        renderer.setScissor(0, 0, halfWidth, height);
        renderer.render(scene, cameras[0]);

        // Render Player 2 (Right Half)
        if (!cameras[1]) return;
        const p2Width = width - halfWidth; // Remaining width
        const p2Aspect = p2Width / height;
        if (Math.abs(cameras[1].aspect - p2Aspect) > 0.01) {
            cameras[1].aspect = p2Aspect;
            cameras[1].updateProjectionMatrix();
        }
        renderer.setViewport(halfWidth, 0, p2Width, height);
        renderer.setScissor(halfWidth, 0, p2Width, height);
        renderer.render(scene, cameras[1]);
    }
}

// ----------------------------------------
// --- Main Game Loop ---
// ----------------------------------------

function gameLoop(timestamp) {
    // Request next frame immediately
    animationFrameId = requestAnimationFrame(gameLoop);

    if (!gameRunning || !clock || !stats || !cars || !cameras || cameras.length < numPlayers) {
        // console.log("Game loop dependencies not ready, skipping frame.");
        return; // Don't run if game isn't ready or stopped
    }

    stats.begin(); // Start FPS counter

    const deltaTime = clock.getDelta(); // Time since last frame

    // 1. Handle Input
    handleGamepadInput(); // Reads into `inputs` array

    // 2. Update Game State (Cars and Cameras)
    cars.forEach((car, index) => {
        if (inputs[index]) { // Ensure input state exists for this car
            updateCar(car, inputs[index], deltaTime);
        }
        if (cameras[index]) { // Ensure camera exists for this car
             updateCamera(car, cameras[index], deltaTime);
        }
    });

    // 3. Render 3D Scene (Handles split screen)
    render();

    // 4. Draw 2D Minimap Overlay
    drawMinimap();

    stats.end(); // End FPS counter
}

// ----------------------------------------
// --- Global Event Listeners & Initial Setup ---
// ----------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Fully Loaded and Parsed");

    // Basic check for essential elements
    if (!gameCanvas || !startScreen || !gameContainer || !statsOutput || !minimapCanvas) {
         console.error("Essential DOM elements missing! Aborting setup.");
         alert("Error: No se pudieron encontrar elementos clave de la página. Intenta recargar.");
         return;
    }

    // --- Setup Core Components ---
    setupThreeJS(); // Setup renderer, scene, lights, track etc.

    // --- Attach UI Event Listeners ---
    if (onePlayerBtn) {
        onePlayerBtn.addEventListener('click', () => {
            // Check if the required gamepad (index 0) is actually connected NOW
            if (!connectedGamepads[0]) {
                 alert("Por favor, conecta un Gamepad (será Jugador 1).");
                 updateGamepadStatus(); // Refresh status just in case
                 return;
            }
            numPlayers = 1;
            initGame();
        });
    } else { console.error("onePlayerBtn not found!"); }

    if (twoPlayersBtn) {
        twoPlayersBtn.addEventListener('click', () => {
             // Check if required gamepads (index 0 AND 1) are connected NOW
            if (!connectedGamepads[0] || !connectedGamepads[1]) {
                 alert("Se necesitan dos Gamepads conectados (índice 0 y 1).");
                 updateGamepadStatus(); // Refresh status
                 return;
             }
            numPlayers = 2;
            initGame();
        });
    } else { console.error("twoPlayersBtn not found!"); }


    // --- Setup Gamepad Handling ---
    attachGamepadListenersAndCheck(); // Attach listeners and run initial check

    // --- Attach Window Resize Listener ---
    window.addEventListener('resize', () => {
        // Only resize if renderer and cameras are initialized
        if (!renderer || !cameras || cameras.length === 0 || !gameRunning) return;

        const width = window.innerWidth;
        const height = window.innerHeight;

        // Renderer size is handled within render() now to ensure it matches viewport
        // renderer.setSize(width, height);

        // Update camera aspect ratios immediately
        cameras.forEach((camera, index) => {
            const aspect = (numPlayers === 1) ? width / height : (index === 0 ? Math.floor(width / 2) / height : (width - Math.floor(width / 2)) / height);
             if (Math.abs(camera.aspect - aspect) > 0.01) { // Update only if changed significantly
                 camera.aspect = aspect;
                 camera.updateProjectionMatrix();
             }
        });

        // Optional: Re-setup minimap if DPR could change or size needs recalculating
         setupMinimap();

        console.log("Window resized, cameras updated.");
    }, false); // Use passive: false if needed, but usually okay

    console.log("Initial setup complete. Waiting for player selection.");

}); // End of DOMContentLoaded