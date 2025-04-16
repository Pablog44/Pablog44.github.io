import * as THREE from 'three';

// --- Constantes y Configuración ---
const MAP_SIZE = 200;
const MAP_HEIGHT_LIMIT = 150; // Límite de altura aumentado

// --- Física y Control ---
const FORWARD_ACCELERATION = 0.8;
const LATERAL_ACCELERATION = 0.7;
const LIFT_ACCELERATION = 1.0;
const YAW_ACCELERATION = 1.5;
const PITCH_ACCELERATION = 1.8;
const GRAVITY = 0.01; // Ligeramente aumentada para compensar mayor lift
const DRAG = 0.97;          // Resistencia del aire lineal
const ROTATION_DRAG = 0.94;   // Resistencia del aire angular (para suavizar rotaciones)

const MAX_HORIZONTAL_SPEED = 3.0;
const MAX_VERTICAL_SPEED = 2.5;
const MAX_ROTATION_SPEED = 2.0; // Radianes por segundo (aproximado tras deltaTime)

const DEADZONE = 0.15; // Zona muerta del gamepad

// --- Variables Globales ---
let scene, camera, renderer;
let drone, droneVelocity, droneAngularVelocity;
let clock;
let gamepad = null;
let houses = [];
let mountains = [];
let hoops = []; // Array para los aros
let boundaryWalls = [];

// --- Inicialización ---
function init() {
    clock = new THREE.Clock();

    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xadd8e6);
    scene.fog = new THREE.Fog(0xadd8e6, MAP_SIZE * 0.6, MAP_SIZE * 2.0);

    // Cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Posición inicial - se ajustará dinámicamente
    camera.position.set(0, 5, 10);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('container').appendChild(renderer.domElement);

    // Luces (igual que antes)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(50, 100, 75);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -MAP_SIZE;
    directionalLight.shadow.camera.right = MAP_SIZE;
    directionalLight.shadow.camera.top = MAP_SIZE;
    directionalLight.shadow.camera.bottom = -MAP_SIZE;
    scene.add(directionalLight);

    // Suelo (igual que antes)
    const groundGeometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x8fbc8f, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Crear Dron (igual que antes)
    const droneGeometry = new THREE.BoxGeometry(1.5, 0.2, 0.8);
    const droneMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    drone = new THREE.Mesh(droneGeometry, droneMaterial);
    drone.position.set(0, 1, 0);
    drone.castShadow = true;
    // Usar Quaternions para rotación es mejor para evitar gimbal lock
    drone.rotation.order = 'YXZ'; // Orden común para vehículos aéreos
    scene.add(drone);

    // Estado inicial del dron
    droneVelocity = new THREE.Vector3(0, 0, 0);
    droneAngularVelocity = new THREE.Vector3(0, 0, 0); // Velocidad de rotación (pitch, yaw, roll)

    // Crear Entorno y Aros
    createEnvironment();
    createHoops();
    // createBoundaryWalls(); // Descomentar si quieres paredes visibles

    // Listeners
    setupEventListeners();

    // Iniciar Loop de Animación
    animate();
}

// --- Crear Entorno (Casas y Montañas - igual que antes) ---
function createEnvironment() {
    const houseGeometry = new THREE.BoxGeometry(5, 8, 5); // Casas un poco más altas
    const houseMaterial = new THREE.MeshStandardMaterial({ color: 0xdeb887 });

    const mountainGeometry = new THREE.ConeGeometry(12, 35, 8); // Montañas más grandes
    const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x778899 }); // Slate gray

    const numHouses = 25;
    const numMountains = 7;
    const halfMap = MAP_SIZE / 2;

    for (let i = 0; i < numHouses; i++) {
        const house = new THREE.Mesh(houseGeometry, houseMaterial);
        house.position.set(
            (Math.random() - 0.5) * MAP_SIZE * 0.9,
            houseGeometry.parameters.height / 2, // Apoyado en el suelo
            (Math.random() - 0.5) * MAP_SIZE * 0.9
        );
        if (house.position.length() < 15) { // Evitar centro
             house.position.set(halfMap * (0.6 + Math.random()*0.4) * (Math.random() > 0.5 ? 1 : -1),
                                houseGeometry.parameters.height / 2,
                                halfMap * (0.6 + Math.random()*0.4) * (Math.random() > 0.5 ? 1 : -1));
        }
        house.castShadow = true;
        house.receiveShadow = true;
        scene.add(house);
        houses.push(house);
    }

     for (let i = 0; i < numMountains; i++) {
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        let posX, posZ;
        do { // Asegurar que estén más hacia los bordes
            posX = (Math.random() - 0.5) * MAP_SIZE * 1.1;
            posZ = (Math.random() - 0.5) * MAP_SIZE * 1.1;
        } while (Math.abs(posX) < halfMap * 0.4 || Math.abs(posZ) < halfMap * 0.4);

        mountain.position.set(
            posX,
            mountainGeometry.parameters.height / 2,
            posZ
        );
        mountain.castShadow = true;
        mountain.receiveShadow = true;
        scene.add(mountain);
        mountains.push(mountain);
    }
}

