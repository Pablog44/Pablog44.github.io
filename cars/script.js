import * as THREE from 'three';
// Opcional: Controles de Órbita para depuración
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Variables Globales ---
let scene, camera, renderer;
let playerCar, aiCars = [];
let keys = { w: false, s: false, a: false, d: false };
let clock = new THREE.Clock();

// Configuración del juego
const RACE_LAPS = 3;
const TRACK_RADIUS_X = 40; // Radio mayor del óvalo
const TRACK_RADIUS_Z = 25; // Radio menor del óvalo
const TRACK_WIDTH = 8;
const TRACK_THICKNESS = 0.2; // How thick the road mesh is
const CAR_LENGTH = 3;
const CAR_WIDTH = 1.5;
const CAR_HEIGHT_OFFSET = 0.5 + TRACK_THICKNESS; // Base car height + track thickness

// Estado del jugador
let playerState = {
    speed: 0,
    angle: 0, // Ángulo en el óvalo (0 a 2*PI)
    // Start slightly above the track surface
    position: new THREE.Vector3(TRACK_RADIUS_X, CAR_HEIGHT_OFFSET, 0),
    rotationY: -Math.PI / 2, // Rotación del coche
    lap: 0,
    progress: 0, // Para detectar cruce de meta (0 a 1)
    offTrack: false,
    finished: false
};

// Estado de la IA
let aiStates = [];
const AI_COUNT = 5;
const AI_SPEED = 15; // Velocidad constante de la IA

// Elementos UI
const lapCountElement = document.getElementById('lap-count');
const messageElement = document.getElementById('message');

let gameRunning = true;

// --- Inicialización ---
function init() {
    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Color cielo
    scene.fog = new THREE.Fog(0x87ceeb, 100, 350); // Adjusted fog distance

    // Cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Posición inicial de la cámara (detrás y arriba del coche) - will be set by updateCameraPosition
    // camera.position.set(TRACK_RADIUS_X + 10, 10, 0); // Temp position before first update
    // camera.lookAt(playerState.position);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Habilitar sombras
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Slightly brighter ambient
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Slightly stronger directional
    directionalLight.position.set(70, 100, 50); // Adjust light position
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; // Higher res shadows
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 300; // Adjusted shadow camera frustum
    directionalLight.shadow.camera.left = -120; // Wider shadow area
    directionalLight.shadow.camera.right = 120;
    directionalLight.shadow.camera.top = 120;
    directionalLight.shadow.camera.bottom = -120;
    scene.add(directionalLight);
    // const shadowHelper = new THREE.CameraHelper( directionalLight.shadow.camera ); // Debug shadows
    // scene.add( shadowHelper );


    // Suelo
    const groundGeometry = new THREE.PlaneGeometry(600, 600); // Larger ground
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x55aa55 }); // Verde hierba
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Pista Plana 3D
    createFlatTrack();

    // Coche del Jugador
    playerCar = createCar(0x0000ff); // Coche azul
    playerCar.position.copy(playerState.position);
    playerCar.rotation.y = playerState.rotationY;
    scene.add(playerCar);

    // Coches IA
    for (let i = 0; i < AI_COUNT; i++) {
        const aiCar = createCar(getRandomColor());
        const angleOffset = (i + 1) * (Math.PI / (AI_COUNT + 2)); // Adjusted spacing
        const startAngle = angleOffset;
        const startPos = getOvalPosition(startAngle);

        aiStates[i] = {
            car: aiCar,
            angle: startAngle,
            lap: 0,
            progress: startAngle / (2 * Math.PI),
            finished: false,
            speed: AI_SPEED + Math.random() * 3 - 1.5 // Pequeña variación de velocidad
        };
        // Set AI car position slightly above track
        aiCar.position.set(startPos.x, CAR_HEIGHT_OFFSET, startPos.z);
        aiCar.rotation.y = getOvalTangentAngle(startAngle) + Math.PI/2; // Orientar coche
        scene.add(aiCar);
        aiCars.push(aiCar);
    }

    // Decoración: Montañas y Casas
    createScenery();

    // Update camera for the first time AFTER player car is created
    updateCameraPosition();
    camera.lookAt(playerCar.position); // Initial lookAt

    // Controles (Opcional para depuración)
    // const controls = new OrbitControls(camera, renderer.domElement);

    // Event Listeners
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onWindowResize);

    // Iniciar Loop
    animate();
}

