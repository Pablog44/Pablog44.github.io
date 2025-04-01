// --- Configuración Inicial ---
const TILE_SIZE = 5;      // Tamaño de cada cuadrado en el mundo 3D
const WALL_HEIGHT = 5;    // Altura de las paredes
const moveSpeed = 5.0;    // Velocidad de movimiento (ajustada para VR/screen)
const lookSpeed = 0.003;  // Sensibilidad del ratón (solo pantalla)
const gamepadLookSpeed = 1.5; // Sensibilidad de la vista con gamepad (solo pantalla)
const gamepadDeadZone = 0.15; // Zona muerta para los sticks del gamepad
const vrMoveSpeedFactor = 0.8; // Multiplicador de velocidad en VR (más lento suele ser mejor)
const vrDeadZone = 0.15;   // Zona muerta para sticks/touchpads de VR

// --- Datos del Mapa (¡Aquí defines tus mapas!) ---
// 0 = Espacio vacío
// wallMap: 1+ = Índice de textura en wallTextures (1=wallTextures[1], 2=wallTextures[2], ...)
// floor/ceilingMap: 0+ = Índice de textura en floor/ceilingTextures (0=placeholder, 1=floor/ceilingTextures[1], ...)
const wallMap = [
  [1, 2, 1, 2, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 2, 0, 0, 1],
  [2, 0, 1, 1, 0, 0, 2, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 1, 1, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 2, 1, 1, 1, 1],
];
const floorMap = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0 usará placeholder (floorTextures[0])
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0], // 1 usará floorTextures[1]
  [0, 1, 0, 0, 1, 1, 0, 1, 1, 0],
  [0, 1, 0, 0, 1, 1, 0, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 0, 0, 0, 1, 0],
  [0, 1, 0, 1, 1, 1, 1, 1, 1, 0],
  [0, 1, 0, 1, 2, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];
