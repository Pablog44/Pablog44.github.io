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
const CAR_LENGTH = 3;
const CAR_WIDTH = 1.5;

// Estado del jugador
let playerState = {
    speed: 0,
    angle: 0, // Ángulo en el óvalo (0 a 2*PI)
    position: new THREE.Vector3(TRACK_RADIUS_X, 0.5, 0),
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
    scene.fog = new THREE.Fog(0x87ceeb, 100, 250); // Niebla

    // Cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Posición inicial de la cámara (detrás y arriba del coche)
    updateCameraPosition();

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Habilitar sombras
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 100, 25);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);
    scene.add(directionalLight.target);


    // Suelo
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x55aa55 }); // Verde hierba
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Pista (un plano ovalado simple)
    createTrack();

    // Coche del Jugador
    playerCar = createCar(0x0000ff); // Coche azul
    playerCar.position.copy(playerState.position);
    playerCar.rotation.y = playerState.rotationY;
    scene.add(playerCar);

    // Coches IA
    for (let i = 0; i < AI_COUNT; i++) {
        const aiCar = createCar(getRandomColor());
        const angleOffset = (i + 1) * (Math.PI / (AI_COUNT + 1)); // Espaciado inicial
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
        aiCar.position.set(startPos.x, 0.5, startPos.z);
        aiCar.rotation.y = getOvalTangentAngle(startAngle) + Math.PI/2; // Orientar coche
        scene.add(aiCar);
        aiCars.push(aiCar);
    }


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
    const carGeometry = new THREE.BoxGeometry(CAR_LENGTH, 1, CAR_WIDTH);
    const carMaterial = new THREE.MeshLambertMaterial({ color: color });
    const carMesh = new THREE.Mesh(carGeometry, carMaterial);
    carMesh.castShadow = true;
    carMesh.receiveShadow = true; // Puede recibir sombras de otros objetos
     // Añadir "ruedas" simples como referencia visual
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
    const wheelMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    const flWheel = new THREE.Mesh(wheelGeo, wheelMat);
    flWheel.rotation.z = Math.PI / 2;
    flWheel.position.set(CAR_LENGTH / 2 - 0.3, -0.3, CAR_WIDTH / 2);
    carMesh.add(flWheel);

    const frWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frWheel.rotation.z = Math.PI / 2;
    frWheel.position.set(CAR_LENGTH / 2 - 0.3, -0.3, -CAR_WIDTH / 2);
    carMesh.add(frWheel);

     const rlWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rlWheel.rotation.z = Math.PI / 2;
    rlWheel.position.set(-CAR_LENGTH / 2 + 0.3, -0.3, CAR_WIDTH / 2);
    carMesh.add(rlWheel);

     const rrWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rrWheel.rotation.z = Math.PI / 2;
    rrWheel.position.set(-CAR_LENGTH / 2 + 0.3, -0.3, -CAR_WIDTH / 2);
    carMesh.add(rrWheel);


    return carMesh;
}

function createTrack() {
    // Crear la forma del óvalo (aproximación con segmentos)
    const curvePoints = [];
    const segments = 100; // Más segmentos = más suave
    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = TRACK_RADIUS_X * Math.cos(angle);
        const z = TRACK_RADIUS_Z * Math.sin(angle);
        curvePoints.push(new THREE.Vector3(x, 0.05, z)); // Ligera elevación para verla sobre el suelo
    }
    const curve = new THREE.CatmullRomCurve3(curvePoints, true); // Curva cerrada

    // Crear la geometría de la pista como un tubo extruido a lo largo de la curva
    const trackGeometry = new THREE.TubeGeometry(curve, segments, TRACK_WIDTH / 2, 8, true);
    const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 }); // Color asfalto
    const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
    trackMesh.receiveShadow = true;
    scene.add(trackMesh);

     // Línea de meta (opcional)
    const lineGeo = new THREE.PlaneGeometry(TRACK_WIDTH, 1);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const finishLine = new THREE.Mesh(lineGeo, lineMat);
    finishLine.position.set(TRACK_RADIUS_X, 0.06, 0); // En la parte derecha del óvalo
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.rotation.z = -Math.PI / 2;
    scene.add(finishLine);
}

