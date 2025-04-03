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
const TRACK_THICKNESS = 0.5; // Grosor de la malla de la carretera // *** AJUSTE *** Aumentado ligeramente para visibilidad
const CAR_LENGTH = 3;
const CAR_WIDTH = 1.5;
// *** CAMBIO *** Altura del centro del coche sobre la superficie de la pista (Y=0)
const CAR_HEIGHT_OFFSET = 0.5;

// Estado del jugador
let playerState = {
    speed: 0,
    angle: 0, // Ángulo en el óvalo (0 a 2*PI)
    // *** CAMBIO *** Posición Y inicial ajustada a la nueva altura sobre la pista Y=0
    position: new THREE.Vector3(TRACK_RADIUS_X, CAR_HEIGHT_OFFSET, 0),
    rotationY: -Math.PI / 2, // Rotación del coche (orientación inicial)
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
    scene.fog = new THREE.Fog(0x87ceeb, 100, 350);

    // Cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // La posición inicial se establecerá en updateCameraPosition después de crear el coche

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(70, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 300;
    directionalLight.shadow.camera.left = -120;
    directionalLight.shadow.camera.right = 120;
    directionalLight.shadow.camera.top = 120;
    directionalLight.shadow.camera.bottom = -120;
    scene.add(directionalLight);
    // const shadowHelper = new THREE.CameraHelper( directionalLight.shadow.camera );
    // scene.add( shadowHelper );

    // Suelo
    const groundGeometry = new THREE.PlaneGeometry(600, 600);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x55aa55 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    // *** AJUSTE *** Bajar ligeramente el suelo para que no coincida exactamente con la base de la pista
    ground.position.y = -TRACK_THICKNESS - 0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Pista Plana 3D - Usando el método corregido
    createFlatTrackCorrected(); // *** CAMBIO *** Llamando a la función corregida

    // Coche del Jugador
    playerCar = createCar(0x0000ff); // Coche azul
    playerCar.position.copy(playerState.position);
    playerCar.rotation.y = playerState.rotationY;
    scene.add(playerCar);

    // Coches IA
    for (let i = 0; i < AI_COUNT; i++) {
        const aiCar = createCar(getRandomColor());
        const angleOffset = (i + 1) * (Math.PI / (AI_COUNT + 2));
        const startAngle = angleOffset;
        const startPos = getOvalPosition(startAngle); // Obtiene posición en la línea central (Y=0)

        aiStates[i] = {
            car: aiCar,
            angle: startAngle,
            lap: 0,
            progress: startAngle / (2 * Math.PI),
            finished: false,
            speed: AI_SPEED + Math.random() * 3 - 1.5
        };
        // *** CAMBIO *** Posicionar coche IA en Y = CAR_HEIGHT_OFFSET
        aiCar.position.set(startPos.x, CAR_HEIGHT_OFFSET, startPos.z);
        // *** AJUSTE *** Orientar coche IA inicial (debe coincidir con updateAI)
        aiCar.rotation.y = getOvalTangentAngle(startAngle) - Math.PI / 2;
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
    const carBodyGeometry = new THREE.BoxGeometry(CAR_LENGTH, 0.8, CAR_WIDTH);
    // *** CAMBIO *** Rotar la geometría para que la longitud (X original) apunte a -Z
    // Esto alinea la forma del coche con la lógica de movimiento (rotación Y controla dirección Z)
    carBodyGeometry.rotateY(-Math.PI / 2);

    const carMaterial = new THREE.MeshLambertMaterial({ color: color });
    const carMesh = new THREE.Mesh(carBodyGeometry, carMaterial);
    carMesh.castShadow = true;
    carMesh.receiveShadow = true;

    // Offset the body slightly up so the wheels are closer to the car's origin (y=0)
    // Esto se aplica después de la rotación de la geometría
    carBodyGeometry.translate(0, 0.4, 0);

    // Añadir "ruedas" simples como referencia visual
    const wheelRadius = 0.35;
    const wheelThickness = 0.3;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 16);
    wheelGeo.rotateX(Math.PI / 2); // Rotate wheels to stand upright
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x222222 }); // Darker wheels

    const wheelYOffset = -0.1; // How low the wheels sit relative to car origin

    // *** CAMBIO *** Ajustar posiciones de las ruedas según la nueva orientación de la geometría
    // El ancho original (Z) ahora está en el eje X local.
    // La longitud original (X) ahora está en el eje -Z local.
    const wheelPosX = CAR_WIDTH / 2;      // Distancia lateral desde el centro
    const wheelPosZ = CAR_LENGTH * 0.4;   // Distancia adelante/atrás desde el centro

    const flWheel = new THREE.Mesh(wheelGeo, wheelMat);
    // Eje X positivo local = Derecha del coche
    // Eje Z negativo local = Adelante del coche
    flWheel.position.set(wheelPosX, wheelYOffset, -wheelPosZ); // Rueda delantera derecha
    carMesh.add(flWheel);

    const frWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frWheel.position.set(-wheelPosX, wheelYOffset, -wheelPosZ); // Rueda delantera izquierda
    carMesh.add(frWheel);

    const rlWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rlWheel.position.set(wheelPosX, wheelYOffset, wheelPosZ); // Rueda trasera derecha
    carMesh.add(rlWheel);

    const rrWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rrWheel.position.set(-wheelPosX, wheelYOffset, wheelPosZ); // Rueda trasera izquierda
    carMesh.add(rrWheel);

    // No es necesario rotar el carMesh aquí porque rotamos la geometría
    return carMesh;
}