// --- Crear Aros ---
function createHoops() {
    const hoopGeometry = new THREE.TorusGeometry(4, 0.3, 16, 50); // Radio aro, radio tubo, seg Radiales, seg Tubulares
    const hoopMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700, // Dorado
        emissive: 0xaa8800, // Un ligero brillo propio
        roughness: 0.4,
        metalness: 0.6
    });

    const numHoops = 10;
    const halfMap = MAP_SIZE / 2;

    for (let i = 0; i < numHoops; i++) {
        const hoop = new THREE.Mesh(hoopGeometry, hoopMaterial);

        // Posiciones más variadas, incluyendo altura
        const angle = (i / numHoops) * Math.PI * 2;
        const radius = halfMap * (0.3 + Math.random() * 0.5); // Distancia del centro
        hoop.position.set(
            Math.cos(angle) * radius,
            10 + Math.random() * (MAP_HEIGHT_LIMIT - 20), // Altura variable
            Math.sin(angle) * radius
        );

        // Orientación aleatoria (opcional, pero más interesante)
        hoop.rotation.set(
            Math.random() * Math.PI * 0.5 - Math.PI * 0.25, // Pitch aleatorio leve
            Math.random() * Math.PI * 2,                   // Yaw aleatorio
            Math.random() * Math.PI * 0.5 - Math.PI * 0.25 // Roll aleatorio leve
        );

        hoop.castShadow = true; // Los aros también proyectan sombra
        scene.add(hoop);
        hoops.push(hoop);
    }
}


// --- (Opcional) Crear paredes para visualizar los límites ---
function createBoundaryWalls() {
    // ... (código de createBoundaryWalls sin cambios, si se quiere usar)
     const wallHeight = MAP_HEIGHT_LIMIT; // Hacer las paredes tan altas como el límite
    const wallThickness = 1;
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
    const halfMap = MAP_SIZE / 2;

    const wallN = new THREE.Mesh(new THREE.BoxGeometry(MAP_SIZE, wallHeight, wallThickness), wallMaterial);
    wallN.position.set(0, wallHeight / 2, -halfMap);
    scene.add(wallN);
    boundaryWalls.push(wallN);

    const wallS = new THREE.Mesh(new THREE.BoxGeometry(MAP_SIZE, wallHeight, wallThickness), wallMaterial);
    wallS.position.set(0, wallHeight / 2, halfMap);
    scene.add(wallS);
    boundaryWalls.push(wallS);

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, MAP_SIZE), wallMaterial);
    wallE.position.set(halfMap, wallHeight / 2, 0);
    scene.add(wallE);
    boundaryWalls.push(wallE);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, MAP_SIZE), wallMaterial);
    wallW.position.set(-halfMap, wallHeight / 2, 0);
    scene.add(wallW);
    boundaryWalls.push(wallW);

     // Techo opcional
     const roof = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE), wallMaterial);
     roof.position.set(0, MAP_HEIGHT_LIMIT, 0);
     roof.rotation.x = Math.PI / 2;
     scene.add(roof);
     boundaryWalls.push(roof);
}


