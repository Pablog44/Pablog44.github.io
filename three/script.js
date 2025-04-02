
// --- Configuración Inicial ---
const TILE_SIZE = 5;      // Tamaño de cada cuadrado en el mundo 3D
const WALL_HEIGHT = 5;    // Altura de las paredes
const moveSpeed = 8.0;    // Velocidad de movimiento del jugador (teclado)
const lookSpeed = 0.003;  // Sensibilidad del ratón
const gamepadLookSpeed = 1.5; // Sensibilidad de la vista con gamepad (ajusta según sea necesario)
const gamepadDeadZone = 0.15; // Zona muerta para los sticks del gamepad

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

// Movimiento y Control
const moveState = { forward: 0, back: 0, left: 0, right: 0 }; // Combinará teclado y gamepad
let isPointerLocked = false;
let activeGamepadIndex = null; // Índice del gamepad activo
let stats;

// --- Inicialización ---
function init() {
    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    stats = new Stats();
    stats.showPanel(0); // 0 = FPS
    document.body.appendChild(stats.dom);

    // Cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = WALL_HEIGHT / 2;
    // Orden de rotación importante para FPS: YXZ
    // El eje Y (Yaw) se aplica primero globalmente, luego X (Pitch) localmente. Z (Roll) se mantiene en 0.
    camera.rotation.order = 'YXZ';


    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Luces
    const ambientLight = new THREE.AmbientLight(0x909090);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(15, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);
    const playerLight = new THREE.PointLight(0xffccaa, 0.4, TILE_SIZE * 5);
    camera.add(playerLight);
    scene.add(camera);

    // Controles
    setupPointerLock();
    window.addEventListener('gamepadconnected', (event) => {
        console.log('Gamepad conectado:', event.gamepad.id);
        if (activeGamepadIndex === null) activeGamepadIndex = event.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', (event) => {
        console.log('Gamepad desconectado:', event.gamepad.id);
        if (activeGamepadIndex === event.gamepad.index) {
            activeGamepadIndex = null;
            findActiveGamepad();
        }
    });
    findActiveGamepad();

    // Cargar Recursos y Construir Mundo
    preloadTextures().then(() => {
        findStartPosition();
        buildMapGeometry();
        scene.add(mapMeshesGroup);
        animate();
    }).catch(error => {
        console.error("Error crítico al cargar texturas:", error);
        document.body.innerHTML = `<div style="color: red; font-size: 20px; padding: 20px;">Error al cargar texturas. Revisa la consola (F12). Asegúrate de que las imágenes existan en la carpeta 'textures' y que uses un servidor local.</div>`;
    });

    window.addEventListener('resize', onWindowResize, false);
}

function findActiveGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    activeGamepadIndex = null;
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            activeGamepadIndex = i;
            console.log(`Gamepad activo encontrado en índice: ${i}`);
            break;
        }
    }
}

// --- Carga de Texturas ---
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
                        resolve(placeholderTexture);
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
            return Promise.all(promises);
        };

        [wallTextures, floorTextures, ceilingTextures] = await Promise.all([
            loadTextureArray(wallTextureUrls),
            loadTextureArray(floorTextureUrls),
            loadTextureArray(ceilingTextureUrls)
        ]);
        console.log("Texturas de mapa procesadas.");

        // Añadir placeholder al inicio (índice 0)
        wallTextures.unshift(placeholderTexture);
        floorTextures.unshift(placeholderTexture);
        ceilingTextures.unshift(placeholderTexture);
        console.log(`Total texturas pared (incl. placeholder): ${wallTextures.length}`);
        console.log(`Total texturas suelo (incl. placeholder): ${floorTextures.length}`);
        console.log(`Total texturas techo (incl. placeholder): ${ceilingTextures.length}`);

    } catch (error) {
        console.error("Fallo catastrófico durante la carga de texturas:", error);
        throw error;
    }
}