// --- Funciones de Creación ---
function createCar(color) {
    const carBodyGeometry = new THREE.BoxGeometry(CAR_LENGTH, 0.8, CAR_WIDTH); // Slightly flatter body
    const carMaterial = new THREE.MeshLambertMaterial({ color: color });
    const carMesh = new THREE.Mesh(carBodyGeometry, carMaterial);
    carMesh.castShadow = true;
    carMesh.receiveShadow = true;

    // Offset the body slightly up so the wheels are closer to the car's origin (y=0)
    carBodyGeometry.translate(0, 0.4, 0);

     // Añadir "ruedas" simples como referencia visual
    const wheelRadius = 0.35;
    const wheelThickness = 0.3;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 16);
    wheelGeo.rotateX(Math.PI / 2); // Rotate wheels to stand upright
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 }); // Darker wheels

    const wheelYOffset = -0.1; // How low the wheels sit relative to car origin

    const flWheel = new THREE.Mesh(wheelGeo, wheelMat);
    flWheel.position.set(CAR_LENGTH * 0.4, wheelYOffset, CAR_WIDTH / 2);
    carMesh.add(flWheel);

    const frWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frWheel.position.set(CAR_LENGTH * 0.4, wheelYOffset, -CAR_WIDTH / 2);
    carMesh.add(frWheel);

    const rlWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rlWheel.position.set(-CAR_LENGTH * 0.4, wheelYOffset, CAR_WIDTH / 2);
    carMesh.add(rlWheel);

    const rrWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rrWheel.position.set(-CAR_LENGTH * 0.4, wheelYOffset, -CAR_WIDTH / 2);
    carMesh.add(rrWheel);

    return carMesh;
}

function createFlatTrack() {
    const segments = 150; // More segments for smoother curve extrusion
    const curvePoints = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = TRACK_RADIUS_X * Math.cos(angle);
        const z = TRACK_RADIUS_Z * Math.sin(angle);
        curvePoints.push(new THREE.Vector3(x, 0, z)); // Path is at Y=0
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints, true); // Curva cerrada

    // Define the shape of the track cross-section (a flat rectangle)
    const trackShape = new THREE.Shape();
    const halfWidth = TRACK_WIDTH / 2;
    trackShape.moveTo(-halfWidth, 0); // Start bottom-left (relative)
    trackShape.lineTo(halfWidth, 0);  // Bottom-right
    trackShape.lineTo(halfWidth, TRACK_THICKNESS); // Top-right
    trackShape.lineTo(-halfWidth, TRACK_THICKNESS); // Top-left
    trackShape.closePath(); // Close the shape

    // Extrude this shape along the oval curve
    const extrudeSettings = {
        steps: segments * 2, // Need enough steps for smooth extrusion
        bevelEnabled: false,
        extrudePath: curve
    };

    const trackGeometry = new THREE.ExtrudeGeometry(trackShape, extrudeSettings);
    const trackMaterial = new THREE.MeshStandardMaterial({ // Use StandardMaterial for better lighting/shadows
        color: 0x444444, // Color asfalto
        metalness: 0.1,
        roughness: 0.8
    });
    const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    trackMesh.receiveShadow = true;
    // trackMesh.castShadow = true; // Optional: track can cast shadow onto itself/ground
    scene.add(trackMesh);

    // Línea de meta (ajustar Y)
    const lineGeo = new THREE.PlaneGeometry(TRACK_WIDTH, 1);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const finishLine = new THREE.Mesh(lineGeo, lineMat);
    // Position slightly above the track surface
    finishLine.position.set(TRACK_RADIUS_X, TRACK_THICKNESS + 0.01, 0);
    finishLine.rotation.x = -Math.PI / 2;
    // finishLine.rotation.z = -Math.PI / 2; // Should rotate around Y to align with track tangent
    finishLine.rotation.y = -Math.PI / 2; // Align with the track direction at the finish line
    scene.add(finishLine);
}