// --- Manejo del Gamepad ---
function handleGamepadInput(deltaTime) {
    if (!gamepad || !gamepad.connected) return;

    const currentGamepads = navigator.getGamepads();
    gamepad = currentGamepads[gamepad.index];
    if (!gamepad) return;

    // --- Leer Ejes ---
    const leftStickX = gamepad.axes[0];
    const leftStickY = gamepad.axes[1]; // Negativo arriba, Positivo abajo
    const rightStickX = gamepad.axes[2];
    const rightStickY = gamepad.axes[3]; // Negativo arriba, Positivo abajo

    // --- Leer Botones (Comunes para L1/LB y R1/RB) ---
    // Asegúrate de que los índices (4, 5) correspondan a tus botones L1/R1
    const buttonL1 = gamepad.buttons[4] && gamepad.buttons[4].pressed;
    const buttonR1 = gamepad.buttons[5] && gamepad.buttons[5].pressed;

    // --- Calcular Aceleraciones ---
    let forwardInput = 0;
    let lateralInput = 0;
    let liftInput = 0;
    let yawInput = 0;
    let pitchInput = 0;

    // Movimiento Adelante/Atrás (Stick Izquierdo Y)
    if (Math.abs(leftStickY) > DEADZONE) {
        forwardInput = -leftStickY; // Invertido
    }
    // Movimiento Lateral (Stick Izquierdo X)
    if (Math.abs(leftStickX) > DEADZONE) {
        lateralInput = leftStickX;
    }
    // Rotación Yaw (Stick Derecho X)
    if (Math.abs(rightStickX) > DEADZONE) {
        yawInput = -rightStickX; // Invertido para rotación intuitiva
    }
    // Rotación Pitch (Stick Derecho Y) - ¡Volteretas!
    if (Math.abs(rightStickY) > DEADZONE) {
        pitchInput = -rightStickY; // Invertido
    }
    // Subir/Bajar (Botones L1/R1)
    if (buttonR1) {
        liftInput = 1;
    } else if (buttonL1) {
        liftInput = -1;
    }

    // --- Aplicar Aceleraciones ---

    // 1. Aceleración Lineal (Movimiento)
    const worldAcceleration = new THREE.Vector3();
    const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(drone.quaternion); // Usa quaternion para dirección correcta
    const sidewaysVector = new THREE.Vector3(1, 0, 0).applyQuaternion(drone.quaternion);

    worldAcceleration.addScaledVector(forwardVector, forwardInput * FORWARD_ACCELERATION);
    worldAcceleration.addScaledVector(sidewaysVector, lateralInput * LATERAL_ACCELERATION);
    worldAcceleration.y += liftInput * LIFT_ACCELERATION; // Aceleración vertical directa

    // Aplicar aceleración a la velocidad (escalado por deltaTime)
    droneVelocity.addScaledVector(worldAcceleration, deltaTime);

    // 2. Aceleración Angular (Rotación)
    droneAngularVelocity.x += pitchInput * PITCH_ACCELERATION * deltaTime;
    droneAngularVelocity.y += yawInput * YAW_ACCELERATION * deltaTime;
    // Nota: No hemos añadido Roll (eje Z) por simplicidad, pero podría añadirse aquí
    // droneAngularVelocity.z += rollInput * ROLL_ACCELERATION * deltaTime;

}

// --- Actualización del Dron ---
function updateDrone(deltaTime) {
    // 1. Aplicar Drag y Gravedad a la Velocidad Lineal
    droneVelocity.multiplyScalar(Math.pow(DRAG, deltaTime * 60)); // Drag dependiente de framerate
    if (drone.position.y > 0.1) { // Gravedad solo si está en el aire
        droneVelocity.y -= GRAVITY * deltaTime;
    }

    // 2. Limitar Velocidad Lineal
    const horizontalVelocity = new THREE.Vector2(droneVelocity.x, droneVelocity.z);
    if (horizontalVelocity.length() > MAX_HORIZONTAL_SPEED) {
        horizontalVelocity.setLength(MAX_HORIZONTAL_SPEED);
        droneVelocity.x = horizontalVelocity.x;
        droneVelocity.z = horizontalVelocity.y;
    }
    droneVelocity.y = THREE.MathUtils.clamp(droneVelocity.y, -MAX_VERTICAL_SPEED, MAX_VERTICAL_SPEED);


    // 3. Aplicar Drag a la Velocidad Angular
    droneAngularVelocity.multiplyScalar(Math.pow(ROTATION_DRAG, deltaTime * 60));

    // 4. Limitar Velocidad Angular (opcional pero bueno)
    if (droneAngularVelocity.length() > MAX_ROTATION_SPEED) {
       droneAngularVelocity.setLength(MAX_ROTATION_SPEED);
    }

    // 5. Actualizar Rotación usando velocidad angular y Quaternion
    const deltaRotation = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
            droneAngularVelocity.x * deltaTime,
            droneAngularVelocity.y * deltaTime,
            droneAngularVelocity.z * deltaTime, // Incluye Z aunque no lo controlemos directamente
            drone.rotation.order // Asegúrate de usar el mismo orden
        )
    );
    drone.quaternion.multiplyQuaternions(drone.quaternion, deltaRotation);


    // 6. Actualizar Posición
    drone.position.addScaledVector(droneVelocity, deltaTime);


    // --- Colisiones y Límites ---
    handleBoundariesAndCollisions();
}