// *** NUEVA FUNCIÓN *** - Crea la pista horizontalmente
function createFlatTrackCorrected() {
    const segments = 100;
    const halfWidth = TRACK_WIDTH / 2;

    // 1. Crear Shape 2D en el plano XY (que luego rotaremos a XZ)
    const trackShape2D = new THREE.Shape();

    // Puntos del óvalo exterior
    const outerPoints = [];
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = (TRACK_RADIUS_X + halfWidth) * Math.cos(angle);
        const z = (TRACK_RADIUS_Z + halfWidth) * Math.sin(angle);
        outerPoints.push(new THREE.Vector2(x, z)); // Usamos x, z como si fueran x, y para la Shape
    }
    trackShape2D.setFromPoints(outerPoints);

    // Puntos del óvalo interior (¡en orden inverso para el agujero!)
    const innerPoints = [];
    for (let i = segments; i >= 0; i--) {
        const angle = (i / segments) * Math.PI * 2;
        const x = (TRACK_RADIUS_X - halfWidth) * Math.cos(angle);
        const z = (TRACK_RADIUS_Z - halfWidth) * Math.sin(angle);
        innerPoints.push(new THREE.Vector2(x, z));
    }
    const innerHolePath = new THREE.Path(innerPoints);
    trackShape2D.holes.push(innerHolePath);

    // 2. Extruir la Shape 2D para darle grosor (profundidad)
    const extrudeSettings = {
        depth: TRACK_THICKNESS, // Grosor de la carretera
        bevelEnabled: false
    };

    const trackGeometry = new THREE.ExtrudeGeometry(trackShape2D, extrudeSettings);
    const trackMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.1,
        roughness: 0.8
    });
    const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);

    // 3. Rotar la malla para que quede plana en el plano XZ del mundo
    trackMesh.rotation.x = -Math.PI / 2;
    // Posicionar para que la superficie superior esté en Y=0
    trackMesh.position.y = 0; // La base estará en -TRACK_THICKNESS

    trackMesh.receiveShadow = true;
    scene.add(trackMesh);

    // Línea de meta (ajustar Y y rotación Z)
    const lineGeo = new THREE.PlaneGeometry(TRACK_WIDTH, 1);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const finishLine = new THREE.Mesh(lineGeo, lineMat);
    // *** CAMBIO *** Posicionar ligeramente por encima de la nueva superficie (Y=0)
    finishLine.position.set(TRACK_RADIUS_X, 0.01, 0);
    finishLine.rotation.x = -Math.PI / 2; // Hacerla plana
    // *** CAMBIO *** Rotar en Z para que cruce la pista correctamente
    finishLine.rotation.z = -Math.PI / 2;
    scene.add(finishLine);
}