// --- Funciones de Utilidad ---
function getOvalPosition(angle) {
    const x = TRACK_RADIUS_X * Math.cos(angle);
    const z = TRACK_RADIUS_Z * Math.sin(angle);
    return new THREE.Vector3(x, 0, z); // Asume Y=0 para la posición en el plano
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
    if (playerState.offTrack || playerState.finished) return;

    const maxSpeed = 30.0;
    const acceleration = 25.0;
    const deceleration = 35.0;
    const friction = 10.0;
    const turnSpeed = 2.0; // Radianes por segundo

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
        if (keys.a) {
            playerState.rotationY += turnSpeed * deltaTime * turnDirection;
        }
        if (keys.d) {
            playerState.rotationY -= turnSpeed * deltaTime * turnDirection;
        }
    }


    // Calcular movimiento
    const moveX = Math.sin(playerState.rotationY) * playerState.speed * deltaTime;
    const moveZ = Math.cos(playerState.rotationY) * playerState.speed * deltaTime;

    playerState.position.x += moveX;
    playerState.position.z += moveZ;

    // Actualizar posición y rotación del mesh
    playerCar.position.copy(playerState.position);
    playerCar.rotation.y = playerState.rotationY;

    // Detección de salida de pista (simplificado)
    checkOffTrack(playerState, playerCar);

    // Detección de vuelta
    checkLapCompletion(playerState, playerCar);
}

function updateAI(deltaTime) {
    aiStates.forEach(state => {
        if (state.finished) return;

        // Mover la IA a lo largo del óvalo a velocidad constante
        const distanceToMove = state.speed * deltaTime;
        const circumferenceApproximation = Math.PI * (TRACK_RADIUS_X + TRACK_RADIUS_Z); // Aproximado
        const angleChange = distanceToMove / circumferenceApproximation * (2 * Math.PI);

        state.angle += angleChange;
        state.angle %= (2 * Math.PI); // Mantener ángulo entre 0 y 2*PI

        const newPos = getOvalPosition(state.angle);
        state.car.position.set(newPos.x, 0.5, newPos.z);

        // Orientar el coche IA según la tangente del óvalo
        const tangentAngle = getOvalTangentAngle(state.angle);
        state.car.rotation.y = tangentAngle + Math.PI / 2; // +90 grados porque mi coche mira hacia +Z por defecto

        checkLapCompletion(state, state.car);
    });
}

function checkOffTrack(state, car) {
    // Calcula la distancia del coche al centro (0,0) en el plano XZ
    const distFromCenter = Math.sqrt(
         Math.pow(car.position.x / TRACK_RADIUS_X, 2) +
         Math.pow(car.position.z / TRACK_RADIUS_Z, 2)
    ) * Math.min(TRACK_RADIUS_X,TRACK_RADIUS_Z); // Escala aproximada para forma ovalada

    const innerTrackLimit = Math.min(TRACK_RADIUS_X, TRACK_RADIUS_Z) - TRACK_WIDTH / 2 - CAR_WIDTH/2;
    const outerTrackLimit = Math.max(TRACK_RADIUS_X, TRACK_RADIUS_Z) + TRACK_WIDTH / 2 + CAR_WIDTH/2;


    // Simplificación: Usar distancia radial aproximada
    const currentRadius = Math.sqrt(car.position.x**2 + car.position.z**2);
    const expectedRadiusX = TRACK_RADIUS_X * Math.abs(Math.cos(state.angle));
    const expectedRadiusZ = TRACK_RADIUS_Z * Math.abs(Math.sin(state.angle));
    // Esta detección es muy básica y puede fallar en las curvas del óvalo
    // Una mejor forma sería calcular la distancia al punto más cercano de la línea central

    // Detección más robusta basada en distancia al centro de la pista para *ese ángulo*
    const centerPoint = getOvalPosition(state.angle); // Punto en el centro de la pista en el ángulo actual del coche
    const distanceToCenterLine = car.position.distanceTo(new THREE.Vector3(centerPoint.x, car.position.y, centerPoint.z));


    if (distanceToCenterLine > TRACK_WIDTH / 2 + CAR_WIDTH*0.7) { // Si se aleja mucho del centro
        if (!state.offTrack && state === playerState) { // Solo para el jugador por ahora
            console.log("Fuera de pista!");
            state.offTrack = true;
            state.speed = 0; // Detener coche
            messageElement.textContent = "¡Te has salido! Pulsa R para reiniciar";
             showGameOverMessage("¡Te has salido!", true);
             gameRunning = false;
        }
    }
}