function createScenery() {
    // Montañas Distantes
    const mountainMaterial = new THREE.MeshLambertMaterial({ color: 0x7d7464 }); // Brownish grey
    const snowMaterial = new THREE.MeshLambertMaterial({ color: 0xeeeeee }); // White snow caps

    for (let i = 0; i < 15; i++) { // Add several mountains
        const height = Math.random() * 80 + 50; // Random height 50-130
        const radius = Math.random() * 40 + 20; // Random radius 20-60
        const mountainGeometry = new THREE.ConeGeometry(radius, height, 8); // Low poly cone
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);

        // Position randomly far away
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 200 + 150; // Distance 150-350
        mountain.position.set(
            Math.cos(angle) * distance,
            height / 2 - 2, // Base slightly below ground level
            Math.sin(angle) * distance
        );
        mountain.castShadow = false; // Optimization
        mountain.receiveShadow = true; // Can receive shadows from clouds/sun if added
        scene.add(mountain);

        // Add snow cap (optional)
        if (height > 80 && Math.random() > 0.3) {
             const snowHeight = height * 0.3;
             const snowRadius = radius * (snowHeight / height) * 0.8; // Tapered snow
             const snowGeometry = new THREE.ConeGeometry(snowRadius, snowHeight, 8);
             const snow = new THREE.Mesh(snowGeometry, snowMaterial);
             snow.position.y = height * 0.5 - snowHeight * 0.4; // Position snow cap on top
             mountain.add(snow); // Add as child of the mountain
        }
    }

    // Casas Simples (más cerca)
    const houseBaseMaterial = new THREE.MeshLambertMaterial({ color: 0xaa8866 }); // Beige wall
    const houseRoofMaterial = new THREE.MeshLambertMaterial({ color: 0xcc4444 }); // Red roof

     for (let i = 0; i < 10; i++) { // Add several houses
        const baseWidth = Math.random() * 5 + 4; // 4-9
        const baseDepth = Math.random() * 4 + 3; // 3-7
        const baseHeight = Math.random() * 3 + 3; // 3-6

        const house = new THREE.Group(); // Group base and roof

        // Base
        const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
        const baseMesh = new THREE.Mesh(baseGeometry, houseBaseMaterial);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        baseMesh.position.y = baseHeight / 2; // Sit base on ground
        house.add(baseMesh);

        // Roof (simple prism shape)
        const roofGeometry = new THREE.BufferGeometry();
        const hW = baseWidth / 2;
        const hD = baseDepth / 2;
        const rH = baseHeight * 0.6; // Roof height
        const vertices = new Float32Array( [
             -hW, baseHeight, -hD,  // 0: bottom-left-back
              hW, baseHeight, -hD,  // 1: bottom-right-back
              hW, baseHeight,  hD,  // 2: bottom-right-front
             -hW, baseHeight,  hD,  // 3: bottom-left-front
               0, baseHeight + rH, -hD, // 4: top-ridge-back
               0, baseHeight + rH,  hD  // 5: top-ridge-front
        ] );
        const indices = [
            0, 1, 4, // Back gable
            3, 5, 2, // Front gable
            0, 3, 5, 0, 5, 4, // Left roof side
            1, 2, 5, 1, 5, 4  // Right roof side
        ];
        roofGeometry.setIndex( indices );
        roofGeometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
        roofGeometry.computeVertexNormals(); // Important for lighting
        const roofMesh = new THREE.Mesh(roofGeometry, houseRoofMaterial);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        roofMesh.position.y = 0; // Position relative to group origin
        house.add(roofMesh);


        // Position house randomly around the outside of the track
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(TRACK_RADIUS_X, TRACK_RADIUS_Z) + TRACK_WIDTH + 10 + Math.random() * 30; // Just outside track + buffer
         house.position.set(
            Math.cos(angle) * distance,
            0, // Group origin at ground level
            Math.sin(angle) * distance
        );
        house.rotation.y = Math.random() * Math.PI * 2; // Random orientation
        scene.add(house);
     }
}