// --- Función createFlatTrack original (ya no se usa pero se deja por referencia si fuera necesario) ---
/*
function createFlatTrack() {
    // ... (código original que creaba la pista vertical) ...
}
*/

function createScenery() {
    // Montañas Distantes (sin cambios)
    const mountainMaterial = new THREE.MeshLambertMaterial({ color: 0x7d7464 });
    const snowMaterial = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    for (let i = 0; i < 15; i++) {
        const height = Math.random() * 80 + 50;
        const radius = Math.random() * 40 + 20;
        const mountainGeometry = new THREE.ConeGeometry(radius, height, 8);
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 200 + 150;
        mountain.position.set(
            Math.cos(angle) * distance,
            height / 2 - 2,
            Math.sin(angle) * distance
        );
        mountain.castShadow = false;
        mountain.receiveShadow = true;
        scene.add(mountain);
        if (height > 80 && Math.random() > 0.3) {
             const snowHeight = height * 0.3;
             const snowRadius = radius * (snowHeight / height) * 0.8;
             const snowGeometry = new THREE.ConeGeometry(snowRadius, snowHeight, 8);
             const snow = new THREE.Mesh(snowGeometry, snowMaterial);
             snow.position.y = height * 0.5 - snowHeight * 0.4;
             mountain.add(snow);
        }
    }

    // Casas Simples (sin cambios)
    const houseBaseMaterial = new THREE.MeshLambertMaterial({ color: 0xaa8866 });
    const houseRoofMaterial = new THREE.MeshLambertMaterial({ color: 0xcc4444 });
     for (let i = 0; i < 10; i++) {
        const baseWidth = Math.random() * 5 + 4;
        const baseDepth = Math.random() * 4 + 3;
        const baseHeight = Math.random() * 3 + 3;
        const house = new THREE.Group();
        const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
        const baseMesh = new THREE.Mesh(baseGeometry, houseBaseMaterial);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        baseMesh.position.y = baseHeight / 2;
        house.add(baseMesh);
        const roofGeometry = new THREE.BufferGeometry();
        const hW = baseWidth / 2; const hD = baseDepth / 2; const rH = baseHeight * 0.6;
        const vertices = new Float32Array( [ -hW, baseHeight, -hD, hW, baseHeight, -hD, hW, baseHeight, hD, -hW, baseHeight, hD, 0, baseHeight + rH, -hD, 0, baseHeight + rH, hD ] );
        const indices = [ 0, 1, 4, 3, 5, 2, 0, 3, 5, 0, 5, 4, 1, 2, 5, 1, 5, 4 ];
        roofGeometry.setIndex( indices );
        roofGeometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
        roofGeometry.computeVertexNormals();
        const roofMesh = new THREE.Mesh(roofGeometry, houseRoofMaterial);
        roofMesh.castShadow = true;
        roofMesh.receiveShadow = true;
        roofMesh.position.y = 0;
        house.add(roofMesh);
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(TRACK_RADIUS_X, TRACK_RADIUS_Z) + TRACK_WIDTH + 10 + Math.random() * 30;
         house.position.set( Math.cos(angle) * distance, 0, Math.sin(angle) * distance );
        house.rotation.y = Math.random() * Math.PI * 2;
        scene.add(house);
     }
}


// --- Funciones de Utilidad ---
function getOvalPosition(angle) {
    const x = TRACK_RADIUS_X * Math.cos(angle);
    const z = TRACK_RADIUS_Z * Math.sin(angle);
    // *** CAMBIO *** Devuelve la posición en la línea central de la pista, en Y=0
    return new THREE.Vector3(x, 0, z);
}