function checkLapCompletion(state, car) {
    if (state.finished) return;

    // Calcular progreso actual basado en la posición Z y X
    // Cerca de Z=0 en la parte +X del óvalo es la línea de meta
    const oldProgress = state.progress;
    let currentProgress = 0;

     // Calcular ángulo actual basado en la posición (más preciso que acumular delta)
    state.angle = Math.atan2(car.position.z / TRACK_RADIUS_Z, car.position.x / TRACK_RADIUS_X);
    if (state.angle < 0) state.angle += 2 * Math.PI; // Asegurar ángulo positivo

    currentProgress = state.angle / (2 * Math.PI);


    // Detectar cruce de meta (pasar de > 0.9 a < 0.1)
    if (oldProgress > 0.85 && currentProgress < 0.15) {
        state.lap++;
        console.log(`Coche ${state === playerState ? 'Jugador' : 'IA'} completó vuelta ${state.lap}`);

        if (state === playerState) {
            lapCountElement.textContent = state.lap;
            if (state.lap >= RACE_LAPS) {
                state.finished = true;
                messageElement.textContent = "¡Has ganado!";
                showGameOverMessage("¡Has Ganado!", false);
                gameRunning = false;
            }
        } else {
             if (state.lap >= RACE_LAPS) {
                 state.finished = true;
                 // Podríamos añadir lógica si una IA gana antes que el jugador
             }
        }
    }
     // Detectar cruce en reversa (pasar de < 0.1 a > 0.9) - opcional para evitar trampas
     else if (oldProgress < 0.15 && currentProgress > 0.85) {
         // state.lap--; // Podríamos descontar vuelta si se permite ir en reversa
         // console.log("Vuelta anulada por ir en reversa sobre la meta");
     }


    state.progress = currentProgress;
}

function updateCameraPosition() {
     if (!playerCar) return;

     // Calcular posición deseada de la cámara (detrás y arriba)
    const camDist = 12; // Distancia detrás del coche
    const camHeight = 5; // Altura sobre el coche

    const camPosX = playerCar.position.x - Math.sin(playerCar.rotation.y) * camDist;
    const camPosZ = playerCar.position.z - Math.cos(playerCar.rotation.y) * camDist;
    const camPosY = playerCar.position.y + camHeight;

    // Suavizar movimiento de la cámara (opcional, usando LERP)
    camera.position.lerp(new THREE.Vector3(camPosX, camPosY, camPosZ), 0.1); // 0.1 = factor de suavizado

    // Hacer que la cámara mire ligeramente por delante del coche
    const lookAtPos = new THREE.Vector3().copy(playerCar.position);
     // lookAtPos.x += Math.sin(playerCar.rotation.y) * 3; // Mira 3 unidades delante
     // lookAtPos.z += Math.cos(playerCar.rotation.y) * 3;
    camera.lookAt(lookAtPos);
}


function showGameOverMessage(msg, isLoss) {
    let gameOverDiv = document.getElementById('game-over');
    if (!gameOverDiv) {
        gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over';
        document.body.appendChild(gameOverDiv);
    }
    gameOverDiv.textContent = msg;
    gameOverDiv.style.color = isLoss ? 'red' : 'lime';
    gameOverDiv.style.display = 'block';

    // Añadir opción para reiniciar (si es necesario)
    if (isLoss) {
         // Aquí podríamos añadir un botón o lógica para reiniciar el juego
         // Por ahora, solo muestra el mensaje. El reinicio requeriría resetear estados.
         messageElement.textContent += " (Refresca la página para volver a jugar)"; // Solución simple
    }

}

// --- Loop Principal ---
function animate() {
    if (!gameRunning) {
         // requestAnimationFrame(animate); // Sigue renderizando pero no actualiza lógica
         renderer.render(scene, camera);
         return;
    }


    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Actualizar lógica del juego
    updatePlayer(deltaTime);
    updateAI(deltaTime);

    // Actualizar cámara
    updateCameraPosition();

    // Renderizar escena
    renderer.render(scene, camera);
}

// --- Iniciar el juego ---
init();