const ceilingMap = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 1 usará ceilingTextures[1]
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 0 usará placeholder (ceilingTextures[0])
  [1, 0, 1, 1, 0, 0, 1, 0, 0, 1],
  [1, 0, 1, 1, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 1, 0, 1],
  [1, 0, 1, 2, 2, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// --- Texturas (URLs o rutas locales) ---
const wallTextureUrls = ['textures/wall1.png', 'textures/wall2.png']; // Corresponden a 1 y 2 en wallMap
const floorTextureUrls = ['textures/floor1.png', 'textures/floor2.png']; // Corresponden a 1 y 2 en floorMap
const ceilingTextureUrls = ['textures/ceiling1.png', 'textures/ceiling2.png']; // Corresponden a 1 y 2 en ceilingMap
const placeholderTextureUrl = 'textures/placeholder.png'; // Textura de fallback (índice 0)

// --- Variables Globales de Three.js y Juego ---
let scene, camera, renderer;
let clock = new THREE.Clock();
let textureLoader = new THREE.TextureLoader();
let wallTextures = [];
let floorTextures = [];
let ceilingTextures = [];
let placeholderTexture = null;
let mapMeshesGroup = new THREE.Group();
let mapWidth = wallMap[0].length;
let mapHeight = wallMap.length;
let playerRig; // <<<--- Grupo para mover al jugador (contiene la cámara)

// Movimiento y Control
const moveState = { forward: 0, back: 0, left: 0, right: 0 }; // Teclado/Gamepad (pantalla)
const vrMoveState = { forward: 0, back: 0, left: 0, right: 0 }; // VR Controllers
let isPointerLocked = false;
let activeGamepadIndex = null; // Índice del gamepad activo (pantalla)

// --- Inicialización ---
function init() {
    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333); // Se puede ajustar o hacer negro para VR
    scene.fog = new THREE.Fog(scene.background, TILE_SIZE * 2, TILE_SIZE * mapWidth * 0.7);

    // Cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // NO establecemos la posición Y aquí, se hará en el Rig
    camera.rotation.order = 'YXZ'; // Importante para FPS

    // Player Rig (Contenedor para la cámara)
    playerRig = new THREE.Group();
    playerRig.position.y = WALL_HEIGHT / 2; // Altura base del jugador
    playerRig.add(camera); // Añadir cámara al rig
    scene.add(playerRig); // Añadir el rig a la escena

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.xr.enabled = true; // <<<--- Habilitar WebXR

    // Botón VR
    const vrButton = VRButton.createButton(renderer);
    vrButton.id = 'vr-button'; // Asignar ID para posible CSS
    document.body.appendChild(vrButton);

    // Luces
    const ambientLight = new THREE.AmbientLight(0x909090);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(15, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    // Ajustar shadow camera para evitar clipping cercano en VR
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -TILE_SIZE * mapWidth / 2;
    directionalLight.shadow.camera.right = TILE_SIZE * mapWidth / 2;
    directionalLight.shadow.camera.top = TILE_SIZE * mapHeight / 2;
    directionalLight.shadow.camera.bottom = -TILE_SIZE * mapHeight / 2;

    scene.add(directionalLight);
    const playerLight = new THREE.PointLight(0xffccaa, 0.4, TILE_SIZE * 5);
    camera.add(playerLight); // Luz sigue la cámara/cabeza

    // Controles (Pantalla)
    setupPointerLock(); // Configura listeners, pero se desactivarán en VR
    window.addEventListener('gamepadconnected', (event) => {
        if (renderer.xr.isPresenting) return; // Ignorar si está en VR
        console.log('Gamepad conectado:', event.gamepad.id);
        if (activeGamepadIndex === null) activeGamepadIndex = event.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', (event) => {
        console.log('Gamepad desconectado:', event.gamepad.id);
        if (activeGamepadIndex === event.gamepad.index) {
            activeGamepadIndex = null;
            findActiveGamepad(); // Buscar otro si es necesario
        }
    });
    findActiveGamepad(); // Intentar encontrar uno al inicio

    // Cargar Recursos y Construir Mundo
    preloadTextures().then(() => {
        findStartPosition(); // Posiciona el playerRig
        buildMapGeometry();
        scene.add(mapMeshesGroup);
        // Iniciar el bucle de renderizado
        renderer.setAnimationLoop(renderLoop); // <<<--- Usar setAnimationLoop
    }).catch(error => {
        console.error("Error crítico al cargar texturas:", error);
        document.body.innerHTML = `<div style="color: red; font-size: 20px; padding: 20px;">Error al cargar texturas. Revisa la consola (F12). Asegúrate de que las imágenes existan en la carpeta 'textures' y que uses un servidor local.</div>`;
        // Detener todo si fallan las texturas
    });

    window.addEventListener('resize', onWindowResize, false);
}

function findActiveGamepad() {
     if (renderer.xr.isPresenting) { // No buscar gamepads de pantalla en VR
        activeGamepadIndex = null;
        return;
    }
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    activeGamepadIndex = null;
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            activeGamepadIndex = i;
            console.log(`Gamepad (pantalla) activo encontrado en índice: ${i}`);
            break;
        }
    }
}

// --- Carga de Texturas (sin cambios) ---
async function loadTexture(url, isPlaceholder = false) {
    return new Promise((resolve, reject) => {
        textureLoader.load(
            url,
            (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestMipmapLinearFilter;
                if (!isPlaceholder) console.log(`Textura cargada: ${url}`);
                resolve(texture);
            },
            undefined, // onProgress
            (error) => {
                if (!isPlaceholder) {
                    console.error(`Error cargando textura: ${url}`, error);
                    if (placeholderTexture) {
                        console.warn(`Usando placeholder para ${url}`);
                        resolve(placeholderTexture); // Resuelve con placeholder si falla una normal
                    } else {
                        reject(`No se pudo cargar ${url} y el placeholder no está disponible.`);
                    }
                } else {
                    console.error(`¡¡ERROR CRÍTICO: No se pudo cargar la textura placeholder ${url}!!`, error);
                    reject(`No se pudo cargar la textura placeholder ${url}`);
                }
            }
        );
    });
}