// --- Manejo de Colisiones y Límites ---
function handleBoundariesAndCollisions() {
     const halfMap = MAP_SIZE / 2;
    // Usar un bounding box para el dron puede ser un poco mejor que un radio
    const droneBox = new THREE.Box3().setFromObject(drone);
    const droneSize = new THREE.Vector3();
    droneBox.getSize(droneSize);
    const droneRadiusApprox = Math.max(droneSize.x, droneSize.z) / 2; // Aproximación

    // Colisión con el suelo
    if (droneBox.min.y < 0) {
        drone.position.y -= droneBox.min.y; // Ajusta la posición para que toque el suelo
        if (droneVelocity.y < 0) droneVelocity.y = 0; // Detener caída
        // Opcional: añadir un pequeño rebote o simplemente parar
         droneVelocity.y *= -0.1; // Pequeño rebote
         droneVelocity.x *= 0.9; // Fricción con el suelo
         droneVelocity.z *= 0.9;
         droneAngularVelocity.multiplyScalar(0.8); // Frenar rotación al tocar suelo
    }

    // Límite de altura
    if (drone.position.y > MAP_HEIGHT_LIMIT) {
        drone.position.y = MAP_HEIGHT_LIMIT;
        if (droneVelocity.y > 0) droneVelocity.y = 0; // Detener ascenso
    }

    // Límites del mapa (X, Z) - Usar droneRadiusApprox
    if (drone.position.x < -halfMap + droneRadiusApprox) {
        drone.position.x = -halfMap + droneRadiusApprox;
        if (droneVelocity.x < 0) droneVelocity.x = 0;
    }
    if (drone.position.x > halfMap - droneRadiusApprox) {
        drone.position.x = halfMap - droneRadiusApprox;
         if (droneVelocity.x > 0) droneVelocity.x = 0;
    }
    if (drone.position.z < -halfMap + droneRadiusApprox) {
        drone.position.z = -halfMap + droneRadiusApprox;
         if (droneVelocity.z < 0) droneVelocity.z = 0;
    }
    if (drone.position.z > halfMap - droneRadiusApprox) {
        drone.position.z = halfMap - droneRadiusApprox;
         if (droneVelocity.z > 0) droneVelocity.z = 0;
    }

    // Colisión simple con casas y montañas (AABB check)
    const checkCollision = (object) => {
        const objBox = new THREE.Box3().setFromObject(object);
        // Actualizar droneBox en cada chequeo por si la posición cambió
        droneBox.setFromObject(drone);

        if (droneBox.intersectsBox(objBox)) {
            // Colisión detectada - Lógica de respuesta simple:
            // Empujar el dron fuera del objeto en la dirección opuesta a la velocidad
            // Esto es muy básico y puede tener fallos (atravesar esquinas, etc.)

            const collisionNormal = drone.position.clone().sub(object.position).normalize();

             // Calcula cuánto penetra en cada eje (aproximado)
             const overlap = new THREE.Vector3(
                 Math.min(droneBox.max.x, objBox.max.x) - Math.max(droneBox.min.x, objBox.min.x),
                 Math.min(droneBox.max.y, objBox.max.y) - Math.max(droneBox.min.y, objBox.min.y),
                 Math.min(droneBox.max.z, objBox.max.z) - Math.max(droneBox.min.z, objBox.min.z)
             );

             // Determina el eje de menor penetración para empujar
             if (overlap.x < overlap.y && overlap.x < overlap.z) {
                 // Empujar en X
                 drone.position.x += Math.sign(drone.position.x - object.position.x) * overlap.x * 1.01; // 1.01 para asegurar salida
                 droneVelocity.x = 0; // Detener velocidad en esa dirección
             } else if (overlap.y < overlap.x && overlap.y < overlap.z) {
                  // Empujar en Y
                 drone.position.y += Math.sign(drone.position.y - object.position.y) * overlap.y * 1.01;
                 droneVelocity.y = 0; // Detener velocidad vertical
             } else {
                 // Empujar en Z
                  drone.position.z += Math.sign(drone.position.z - object.position.z) * overlap.z * 1.01;
                 droneVelocity.z = 0; // Detener velocidad en esa dirección
             }

             // Reducir velocidad general y angular en colisión
             droneVelocity.multiplyScalar(0.8);
             droneAngularVelocity.multiplyScalar(0.8);
        }
    };

    houses.forEach(checkCollision);
    mountains.forEach(checkCollision);
    // Podrías añadir colisión con los aros aquí si quisieras
    // hoops.forEach(checkCollision);
}