// --- Funciones de Utilidad ---
function getOvalPosition(angle) {
    const x = TRACK_RADIUS_X * Math.cos(angle);
    const z = TRACK_RADIUS_Z * Math.sin(angle);
    // Return position ON the track surface (Y=TRACK_THICKNESS)
    // but path itself is defined at Y=0. Function name is slightly ambiguous now.
    // Let's keep it returning the path position at Y=0 for calculations.
    return new THREE.Vector3(x, 0, z);
}

// Calcula el ángulo de la tangente en un punto del óvalo (para orientar el coche)
function getOvalTangentAngle(angle) {
    // Derivada de la posición paramétrica: (-Rx*sin(t), Rz*cos(t))
    const dx = -TRACK_RADIUS_X * Math.sin(angle);
    const dz = TRACK_RADIUS_Z * Math.cos(angle);
    // atan2 nos da el ángulo correcto en el cuadrante adecuado
    return Math.atan2(dz, dx);
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// --- Control de Eventos ---
function onKeyDown(event) {
    switch (event.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 's': keys.s = true; break;
        case 'a': keys.a = true; break;
        case 'd': keys.d = true; break;
        case 'r': // Simple Reset on 'R' if game over
            if (!gameRunning) {
                window.location.reload(); // Easiest way to restart fully
            }
            break;
    }
}

function onKeyUp(event) {
     switch (event.key.toLowerCase()) {
        case 'w': keys.w = false; break;
        case 's': keys.s = false; break;
        case 'a': keys.a = false; break;
        case 'd': keys.d = false; break;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Lógica de Actualización ---
function updatePlayer(deltaTime) {
    if (playerState.finished) return; // Don't update if finished, but allow offTrack reset

    const maxSpeed = 30.0;
    const acceleration = 25.0;
    const deceleration = 35.0;
    const friction = 10.0;
    const turnSpeed = 2.0; // Radianes por segundo

    // If offTrack, only allow reset (or maybe slow return)
    if (playerState.offTrack) {
         // Simple stop for now. Could implement slow speed or force reset later.
         playerState.speed = 0;
         // The 'R' keydown handler handles the reset/reload
         return;
    }


    // Aceleración / Deceleración
    if (keys.w) {
        playerState.speed += acceleration * deltaTime;
    } else if (keys.s) {
        playerState.speed -= deceleration * deltaTime;
    } else {
        // Aplicar fricción si no se acelera ni frena
        if (playerState.speed > 0) {
            playerState.speed -= friction * deltaTime;
            playerState.speed = Math.max(0, playerState.speed); // No ir por debajo de 0
        } else if (playerState.speed < 0) {
            playerState.speed += friction * deltaTime;
            playerState.speed = Math.min(0, playerState.speed); // No ir por encima de 0 (en reversa)
        }
    }

    // Limitar velocidad máxima
    playerState.speed = Math.max(-maxSpeed / 2, Math.min(maxSpeed, playerState.speed)); // Mitad de velocidad en reversa

    // Giro (solo si hay movimiento)
    if (Math.abs(playerState.speed) > 0.1) {
         const turnDirection = playerState.speed > 0 ? 1 : -1; // Invertir giro en reversa
         // Adjust turn rate based on speed (less turn at high speed) - optional realism
         const speedFactor = 1.0 - Math.min(1.0, Math.abs(playerState.speed) / (maxSpeed * 1.5)); // Full turn at low speed, less at high
        if (keys.a) {
            playerState.rotationY += turnSpeed * deltaTime * turnDirection * (0.5 + speedFactor * 0.5);
        }
        if (keys.d) {
            playerState.rotationY -= turnSpeed * deltaTime * turnDirection * (0.5 + speedFactor * 0.5);
        }
    }


    // Calcular movimiento (forward/backward based on car's rotation)
    const moveX = Math.sin(playerState.rotationY) * playerState.speed * deltaTime;
    const moveZ = Math.cos(playerState.rotationY) * playerState.speed * deltaTime;

    playerState.position.x -= moveX; // Adjust based on car model orientation if needed
    playerState.position.z -= moveZ; // Adjust based on car model orientation if needed

    // Keep car snapped to track height (can be improved with raycasting later)
    playerState.position.y = CAR_HEIGHT_OFFSET;

    // Actualizar posición y rotación del mesh
    playerCar.position.copy(playerState.position);
    playerCar.rotation.y = playerState.rotationY;

    // Detección de salida de pista (simplificado)
    checkOffTrack(playerState, playerCar);

    // Detección de vuelta (only if not off track)
    if (!playerState.offTrack) {
        checkLapCompletion(playerState, playerCar);
    }
}

function updateAI(deltaTime) {
    aiStates.forEach(state => {
        if (state.finished) return;

        // Mover la IA a lo largo del óvalo a velocidad constante
        const distanceToMove = state.speed * deltaTime;
        // More accurate circumference approximation for ellipse
        // Ramanujan's approximation: pi * [ 3(a+b) - sqrt((3a+b)(a+3b)) ]
        const a = TRACK_RADIUS_X;
        const b = TRACK_RADIUS_Z;
        const circumferenceApproximation = Math.PI * ( 3*(a+b) - Math.sqrt((3*a+b)*(a+3*b)) );
        const angleChange = distanceToMove / (circumferenceApproximation / (2 * Math.PI)); // angle = dist / radius_equivalent

        state.angle += angleChange;
        state.angle %= (2 * Math.PI); // Mantener ángulo entre 0 y 2*PI

        const newPos = getOvalPosition(state.angle); // Get position on path (Y=0)
        // Set car position above the track surface
        state.car.position.set(newPos.x, CAR_HEIGHT_OFFSET, newPos.z);

        // Orientar el coche IA según la tangente del óvalo
        const tangentAngle = getOvalTangentAngle(state.angle);
         // Adjust rotation based on default model orientation
         // If car model faces +Z by default, tangent gives direction vector, atan2(dz, dx) is angle from +X axis.
         // Rotation Y is angle from +Z axis (clockwise negative).
         // So rotationY should be tangentAngle - PI/2 or +PI/2 depending on model and coordinate system. Test and adjust.
         // My car model faces -Z when rotation.y = 0. Tangent angle is direction of movement.
        state.car.rotation.y = tangentAngle - Math.PI/2; // Adjusted based on testing


        checkLapCompletion(state, state.car);
    });
}

function checkOffTrack(state, car) {
    if (state !== playerState || state.offTrack) return; // Only check player, and only if not already off track

    // Calculate the theoretical center point of the track at the car's current angle
    const currentAngle = Math.atan2(car.position.z / TRACK_RADIUS_Z, car.position.x / TRACK_RADIUS_X);
    const centerPointOnPath = getOvalPosition(currentAngle); // Y=0

    // Calculate the horizontal distance from the car to this center point
    const dx = car.position.x - centerPointOnPath.x;
    const dz = car.position.z - centerPointOnPath.z;
    const distanceToCenterLine = Math.sqrt(dx*dx + dz*dz);

    const trackLimit = TRACK_WIDTH / 2 + CAR_WIDTH * 0.5; // Allow half car width overhang

    if (distanceToCenterLine > trackLimit) {
        console.log("Fuera de pista!");
        state.offTrack = true;
        state.speed = 0; // Stop car
        showGameOverMessage("¡Te has salido! Pulsa R para reiniciar", true);
        gameRunning = false; // Stop game loop updates
    }
}


function checkLapCompletion(state, car) {
    if (state.finished) return;

    // Store previous progress before calculating new angle
    const oldProgress = state.progress;

    // Calculate current angle based on the car's actual X/Z position
    // Ensure division by zero is handled if radii are different and car is at origin (unlikely)
    let currentAngle = Math.atan2(car.position.z / (TRACK_RADIUS_Z || 1), car.position.x / (TRACK_RADIUS_X || 1));
    if (currentAngle < 0) {
        currentAngle += 2 * Math.PI; // Ensure angle is 0 to 2PI
    }

    // Calculate progress (0 to 1) based on angle
    const currentProgress = currentAngle / (2 * Math.PI);

    // Detect crossing the finish line (angle passes 0, progress goes from high to low)
    // Thresholds adjusted slightly to be more robust near 0/2PI
    if (oldProgress > 0.9 && currentProgress < 0.1) {
        state.lap++;
        // console.log(`Coche ${state === playerState ? 'Jugador' : 'IA ' + aiStates.indexOf(state)} completó vuelta ${state.lap}`);

        if (state === playerState) {
            lapCountElement.textContent = state.lap;
            if (state.lap >= RACE_LAPS) {
                state.finished = true;
                showGameOverMessage("¡Has Ganado!", false);
                gameRunning = false;
            }
        } else {
             if (state.lap >= RACE_LAPS && !playerState.finished) {
                 // Check if any AI finished *before* the player
                 let playerFinished = playerState.finished;
                 let aiWon = aiStates.some(s => s.finished);
                 if (aiWon && !playerFinished) {
                    // An AI finished, and player hasn't yet. Player loses.
                    showGameOverMessage("¡Has Perdido! La IA ganó.", true);
                    playerState.finished = true; // Mark player as finished (lost)
                    gameRunning = false;
                 }
                 state.finished = true; // Mark this specific AI as finished
             }
        }
    }
    // Detect crossing backwards (optional, prevents cheating)
    else if (oldProgress < 0.1 && currentProgress > 0.9) {
        // state.lap--; // Penalize or ignore
        // console.log("Vuelta anulada - Meta cruzada en reversa");
    }

    // Update progress for the next frame
    state.progress = currentProgress;
}


function updateCameraPosition() {
     if (!playerCar) return;

     // Desired camera position relative to car (behind and up)
    const camDist = 12; // Distance behind the car
    const camHeight = 5; // Height above the car's position

    // Calculate offset based on car's rotation
    const dx = Math.sin(playerCar.rotation.y) * camDist;
    const dz = Math.cos(playerCar.rotation.y) * camDist;

    // Target camera position
    const targetCamPos = new THREE.Vector3(
        playerCar.position.x + dx, // Add offset to car position
        playerCar.position.y + camHeight,
        playerCar.position.z + dz
    );

    // Smoothly move camera towards the target position using LERP
    camera.position.lerp(targetCamPos, 0.1); // Adjust LERP factor (0.05=slower, 0.2=faster)

    // Make the camera look slightly ahead of the car
    const lookAheadDist = 7; // How many units in front of the car to look at
    const lookAtPos = new THREE.Vector3().copy(playerCar.position);
    lookAtPos.x -= Math.sin(playerCar.rotation.y) * lookAheadDist; // Adjust based on car model orientation
    lookAtPos.z -= Math.cos(playerCar.rotation.y) * lookAheadDist; // Adjust based on car model orientation
    // lookAtPos.y = playerCar.position.y + 1.0; // Optional: Look slightly above car center

    camera.lookAt(lookAtPos);
}


function showGameOverMessage(msg, isLoss) {
    let gameOverDiv = document.getElementById('game-over');
    if (!gameOverDiv) {
        gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over';
        // Apply basic styles if CSS doesn't load
        gameOverDiv.style.position = 'absolute';
        gameOverDiv.style.top = '50%';
        gameOverDiv.style.left = '50%';
        gameOverDiv.style.transform = 'translate(-50%, -50%)';
        gameOverDiv.style.fontSize = '3em';
        gameOverDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        gameOverDiv.style.padding = '20px';
        gameOverDiv.style.borderRadius = '10px';
        gameOverDiv.style.textAlign = 'center';
        gameOverDiv.style.zIndex = '101';
        document.body.appendChild(gameOverDiv);
    }
    gameOverDiv.textContent = msg;
    gameOverDiv.style.color = isLoss ? 'red' : 'lime';
    gameOverDiv.style.display = 'block';

    // Reset message is now part of the game over message itself
    messageElement.style.display = 'none'; // Hide the controls message

}

// --- Loop Principal ---
function animate() {
    // Keep requesting frames even if game logic stops, to allow reset/reload
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Only update game logic if running
    if (gameRunning) {
        updatePlayer(deltaTime);
        updateAI(deltaTime);
    }

    // Always update camera and render
    updateCameraPosition();
    renderer.render(scene, camera);
}

// --- Iniciar el juego ---
init();