// --- Construcción de la Geometría del Mapa ---
function buildMapGeometry() {
    // Limpiar geometría anterior
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
    floorCeilingGeometry.rotateX(-Math.PI / 2); // Suelo
    const ceilingGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    ceilingGeometry.rotateX(Math.PI / 2); // Techo

    const materialsCache = {};
    const getMaterial = (texture) => {
        if (!texture || !texture.uuid) return new THREE.MeshStandardMaterial({ color: 0xff00ff }); // Error color
        const cacheKey = texture.uuid;
        if (!materialsCache[cacheKey]) {
            materialsCache[cacheKey] = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.85, // Ajusta para apariencia deseada
                metalness: 0.1,
                side: THREE.FrontSide // Renderizar solo cara frontal por defecto
            });
        }
        return materialsCache[cacheKey];
    };

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const worldX = x * TILE_SIZE;
            const worldZ = y * TILE_SIZE;

            const wallType = wallMap[y]?.[x]; // Usar optional chaining por si acaso

            if (wallType !== undefined && wallType > 0) {
                // --- Pared ---
                const texture = wallTextures[wallType] || wallTextures[0]; // Usa índice directo, fallback a 0 (placeholder)
                if (texture) {
                    const wallMaterial = getMaterial(texture);
                    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                    wallMesh.position.set(worldX + TILE_SIZE / 2, WALL_HEIGHT / 2, worldZ + TILE_SIZE / 2);
                    wallMesh.castShadow = true;
                    wallMesh.receiveShadow = true;
                    mapMeshesGroup.add(wallMesh);
                } else {
                     console.error(`Fallo crítico: No hay textura de pared (${x},${y})`);
                }
            } else if (wallType === 0) { // Solo crear suelo/techo si NO es pared
                // --- Suelo y Techo ---
                const floorTextureIndex = floorMap[y]?.[x] ?? 0;
                const ceilingTextureIndex = ceilingMap[y]?.[x] ?? 0;

                const floorTexture = floorTextures[floorTextureIndex] || floorTextures[0];
                const ceilingTexture = ceilingTextures[ceilingTextureIndex] || ceilingTextures[0];

                // Crear Suelo
                if (floorTexture) {
                    const floorMaterial = getMaterial(floorTexture);
                    const floorMesh = new THREE.Mesh(floorCeilingGeometry, floorMaterial);
                    floorMesh.position.set(worldX + TILE_SIZE / 2, 0, worldZ + TILE_SIZE / 2);
                    floorMesh.receiveShadow = true;
                    mapMeshesGroup.add(floorMesh);
                } else {
                    console.error(`Fallo crítico: No hay textura de suelo (${x},${y})`);
                }

                // Crear Techo
                 if (ceilingTexture) {
                    const ceilingMaterial = getMaterial(ceilingTexture);
                    const ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
                    ceilingMesh.position.set(worldX + TILE_SIZE / 2, WALL_HEIGHT, worldZ + TILE_SIZE / 2);
                    mapMeshesGroup.add(ceilingMesh);
                 } else {
                    console.error(`Fallo crítico: No hay textura de techo (${x},${y})`);
                 }
            }
            // Si wallType es undefined (mapa irregular), no se crea nada para esa celda.
        }
    }
    console.log("Geometría del mapa construida.");
}

// --- Posición Inicial del Jugador ---
function findStartPosition() {
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (wallMap[y]?.[x] === 0) {
                camera.position.x = x * TILE_SIZE + TILE_SIZE / 2;
                camera.position.z = y * TILE_SIZE + TILE_SIZE / 2;
                camera.position.y = WALL_HEIGHT / 2;
                console.log(`Posición inicial jugador: x=${x}, z=${y}`);
                return;
            }
        }
    }
    console.warn("No se encontró espacio vacío, colocando en el centro.");
    camera.position.x = (mapWidth / 2) * TILE_SIZE;
    camera.position.z = (mapHeight / 2) * TILE_SIZE;
    camera.position.y = WALL_HEIGHT / 2;
}