function getOvalTangentAngle(angle) {
    const dx = -TRACK_RADIUS_X * Math.sin(angle);
    const dz = TRACK_RADIUS_Z * Math.cos(angle);
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

// --- Control de Eventos --- (sin cambios)
function onKeyDown(event) {
    switch (event.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 's': keys.s = true; break;
        case 'a': keys.a = true; break;
        case 'd': keys.d = true; break;
        case 'r':
            if (!gameRunning) {
                window.location.reload();
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
    if (playerState.finished) return;

    const maxSpeed = 30.0;
    const acceleration = 25.0;
    const deceleration = 35.0;
    const friction = 10.0;
    const turnSpeed = 2.0;

    if (playerState.offTrack) {
         playerState.speed = 0;
         return;
    }

    // Aceleración / Deceleración
    if (keys.w) {
        playerState.speed += acceleration * deltaTime;
    } else if (keys.s) {
        playerState.speed -= deceleration * deltaTime;
    } else {
        if (playerState.speed > 0) {
            playerState.speed -= friction * deltaTime;
            playerState.speed = Math.max(0, playerState.speed);
        } else if (playerState.speed < 0) {
            playerState.speed += friction * deltaTime;
            playerState.speed = Math.min(0, playerState.speed);
        }
    }

    playerState.speed = Math.max(-maxSpeed / 2, Math.min(maxSpeed, playerState.speed));

    // Giro
    if (Math.abs(playerState.speed) > 0.1) {
         const turnDirection = playerState.speed > 0 ? 1 : -1;
         const speedFactor = 1.0 - Math.min(1.0, Math.abs(playerState.speed) / (maxSpeed * 1.5));
        if (keys.a) {
            playerState.rotationY += turnSpeed * deltaTime * turnDirection * (0.5 + speedFactor * 0.5);
        }
        if (keys.d) {
            playerState.rotationY -= turnSpeed * deltaTime * turnDirection * (0.5 + speedFactor * 0.5);
        }
    }

    // Calcular movimiento (adelante/atrás según rotación Y del coche)
    // Con la geometría rotada, sin(rotY) afecta X y cos(rotY) afecta Z, dirigiendo -Z para rotY=0
    const moveX = Math.sin(playerState.rotationY) * playerState.speed * deltaTime;
    const moveZ = Math.cos(playerState.rotationY) * playerState.speed * deltaTime;

    playerState.position.x -= moveX; // -sin(rotY) para mover en X positivo si rotY es -PI/2 (girado a la derecha)
    playerState.position.z -= moveZ; // -cos(rotY) para mover en Z negativo si rotY es 0 (recto)

    // *** CAMBIO AQUÍ: Mantener el coche en la altura correcta sobre la pista Y=0 ***
    playerState.position.y = CAR_HEIGHT_OFFSET;

    // Actualizar posición y rotación del mesh
    playerCar.position.copy(playerState.position);
    playerCar.rotation.y = playerState.rotationY;

    // Detección de salida de pista
    checkOffTrack(playerState, playerCar);

    // Detección de vuelta
    if (!playerState.offTrack) {
        checkLapCompletion(playerState, playerCar);
    }
}

function updateAI(deltaTime) {
    aiStates.forEach(state => {
        if (state.finished) return;

        const distanceToMove = state.speed * deltaTime;
        const a = TRACK_RADIUS_X;
        const b = TRACK_RADIUS_Z;
        const circumferenceApproximation = Math.PI * ( 3*(a+b) - Math.sqrt((3*a+b)*(a+3*b)) );
        const angleChange = distanceToMove / (circumferenceApproximation / (2 * Math.PI));

        state.angle += angleChange;
        state.angle %= (2 * Math.PI);

        const newPos = getOvalPosition(state.angle); // Obtiene posición en la línea central (Y=0)
        // *** CAMBIO AQUÍ: Posicionar coche IA en Y = CAR_HEIGHT_OFFSET ***
        state.car.position.set(newPos.x, CAR_HEIGHT_OFFSET, newPos.z);

        // Orientar el coche IA según la tangente del óvalo
        const tangentAngle = getOvalTangentAngle(state.angle);
        // *** AJUSTE *** Esta rotación debería funcionar ahora con la geometría corregida
        // Si el coche IA aún mira hacia los lados, cambiar a: tangentAngle + Math.PI / 2
        state.car.rotation.y = tangentAngle - Math.PI / 2;

        checkLapCompletion(state, state.car);
    });
}

// La lógica de checkOffTrack debería funcionar sin cambios, ya que compara posiciones XZ
function checkOffTrack(state, car) {
    if (state !== playerState || state.offTrack) return;

    // Usamos atan2 directamente sobre la posición XZ del coche para obtener su ángulo actual
    // respecto al centro del óvalo.
    // Dividir por los radios ayuda a normalizar para la forma elíptica.
    // Se añade un pequeño valor para evitar división por cero si Z o X son 0.
    const currentAngle = Math.atan2(car.position.z / (TRACK_RADIUS_Z || 1), car.position.x / (TRACK_RADIUS_X || 1));
    const centerPointOnPath = getOvalPosition(currentAngle); // Punto en Y=0 en la línea central

    // Calcular la distancia horizontal (XZ) del coche al punto central teórico
    const dx = car.position.x - centerPointOnPath.x;
    const dz = car.position.z - centerPointOnPath.z;
    const distanceToCenterLine = Math.sqrt(dx*dx + dz*dz);

    const trackLimit = TRACK_WIDTH / 2 + CAR_WIDTH * 0.4; // Límite ajustado ligeramente

    if (distanceToCenterLine > trackLimit) {
        console.log("Fuera de pista!");
        state.offTrack = true;
        state.speed = 0;
        showGameOverMessage("¡Te has salido! Pulsa R para reiniciar", true);
        gameRunning = false;
    }
}

// La lógica de checkLapCompletion debería funcionar sin cambios
function checkLapCompletion(state, car) {
    if (state.finished) return;

    const oldProgress = state.progress;

    // Calcular ángulo actual basado en la posición XZ real del coche
    let currentAngle = Math.atan2(car.position.z / (TRACK_RADIUS_Z || 1), car.position.x / (TRACK_RADIUS_X || 1));
    if (currentAngle < 0) {
        currentAngle += 2 * Math.PI;
    }
    const currentProgress = currentAngle / (2 * Math.PI);

    if (oldProgress > 0.9 && currentProgress < 0.1) {
        state.lap++;
        if (state === playerState) {
            lapCountElement.textContent = state.lap;
            if (state.lap >= RACE_LAPS) {
                state.finished = true;
                showGameOverMessage("¡Has Ganado!", false);
                gameRunning = false;
            }
        } else {
             if (state.lap >= RACE_LAPS && !playerState.finished) {
                 let playerFinished = playerState.finished;
                 let aiWon = aiStates.some(s => s.lap >= RACE_LAPS); // Comprobar si alguna IA completó las vueltas
                 if (aiWon && !playerFinished) {
                    showGameOverMessage("¡Has Perdido! La IA ganó.", true);
                    playerState.finished = true; // Marcar jugador como perdido
                    gameRunning = false;
                 }
                 state.finished = true; // Marcar esta IA como finalizada
             }
        }
    }
    else if (oldProgress < 0.1 && currentProgress > 0.9) {
        // Cruzó hacia atrás
    }
    state.progress = currentProgress;
}


function updateCameraPosition() { // (Sin cambios lógicos, pero ahora sigue al coche corregido)
     if (!playerCar) return;

    const camDist = 12;
    const camHeight = 5;

    const dx = Math.sin(playerCar.rotation.y) * camDist;
    const dz = Math.cos(playerCar.rotation.y) * camDist;

    const targetCamPos = new THREE.Vector3(
        playerCar.position.x + dx,
        playerCar.position.y + camHeight,
        playerCar.position.z + dz
    );

    camera.position.lerp(targetCamPos, 0.1);

    const lookAheadDist = 7;
    const lookAtPos = new THREE.Vector3().copy(playerCar.position);
    lookAtPos.x -= Math.sin(playerCar.rotation.y) * lookAheadDist;
    lookAtPos.z -= Math.cos(playerCar.rotation.y) * lookAheadDist;
    // lookAtPos.y = playerCar.position.y + 1.0; // Opcional

    camera.lookAt(lookAtPos);
}


function showGameOverMessage(msg, isLoss) { // (Sin cambios)
    let gameOverDiv = document.getElementById('game-over');
    if (!gameOverDiv) {
        gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over';
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
    messageElement.style.display = 'none';
}

// --- Loop Principal --- (sin cambios)
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (gameRunning) {
        updatePlayer(deltaTime);
        updateAI(deltaTime);
    }

    updateCameraPosition();
    renderer.render(scene, camera);
}

// --- Iniciar el juego ---
init();