// --- Actualización de la Cámara ---
function updateCamera() {
    // Offset deseado de la cámara RELATIVO al dron
    const cameraOffset = new THREE.Vector3(0, 3.5, 7.5); // Un poco más cerca y más bajo

    // Aplicar la rotación actual del dron al offset
    // Usamos quaternion.multiplyVector3 obsoleto, mejor applyQuaternion
    // cameraOffset.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(drone.quaternion)); // Aplica rotacion del dron al offset
    cameraOffset.applyQuaternion(drone.quaternion);


    // Calcular posición deseada de la cámara en el mundo
    const targetCameraPosition = drone.position.clone().add(cameraOffset);

    // Mover la cámara suavemente hacia la posición deseada (Lerp)
    camera.position.lerp(targetCameraPosition, 0.08); // Ajusta el valor de lerp (0.0 a 1.0) para suavidad

    // Hacer que la cámara siempre mire cerca del dron
    const lookAtTarget = drone.position.clone();
    // Opcional: Añadir un pequeño offset a donde mira para estabilizar la vista
    const lookAtOffset = new THREE.Vector3(0, 0.5, -2).applyQuaternion(drone.quaternion); // Mirar un poco adelante y arriba del dron
    lookAtTarget.add(lookAtOffset);


    camera.lookAt(lookAtTarget);
}


// --- Loop de Animación ---
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Solo actualizar si hay un gamepad conectado
    if (gamepad && gamepad.connected) {
        handleGamepadInput(deltaTime);
    } else {
        // Opcional: Hacer que el dron se frene lentamente si no hay control
        droneVelocity.multiplyScalar(Math.pow(DRAG, deltaTime * 60));
        droneAngularVelocity.multiplyScalar(Math.pow(ROTATION_DRAG, deltaTime * 60));
         if (drone.position.y > 0.1) {
            droneVelocity.y -= GRAVITY * deltaTime;
        }
    }


    updateDrone(deltaTime);
    updateCamera();

    renderer.render(scene, camera);
}

// --- Manejo de Redimensionamiento y Eventos ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupEventListeners() {
     window.addEventListener('resize', onWindowResize, false);
     window.addEventListener('gamepadconnected', (event) => {
        console.log('Gamepad conectado:', event.gamepad.id);
        // Puede haber varios gamepads, toma el primero detectado
        if(gamepad === null) {
            gamepad = event.gamepad;
            document.getElementById('info').textContent = `Gamepad: ${gamepad.id}\nLStick: Mover | RStick: Rotar/Pitch\nL1/R1: Bajar/Subir`;
        } else {
            console.log("Ya hay un gamepad asignado.");
        }
    });
    window.addEventListener('gamepaddisconnected', (event) => {
        console.log('Gamepad desconectado:', event.gamepad.id);
        if (gamepad && gamepad.index === event.gamepad.index) {
            gamepad = null;
            document.getElementById('info').textContent = `Gamepad desconectado. Conecta un gamepad...`;
             // Reiniciar velocidades para que no siga moviéndose
             droneVelocity.set(0, 0, 0);
             droneAngularVelocity.set(0, 0, 0);
        }
    });
}

// --- Iniciar la aplicación ---
init();