// --- Controles de Movimiento y Cámara ---
function setupPointerLock() {
    const canvas = renderer.domElement;
    canvas.addEventListener('click', () => {
        if (!isPointerLocked) {
             canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
             if (canvas.requestPointerLock) canvas.requestPointerLock();
        }
    });

    const pointerLockChange = () => {
        isPointerLocked = !!(document.pointerLockElement === canvas || document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas);
        console.log("Pointer Locked:", isPointerLocked);
    };

    document.addEventListener('pointerlockchange', pointerLockChange, false);
    document.addEventListener('mozpointerlockchange', pointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', pointerLockChange, false);

    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
}

// =============================================================
// ===== ROTACIÓN DE CÁMARA CORREGIDA =====
// =============================================================
function rotateCamera(deltaX, deltaY) {
    // --- Rotación Horizontal (Yaw) ---
    // Gira la CÁMARA alrededor del eje Y del MUNDO (Vector3(0, 1, 0)).
    // Esto es crucial para que la cámara gire sobre sí misma horizontalmente
    // sin inclinarse respecto a la gravedad global.
    camera.rotation.y -= deltaX; // Aplicar rotación Y directamente (orden YXZ)

    // --- Rotación Vertical (Pitch) ---
    // Gira la CÁMARA alrededor de su propio eje X LOCAL.
    // Necesitamos limitar esta rotación para no dar la vuelta.
    const maxPitch = Math.PI / 2 - 0.05; // Límite superior (casi 90 grados)
    const minPitch = -Math.PI / 2 + 0.05; // Límite inferior (casi -90 grados)

    // Aplicar el cambio de pitch y luego clampear (limitar)
    camera.rotation.x -= deltaY;
    camera.rotation.x = Math.max(minPitch, Math.min(maxPitch, camera.rotation.x));

    // Asegurarse de que no haya rotación en Z (Roll)
    // Como usamos orden 'YXZ', la rotación Z debería permanecer 0,
    // pero lo forzamos por seguridad.
    camera.rotation.z = 0;
}
// =============================================================

function onMouseMove(event) {
    if (!isPointerLocked) return;
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    rotateCamera(movementX * lookSpeed, movementY * lookSpeed);
}

function onKeyDown(event) {
    if (event.repeat) return;
    if (!isPointerLocked && ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(event.key.toLowerCase())) {
         renderer.domElement.click();
    }
    switch (event.key.toLowerCase()) {
        case 'w': case 'arrowup':    moveState.forward = 1; break;
        case 's': case 'arrowdown':  moveState.back = 1; break;
        case 'd': case 'arrowleft':  moveState.left = 1; break;
        case 'a': case 'arrowright': moveState.right = 1; break;
    }
}

function onKeyUp(event) {
    switch (event.key.toLowerCase()) {
        case 'w': case 'arrowup':    moveState.forward = 0; break;
        case 's': case 'arrowdown':  moveState.back = 0; break;
        case 'd': case 'arrowleft':  moveState.left = 0; break;
        case 'a': case 'arrowright': moveState.right = 0; break;
    }
}

function handleGamepadInput(delta) {
    if (activeGamepadIndex === null) return;

    const gamepads = navigator.getGamepads();
    const gp = gamepads[activeGamepadIndex];
    if (!gp) {
        activeGamepadIndex = null;
        findActiveGamepad();
        return;
    }

    const leftStickX = gp.axes[0] || 0; // Izquierda/Derecha
    const leftStickY = gp.axes[1] || 0; // Adelante/Atrás
    const rightStickX = gp.axes[2] || 0;
    const rightStickY = gp.axes[3] || 0;

    // --- Movimiento (Stick Izquierdo) ---
    // Reseteamos el estado del gamepad cada frame y lo recalculamos
    let gpForward = 0, gpBack = 0, gpLeft = 0, gpRight = 0;
    if (leftStickY < -gamepadDeadZone) gpForward = 1;
    else if (leftStickY > gamepadDeadZone) gpBack = 1;
    if (leftStickX < -gamepadDeadZone) gpLeft = 1;
    else if (leftStickX > gamepadDeadZone) gpRight = 1;

    // Actualizar moveState: Teclado tiene prioridad si está activo (1), si no (0), usa gamepad.
    moveState.forward = Math.max(moveState.forward, gpForward);
    moveState.back = Math.max(moveState.back, gpBack);
    moveState.left = Math.max(moveState.left, gpLeft);
    moveState.right = Math.max(moveState.right, gpRight);
     // Si se suelta la tecla, onKeyUp pone a 0, y en el siguiente frame
     // el gamepad tomará el control si el stick sigue presionado.

    // --- Vista (Stick Derecho) ---
    let lookX = 0, lookY = 0;
    if (Math.abs(rightStickX) > gamepadDeadZone) lookX = rightStickX;
    if (Math.abs(rightStickY) > gamepadDeadZone) lookY = rightStickY;

    if (lookX !== 0 || lookY !== 0) {
        const deltaLookX = lookX * gamepadLookSpeed * delta;
        const deltaLookY = lookY * gamepadLookSpeed * delta;
        rotateCamera(deltaLookX, deltaLookY);
    }
}

function updateMovement(delta) {
    // Copiamos el estado del teclado para que handleGamepadInput no lo sobrescriba permanentemente
    const keyboardState = { ...moveState };
    // Procesar gamepad (puede modificar moveState temporalmente)
    handleGamepadInput(delta);
    // Ahora moveState refleja la combinación (priorizando teclado si = 1)

    const moveDistance = moveSpeed * delta;
    const velocity = new THREE.Vector3();
    const worldDirection = new THREE.Vector3();

    // Obtener dirección a la que mira la cámara en el plano XZ
    camera.getWorldDirection(worldDirection);
    worldDirection.y = 0;
    worldDirection.normalize();

    // Calcular dirección derecha relativa
    const rightDirection = new THREE.Vector3().crossVectors(camera.up, worldDirection).normalize();

    // Calcular movimiento neto en ejes relativos
    let moveZ = (moveState.forward ? 1 : 0) - (moveState.back ? 1 : 0);
    let moveX = (moveState.right ? 1 : 0) - (moveState.left ? 1 : 0);

    // Aplicar movimiento
    velocity.add(worldDirection.multiplyScalar(moveZ));
    velocity.add(rightDirection.multiplyScalar(moveX));

    // Resetear moveState al estado del teclado para el próximo frame
    // Esto evita que el estado del gamepad "se quede pegado" si se suelta el stick
    // mientras se mantiene presionada una tecla.
     moveState.forward = keyboardState.forward;
     moveState.back = keyboardState.back;
     moveState.left = keyboardState.left;
     moveState.right = keyboardState.right;


    if (velocity.lengthSq() > 0) {
        velocity.normalize().multiplyScalar(moveDistance);
    } else {
        return; // No hay movimiento
    }

    // --- Colisión Simple ---
    const currentPos = camera.position;
    let finalVelocity = velocity.clone();

    const checkCollision = (axisVelocity, targetCoordFunc, wallCheckCoordFunc) => {
        if (axisVelocity === 0) return 0; // No hay movimiento en este eje

        const targetCoord = targetCoordFunc(axisVelocity);
        const wallCheckCoords = wallCheckCoordFunc();

        if (isWallAt(wallCheckCoords.x, wallCheckCoords.z)) {
            return 0; // Choca, detener movimiento en este eje
        }
        return axisVelocity; // No choca, mantener velocidad
    };

    // Comprobar X
    finalVelocity.x = checkCollision(
        velocity.x,
        (vx) => currentPos.x + vx,
        () => ({ x: Math.floor((currentPos.x + velocity.x) / TILE_SIZE), z: Math.floor(currentPos.z / TILE_SIZE) })
    );

    // Comprobar Z
    finalVelocity.z = checkCollision(
        velocity.z,
        (vz) => currentPos.z + vz,
        () => ({ x: Math.floor(currentPos.x / TILE_SIZE), z: Math.floor((currentPos.z + velocity.z) / TILE_SIZE) })
    );

     // Comprobación adicional para esquinas internas (si ambos ejes fueron bloqueados)
     if (velocity.x !== 0 && velocity.z !== 0 && finalVelocity.x === 0 && finalVelocity.z === 0) {
         const diagGridX = Math.floor((currentPos.x + velocity.x) / TILE_SIZE);
         const diagGridZ = Math.floor((currentPos.z + velocity.z) / TILE_SIZE);
         if (isWallAt(diagGridX, diagGridZ)) {
             // La esquina diagonal es pared, mantener ambos bloqueados (ya están en 0)
         } else {
              // La esquina diagonal está libre. ¿Cuál eje desbloquear?
              // Podríamos intentar permitir solo X o solo Z, pero mantenerlos bloqueados
              // suele ser un comportamiento aceptable y más simple para evitar "atravesar" esquinas.
              // Para un deslizamiento más avanzado se necesitaría calcular colisión con los planos de las paredes.
         }
     }


    camera.position.add(finalVelocity);
    camera.position.y = WALL_HEIGHT / 2; // Mantener altura constante
}

function isWallAt(gridX, gridZ) {
    if (gridX < 0 || gridX >= mapWidth || gridZ < 0 || gridZ >= mapHeight) {
        return true; // Fuera de límites es pared
    }
    return wallMap[gridZ]?.[gridX] > 0; // Devuelve true si es mayor que 0, false si es 0 o undefined
}

// --- Bucle de Animación ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    updateMovement(delta); // Actualizar gamepad, teclado, movimiento y colisión
    renderer.render(scene, camera);
    stats.update();
}

// --- Ajuste de Ventana ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- ¡Empezar! ---
init();