async function preloadTextures() {
    try {
        placeholderTexture = await loadTexture(placeholderTextureUrl, true);
        console.log("Textura placeholder cargada.");

        const loadTextureArray = async (urls) => {
            const promises = urls.map(url => loadTexture(url));
            // Usamos Promise.allSettled para intentar cargar todas, incluso si alguna falla
            const results = await Promise.allSettled(promises);
            // Devolvemos las texturas que sí se cargaron (o el placeholder si fallaron)
            return results.map(result => result.status === 'fulfilled' ? result.value : placeholderTexture);
        };

        [wallTextures, floorTextures, ceilingTextures] = await Promise.all([
            loadTextureArray(wallTextureUrls),
            loadTextureArray(floorTextureUrls),
            loadTextureArray(ceilingTextureUrls)
        ]);
        console.log("Texturas de mapa procesadas.");

        // Añadir placeholder al inicio (índice 0) si no está ya
        if (wallTextures[0] !== placeholderTexture) wallTextures.unshift(placeholderTexture);
        if (floorTextures[0] !== placeholderTexture) floorTextures.unshift(placeholderTexture);
        if (ceilingTextures[0] !== placeholderTexture) ceilingTextures.unshift(placeholderTexture);

        console.log(`Total texturas pared (incl. placeholder): ${wallTextures.length}`);
        console.log(`Total texturas suelo (incl. placeholder): ${floorTextures.length}`);
        console.log(`Total texturas techo (incl. placeholder): ${ceilingTextures.length}`);

    } catch (error) {
        console.error("Fallo catastrófico durante la carga de texturas:", error);
        throw error; // Re-lanzar para detener la inicialización
    }
}


// --- Construcción de la Geometría del Mapa (sin cambios) ---
function buildMapGeometry() {
    while (mapMeshesGroup.children.length > 0) {
        const mesh = mapMeshesGroup.children[0];
        mapMeshesGroup.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(mat => {
                if (mat.map) mat.map.dispose();
                mat.dispose();
            });
        }
    }

    const wallGeometry = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
    const floorCeilingGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    floorCeilingGeometry.rotateX(-Math.PI / 2);
    const ceilingGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    ceilingGeometry.rotateX(Math.PI / 2);

    const materialsCache = {};
    const getMaterial = (texture) => {
        if (!texture || !texture.uuid) return new THREE.MeshStandardMaterial({ color: 0xff00ff, side: THREE.DoubleSide }); // Error color, DoubleSide por si acaso
        const cacheKey = texture.uuid;
        if (!materialsCache[cacheKey]) {
             // Asegurarse que la textura esté lista (puede que aún no esté cargada del todo al inicio)
            texture.needsUpdate = true;
            materialsCache[cacheKey] = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.85,
                metalness: 0.1,
                side: THREE.FrontSide
            });
        }
        return materialsCache[cacheKey];
    };

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const worldX = x * TILE_SIZE;
            const worldZ = y * TILE_SIZE;
            const wallType = wallMap[y]?.[x];

            if (wallType !== undefined && wallType > 0) {
                const texture = wallTextures[wallType] || wallTextures[0];
                const wallMaterial = getMaterial(texture);
                const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                wallMesh.position.set(worldX + TILE_SIZE / 2, WALL_HEIGHT / 2, worldZ + TILE_SIZE / 2);
                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;
                mapMeshesGroup.add(wallMesh);
            } else if (wallType === 0) {
                const floorTextureIndex = floorMap[y]?.[x] ?? 0;
                const ceilingTextureIndex = ceilingMap[y]?.[x] ?? 0;
                const floorTexture = floorTextures[floorTextureIndex] || floorTextures[0];
                const ceilingTexture = ceilingTextures[ceilingTextureIndex] || ceilingTextures[0];

                const floorMaterial = getMaterial(floorTexture);
                const floorMesh = new THREE.Mesh(floorCeilingGeometry, floorMaterial);
                floorMesh.position.set(worldX + TILE_SIZE / 2, 0, worldZ + TILE_SIZE / 2);
                floorMesh.receiveShadow = true;
                mapMeshesGroup.add(floorMesh);

                const ceilingMaterial = getMaterial(ceilingTexture);
                // Para techos, usar DoubleSide puede ser útil si el jugador puede mirar hacia arriba
                // ceilingMaterial.side = THREE.DoubleSide;
                const ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
                ceilingMesh.position.set(worldX + TILE_SIZE / 2, WALL_HEIGHT, worldZ + TILE_SIZE / 2);
                 // Los techos normalmente no proyectan sombras, pero pueden recibirlas
                // ceilingMesh.castShadow = false;
                // ceilingMesh.receiveShadow = true; // Depende de si hay luces arriba
                mapMeshesGroup.add(ceilingMesh);
            }
        }
    }
    console.log("Geometría del mapa construida.");
}

// --- Posición Inicial del Jugador ---
function findStartPosition() {
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (wallMap[y]?.[x] === 0) {
                // Posicionar el RIG, no la cámara directamente
                playerRig.position.x = x * TILE_SIZE + TILE_SIZE / 2;
                playerRig.position.z = y * TILE_SIZE + TILE_SIZE / 2;
                // La altura Y ya se estableció en init
                console.log(`Posición inicial jugador (Rig): x=${playerRig.position.x}, z=${playerRig.position.z}`);
                return;
            }
        }
    }
    console.warn("No se encontró espacio vacío, colocando en el centro.");
    playerRig.position.x = (mapWidth / 2) * TILE_SIZE;
    playerRig.position.z = (mapHeight / 2) * TILE_SIZE;
}

// --- Controles de Pantalla (Teclado/Ratón/Gamepad) ---
function setupPointerLock() {
    const canvas = renderer.domElement;
    canvas.addEventListener('click', () => {
        // Solo pedir bloqueo si NO estamos en VR y NO está bloqueado ya
        if (!renderer.xr.isPresenting && !isPointerLocked) {
             canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
             if (canvas.requestPointerLock) canvas.requestPointerLock();
        }
    });

    const pointerLockChange = () => {
        isPointerLocked = !!(document.pointerLockElement === canvas || document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas);
        if (renderer.xr.isPresenting) isPointerLocked = false; // Asegurar que no esté bloqueado en VR
        console.log("Pointer Locked:", isPointerLocked);
    };

    document.addEventListener('pointerlockchange', pointerLockChange, false);
    document.addEventListener('mozpointerlockchange', pointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', pointerLockChange, false);

    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
}

// Rotación para modo pantalla
function rotatePlayer(deltaX, deltaY) {
    if (!isPointerLocked || renderer.xr.isPresenting) return; // Solo si está bloqueado y no en VR

    // --- Rotación Horizontal (Yaw) ---
    // Gira el RIG completo sobre el eje Y del MUNDO.
    playerRig.rotation.y -= deltaX;

    // --- Rotación Vertical (Pitch) ---
    // Gira solo la CÁMARA alrededor de su eje X LOCAL dentro del RIG.
    const maxPitch = Math.PI / 2 - 0.05;
    const minPitch = -Math.PI / 2 + 0.05;
    camera.rotation.x -= deltaY;
    camera.rotation.x = Math.max(minPitch, Math.min(maxPitch, camera.rotation.x));
    // Z (Roll) se mantiene en 0 por el orden 'YXZ'
}

function onMouseMove(event) {
    if (!isPointerLocked || renderer.xr.isPresenting) return; // <<< Guard VR
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    rotatePlayer(movementX * lookSpeed, movementY * lookSpeed);
}

function onKeyDown(event) {
    if (event.repeat || renderer.xr.isPresenting) return; // <<< Guard VR
    // Pedir bloqueo si se pulsa tecla de movimiento y no estamos bloqueados/en VR
    if (!isPointerLocked && ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(event.key.toLowerCase())) {
         renderer.domElement.click();
    }
    switch (event.key.toLowerCase()) {
        case 'w': case 'arrowup':    moveState.forward = 1; break;
        case 's': case 'arrowdown':  moveState.back = 1; break;
        case 'a': case 'arrowleft':  moveState.left = 1; break; // Strafe Izquierda
        case 'd': case 'arrowright': moveState.right = 1; break;// Strafe Derecha
    }
}

function onKeyUp(event) {
     if (renderer.xr.isPresenting) return; // <<< Guard VR
    switch (event.key.toLowerCase()) {
        case 'w': case 'arrowup':    moveState.forward = 0; break;
        case 's': case 'arrowdown':  moveState.back = 0; break;
        case 'a': case 'arrowleft':  moveState.left = 0; break;
        case 'd': case 'arrowright': moveState.right = 0; break;
    }
}

function handleGamepadInputScreen(delta) { // Renombrado para claridad
    if (activeGamepadIndex === null || renderer.xr.isPresenting) return; // <<< Guard VR

    const gamepads = navigator.getGamepads();
    const gp = gamepads[activeGamepadIndex];
    if (!gp) {
        findActiveGamepad(); // Intentar encontrar otro si se desconecta
        return;
    }

    // Mapeo común: Asumiendo stick izquierdo para mover, derecho para mirar
    const leftStickX = gp.axes[0] || 0;
    const leftStickY = gp.axes[1] || 0; // Negativo es arriba
    const rightStickX = gp.axes[2] || 0;
    const rightStickY = gp.axes[3] || 0; // Negativo es arriba

    // --- Movimiento (Stick Izquierdo) ---
    let gpForward = 0, gpBack = 0, gpLeft = 0, gpRight = 0;
    if (leftStickY < -gamepadDeadZone) gpForward = 1; // Arriba -> Adelante
    else if (leftStickY > gamepadDeadZone) gpBack = 1; // Abajo -> Atrás
    if (leftStickX < -gamepadDeadZone) gpLeft = 1; // Izquierda -> Strafe Izquierda
    else if (leftStickX > gamepadDeadZone) gpRight = 1; // Derecha -> Strafe Derecha

    // Actualizar moveState: Prioridad Teclado > Gamepad
    moveState.forward = Math.max(moveState.forward, gpForward);
    moveState.back = Math.max(moveState.back, gpBack);
    moveState.left = Math.max(moveState.left, gpLeft);
    moveState.right = Math.max(moveState.right, gpRight);

    // --- Vista (Stick Derecho) ---
    let lookX = 0, lookY = 0;
    if (Math.abs(rightStickX) > gamepadDeadZone) lookX = rightStickX;
    if (Math.abs(rightStickY) > gamepadDeadZone) lookY = rightStickY;

    if (lookX !== 0 || lookY !== 0) {
        // No necesitamos isPointerLocked aquí, el gamepad siempre puede mirar
        const deltaLookX = lookX * gamepadLookSpeed * delta;
        const deltaLookY = lookY * gamepadLookSpeed * delta;
        rotatePlayer(deltaLookX, deltaLookY); // Rotar jugador/cámara
    }
}

// --- Movimiento y Colisión (Común para Pantalla y VR, adaptado) ---
const worldDirection = new THREE.Vector3();
const rightDirection = new THREE.Vector3();
const velocity = new THREE.Vector3();

function updateMovement(delta, useVRInput = false) {
    const currentMoveState = useVRInput ? vrMoveState : moveState;
    const speed = useVRInput ? moveSpeed * vrMoveSpeedFactor : moveSpeed;
    const moveDistance = speed * delta;

    velocity.set(0, 0, 0); // Reset velocity

    // Obtener dirección de referencia:
    // - Pantalla: Dirección del Rig (controlado por ratón/gamepad Y)
    // - VR: Dirección de la Cámara/Cabeza (controlado por headset)
    const referenceObject = useVRInput ? camera : playerRig;
    referenceObject.getWorldDirection(worldDirection);
    worldDirection.y = 0; // Proyectar en el plano XZ
    worldDirection.normalize();

    // Calcular dirección derecha relativa a la referencia
    // Usar camera.up global (0,1,0) ya que worldDirection está en XZ
    rightDirection.crossVectors(new THREE.Vector3(0, 1, 0), worldDirection).normalize();
    // Invertir si es necesario (depende de la convención, three.js suele ser Y-up, X-right, Z-out)
    // Si strafe está invertido, quitar el .negate() o ajustar crossVectors
     rightDirection.negate(); // Para que 'D' (right) mueva hacia +X relativo


    // Calcular movimiento neto basado en el estado actual (VR o Pantalla)
    let moveZ = (currentMoveState.forward ? 1 : 0) - (currentMoveState.back ? 1 : 0);
    let moveX = (currentMoveState.right ? 1 : 0) - (currentMoveState.left ? 1 : 0); // Strafe

    // Aplicar movimiento relativo a la dirección de referencia
    velocity.add(worldDirection.multiplyScalar(moveZ));
    velocity.add(rightDirection.multiplyScalar(moveX));

    if (velocity.lengthSq() > 0) {
        velocity.normalize().multiplyScalar(moveDistance);
    } else {
        return; // No hay movimiento
    }

    // --- Colisión Simple (con el Rig) ---
    const currentPos = playerRig.position;
    let finalVelocity = velocity.clone();

    // Check X
    if (velocity.x !== 0) {
        const nextGridX = Math.floor((currentPos.x + velocity.x) / TILE_SIZE);
        const currentGridZ = Math.floor(currentPos.z / TILE_SIZE);
        if (isWallAt(nextGridX, currentGridZ)) {
            finalVelocity.x = 0; // Choca en X
        }
    }

    // Check Z
    if (velocity.z !== 0) {
        const currentGridX = Math.floor(currentPos.x / TILE_SIZE);
        const nextGridZ = Math.floor((currentPos.z + velocity.z) / TILE_SIZE);
        if (isWallAt(currentGridX, nextGridZ)) {
            finalVelocity.z = 0; // Choca en Z
        }
    }

    // Check Esquina Diagonal (si ambos X y Z intentaron moverse y fueron bloqueados)
    if (velocity.x !== 0 && velocity.z !== 0 && finalVelocity.x === 0 && finalVelocity.z === 0) {
        const nextGridX = Math.floor((currentPos.x + velocity.x) / TILE_SIZE);
        const nextGridZ = Math.floor((currentPos.z + velocity.z) / TILE_SIZE);
        if (isWallAt(nextGridX, nextGridZ)) {
            // La esquina es pared, mantener ambos bloqueados (ya están en 0)
        } else {
            // Esquina libre: Permitir "deslizar" intentando solo X o solo Z
            // Prueba permitir solo X
            if (!isWallAt(nextGridX, Math.floor(currentPos.z / TILE_SIZE))) {
                 finalVelocity.x = velocity.x; // Desbloquear X
            }
            // Prueba permitir solo Z
            else if (!isWallAt(Math.floor(currentPos.x / TILE_SIZE), nextGridZ)) {
                 finalVelocity.z = velocity.z; // Desbloquear Z
            }
            // Si ambos individuales también chocan (esquina interna rara), se queda bloqueado.
        }
    }

    // Aplicar la velocidad final al RIG
    playerRig.position.add(finalVelocity);
    // Mantener altura Y constante (la cámara dentro del rig se ajustará por VR)
    playerRig.position.y = WALL_HEIGHT / 2;
}

function isWallAt(gridX, gridZ) {
    if (gridX < 0 || gridX >= mapWidth || gridZ < 0 || gridZ >= mapHeight) {
        return true; // Fuera de límites es pared
    }
    return wallMap[gridZ]?.[gridX] > 0;
}


// --- Input y Movimiento VR ---
function handleVRInput() {
    // Resetear estado de movimiento VR
    vrMoveState.forward = 0;
    vrMoveState.back = 0;
    vrMoveState.left = 0;
    vrMoveState.right = 0;

    // Intentar obtener el controlador izquierdo (índice 0)
    const controller = renderer.xr.getController(0); // 0 suele ser izquierdo

    if (controller && controller.gamepad) {
        const axes = controller.gamepad.axes;
        // Asumir que los ejes 2 y 3 son el joystick/touchpad principal
        // (Puede variar por controlador: Oculus Touch usa 2,3; Vive usa 0,1)
        // ¡¡¡ AJUSTAR ÍNDICES DE EJES SEGÚN TU HARDWARE !!!
        // Ejemplo para Oculus Touch (stick izquierdo):
         const stickX = axes[2] || 0;
         const stickY = axes[3] || 0; // Negativo es arriba

        // Comentar/Descomentar según el controlador:
        // Ejemplo para Vive Wand (touchpad izquierdo):
        // const stickX = axes[0] || 0;
        // const stickY = axes[1] || 0; // Negativo es arriba

        // Aplicar deadzone y actualizar estado VR
        if (stickY < -vrDeadZone) vrMoveState.forward = 1;
        else if (stickY > vrDeadZone) vrMoveState.back = 1;

        if (stickX < -vrDeadZone) vrMoveState.left = 1; // Strafe izquierda
        else if (stickX > vrDeadZone) vrMoveState.right = 1; // Strafe derecha

        // Aquí podrías añadir lógica para botones (saltar, interactuar, etc.)
        // const buttons = controller.gamepad.buttons;
        // if (buttons[0] && buttons[0].pressed) { /* Trigger presionado */ }
        // if (buttons[1] && buttons[1].pressed) { /* Grip presionado */ }
    }
     // Podrías añadir manejo para el controlador derecho (índice 1) si quieres
     // p.ej., para snap turning o acciones
}


// --- Bucle Principal de Renderizado ---
function renderLoop(timestamp, frame) { // frame es proporcionado por WebXR
    const delta = clock.getDelta();

    if (renderer.xr.isPresenting) {
        // --- Modo VR ---
        handleVRInput(); // Leer mandos VR
        updateMovement(delta, true); // Mover usando vrMoveState y dirección de cabeza
        // ¡NO rotar jugador con ratón/gamepad! La cabeza controla la vista.
        // La rotación del RIG (Yaw) se mantiene constante a menos que implementemos snap/smooth turning.
    } else {
        // --- Modo Pantalla ---
        // Restablecer estado del teclado/gamepad (onKeyUp los pone a 0)
        const keyF = moveState.forward; const keyB = moveState.back;
        const keyL = moveState.left;   const keyR = moveState.right;
        moveState.forward = 0; moveState.back = 0; moveState.left = 0; moveState.right = 0;

        // Leer gamepad de pantalla (puede actualizar moveState)
        handleGamepadInputScreen(delta);

        // Restaurar teclado si estaba presionado (prioridad)
        moveState.forward = Math.max(moveState.forward, keyF);
        moveState.back = Math.max(moveState.back, keyB);
        moveState.left = Math.max(moveState.left, keyL);
        moveState.right = Math.max(moveState.right, keyR);


        updateMovement(delta, false); // Mover usando moveState y dirección del rig
        // La rotación por ratón/gamepad ya se aplica en sus respectivos handlers
    }

    // Renderizar la escena
    // setAnimationLoop se encarga de llamar a esto para ambos ojos en VR
    renderer.render(scene, camera);
}

// --- Ajuste de Ventana ---
function onWindowResize() {
    // Solo ajustar si no estamos en VR (la sesión XR maneja su propia resolución)
    if (!renderer.xr.isPresenting) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// --- ¡Empezar! ---
init();