// --- Configuración Inicial ---
const TILE_SIZE = 5;      // Tamaño de cada cuadrado en el mundo 3D
const WALL_HEIGHT = 5;    // Altura de las paredes
const moveSpeed = 5.0;    // Velocidad base
const lookSpeed = 0.003;  // Sensibilidad del ratón (solo pantalla)
const gamepadLookSpeed = 1.5; // Sensibilidad de la vista con gamepad (solo pantalla)
const gamepadDeadZone = 0.15; // Zona muerta para los sticks del gamepad (pantalla)
const vrMoveSpeedFactor = 0.7; // Multiplicador de velocidad en VR (más lento suele ser mejor para confort)
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
const wallTextureUrls = ['textures/wall1.png', 'textures/wall2.png'];
const floorTextureUrls = ['textures/floor1.png', 'textures/floor2.png'];
const ceilingTextureUrls = ['textures/ceiling1.png', 'textures/ceiling2.png'];
const placeholderTextureUrl = 'textures/placeholder.png';

// --- Variables Globales de Three.js y Juego ---
let scene, camera, renderer;
let clock = new THREE.Clock();
let textureLoader = new THREE.TextureLoader();
let wallTextures = [];
let floorTextures = [];
let ceilingTextures = [];
let placeholderTexture = null;
let mapMeshesGroup = new THREE.Group(); // Grupo para todos los elementos estáticos del mapa
let mapWidth = wallMap[0].length;
let mapHeight = wallMap.length;
let playerRig; // <<<--- Grupo para mover al jugador (contiene la cámara y controla la posición/orientación base)

// Movimiento y Control
const moveState = { forward: 0, back: 0, left: 0, right: 0 }; // Teclado/Gamepad (pantalla)
const vrMoveState = { forward: 0, back: 0, left: 0, right: 0 }; // VR Controllers
let isPointerLocked = false;
let activeGamepadIndex = null; // Índice del gamepad activo (pantalla)

// --- Inicialización ---
function init() {
    // **IMPORTANT**: Check for WebXR support early
    if (!navigator.xr) {
        console.error("WebXR API not found. Ensure you're using a compatible browser (Chrome, Edge, Oculus Browser, Firefox Nightly) and running this page via HTTPS or localhost.");
        document.body.innerHTML = `<div style="padding: 20px; color: red; font-size: 18px;">
            Error: WebXR not supported or enabled.<br>
            Please use a WebXR-compatible browser (like Chrome, Edge, Oculus Browser).<br>
            Also, ensure you are running this page from a secure context (<b>https://</b> or <b>http://localhost</b>), not directly from the file system (file:///).
            </div>`;
        return; // Stop initialization if WebXR is not available
    }

    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a); // Darker background often better for VR
    scene.fog = new THREE.Fog(scene.background, TILE_SIZE * 2, TILE_SIZE * mapWidth * 0.8);

    // Cámara
    // Field of View (FOV) might be overridden by VR headset, but good default
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Set rotation order for intuitive FPS controls (Yaw, Pitch, Roll)
    camera.rotation.order = 'YXZ';

    // Player Rig (Crucial for VR)
    // This group represents the player's base position and yaw (left/right turn) on the floor.
    // The camera is placed inside this rig. In VR, the headset controls the camera's
    // position *relative* to this rig's position and its rotation (pitch/roll/head-yaw).
    playerRig = new THREE.Group();
    playerRig.position.y = WALL_HEIGHT / 2; // Set base eye-height (VR headset adds offset)
    playerRig.add(camera); // Attach camera to the rig
    scene.add(playerRig); // Add the rig to the scene

    // Renderer
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Sharper rendering
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

    // Enable WebXR
    renderer.xr.enabled = true;
    // Set the frame of reference. 'local-floor' assumes the user's physical floor
    // corresponds to y=0 in the playerRig's space. Height is added by tracking.
    renderer.xr.setReferenceSpaceType('local-floor');

    // VR Button (Checks for compatibility before showing)
    const vrButton = VRButton.createButton(renderer);
    vrButton.id = 'vr-button';
    document.body.appendChild(vrButton);
    vrButton.addEventListener('click', () => {
         // Explicitly release pointer lock if entering VR while locked
        if (isPointerLocked) {
            document.exitPointerLock();
        }
    });


    // Luces
    const ambientLight = new THREE.AmbientLight(0x808080); // Slightly brighter ambient
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7); // Slightly stronger directional
    directionalLight.position.set(15, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    // Adjust shadow camera bounds to fit the map
    const mapExtentX = mapWidth * TILE_SIZE;
    const mapExtentZ = mapHeight * TILE_SIZE;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100; // Adjust far plane based on scene size + light distance
    directionalLight.shadow.camera.left = -mapExtentX / 2 - TILE_SIZE;
    directionalLight.shadow.camera.right = mapExtentX / 2 + TILE_SIZE;
    directionalLight.shadow.camera.top = mapExtentZ / 2 + TILE_SIZE;
    directionalLight.shadow.camera.bottom = -mapExtentZ / 2 - TILE_SIZE;
    scene.add(directionalLight);
    // scene.add(new THREE.CameraHelper(directionalLight.shadow.camera)); // Uncomment to debug shadow camera

    // Optional: Small light attached to the player/camera for nearby illumination
    const playerLight = new THREE.PointLight(0xffccaa, 0.3, TILE_SIZE * 4);
    // Attach to camera so it follows head movement in VR and screen mode
    camera.add(playerLight);

    // Controles (Pantalla) - Setup listeners, they will be ignored if in VR mode
    setupScreenControls();
    setupGamepadSupport();

    // Cargar Recursos y Construir Mundo
    preloadTextures().then(() => {
        findStartPosition(); // Position the playerRig
        buildMapGeometry();
        scene.add(mapMeshesGroup);
        // Start the render loop using WebXR's recommended method
        renderer.setAnimationLoop(renderLoop);
    }).catch(error => {
        console.error("CRITICAL ERROR loading textures:", error);
        // Display a user-friendly error message
        document.body.innerHTML = `<div style="color: red; font-size: 20px; padding: 20px;">
            Error loading game textures. Check the console (F12) for details.<br>
            Ensure the 'textures' folder exists and contains the required images.<br>
            Make sure you are running this from a local server (http://localhost).
            </div>`;
        // No need to call setAnimationLoop if loading failed
    });

    window.addEventListener('resize', onWindowResize, false);
}

// --- Texture Loading (Improved Error Handling) ---
async function loadTexture(url, isPlaceholder = false) {
    return new Promise((resolve, reject) => {
        console.log(`Attempting to load texture: ${url}`);
        textureLoader.load(
            url,
            (texture) => { // onLoad
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.magFilter = THREE.NearestFilter; // Pixelated look
                texture.minFilter = THREE.LinearMipmapLinearFilter; // Good balance for distance
                // texture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Optional: Sharper textures at angles
                console.log(`Successfully loaded: ${url}`);
                resolve(texture);
            },
            undefined, // onProgress - currently unused
            (errorEvent) => { // onError
                if (!isPlaceholder) {
                    console.error(`Failed to load texture: ${url}. Error:`, errorEvent.message);
                    if (placeholderTexture) {
                        console.warn(`Using placeholder texture for ${url}.`);
                        resolve(placeholderTexture); // Fallback to placeholder
                    } else {
                        reject(`Failed to load texture ${url} and placeholder is not available.`);
                    }
                } else {
                    // Critical if the placeholder itself fails
                    console.error(`CRITICAL FAILURE: Could not load placeholder texture ${url}! Error:`, errorEvent.message);
                    reject(`Failed to load placeholder texture ${url}. Cannot continue.`);
                }
            }
        );
    });
}

async function preloadTextures() {
    try {
        // Load placeholder first, it's critical
        placeholderTexture = await loadTexture(placeholderTextureUrl, true);
        console.log("Placeholder texture loaded successfully.");

        // Function to load an array of URLs, falling back to placeholder on failure
        const loadTextureArray = async (urls) => {
            const promises = urls.map(url => loadTexture(url).catch(err => {
                console.warn(`Caught error for ${url}, using placeholder.`, err); // Log specific error
                return placeholderTexture; // Ensure fallback happens even if loadTexture promise rejects
            }));
            return Promise.all(promises); // Wait for all (including fallbacks) to resolve
        };

        // Load all texture types concurrently
        [wallTextures, floorTextures, ceilingTextures] = await Promise.all([
            loadTextureArray(wallTextureUrls),
            loadTextureArray(floorTextureUrls),
            loadTextureArray(ceilingTextureUrls)
        ]);

        // Prepend placeholder to each array for index 0 access
        wallTextures.unshift(placeholderTexture);
        floorTextures.unshift(placeholderTexture);
        ceilingTextures.unshift(placeholderTexture);

        console.log(`Textures loaded: Walls=${wallTextures.length}, Floors=${floorTextures.length}, Ceilings=${ceilingTextures.length} (incl. placeholder at index 0)`);

    } catch (error) {
        // This catch block handles the failure of the placeholder texture loading
        console.error("Catastrophic texture loading failure (likely placeholder):", error);
        throw error; // Re-throw to stop initialization in init()
    }
}

// --- Map Geometry Building (Minor optimizations) ---
function buildMapGeometry() {
    // Clear previous map geometry if rebuilding
    while (mapMeshesGroup.children.length > 0) {
        const mesh = mapMeshesGroup.children[0];
        mapMeshesGroup.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            materials.forEach(mat => {
                if (mat.map) mat.map.dispose(); // Dispose texture reference
                mat.dispose(); // Dispose material
            });
        }
    }

    // Use InstancedMesh or MergedGeometry for large maps for performance.
    // For this size, individual meshes are acceptable.

    // Create base geometries once
    const wallGeometry = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
    const floorCeilingGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    // Rotate plane to be horizontal (floor)
    floorCeilingGeometry.rotateX(-Math.PI / 2);

    // Material cache to reuse materials for the same texture
    const materialsCache = {};
    const getMaterial = (texture) => {
        if (!texture || !texture.uuid) { // Check if texture is valid
             console.warn("Invalid texture passed to getMaterial, using fallback color.");
             return new THREE.MeshStandardMaterial({ color: 0xff00ff, roughness: 0.8, metalness: 0.1 });
        }
        const cacheKey = texture.uuid;
        if (!materialsCache[cacheKey]) {
            materialsCache[cacheKey] = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.85, // Adjust for desired surface look
                metalness: 0.1,
                side: THREE.FrontSide // Render only the front face (optimization)
            });
        }
        return materialsCache[cacheKey];
    };
     const getCeilingMaterial = (texture) => {
        if (!texture || !texture.uuid) {
             console.warn("Invalid texture passed to getCeilingMaterial, using fallback color.");
             return new THREE.MeshStandardMaterial({ color: 0xff00ff, roughness: 0.8, metalness: 0.1 });
        }
        const cacheKey = texture.uuid + '_ceil'; // Separate cache key if different settings needed
        if (!materialsCache[cacheKey]) {
             materialsCache[cacheKey] = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.85,
                metalness: 0.1,
                // Render back side for ceilings as we look up at them
                // Could also use DoubleSide, but BackSide is slightly more efficient if camera never goes above ceiling
                side: THREE.BackSide
            });
        }
        return materialsCache[cacheKey];
    };


    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const worldX = x * TILE_SIZE;
            const worldZ = y * TILE_SIZE;
            const wallType = wallMap[y]?.[x]; // Use optional chaining for safety

            // Calculate center positions once
            const centerX = worldX + TILE_SIZE / 2;
            const centerZ = worldZ + TILE_SIZE / 2;

            // --- Create Walls ---
            if (wallType !== undefined && wallType > 0) {
                const wallTextureIndex = Math.min(wallType, wallTextures.length - 1); // Clamp index
                const texture = wallTextures[wallTextureIndex] || wallTextures[0]; // Fallback
                const wallMaterial = getMaterial(texture);

                const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                wallMesh.position.set(centerX, WALL_HEIGHT / 2, centerZ);
                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true;
                mapMeshesGroup.add(wallMesh);
            }
            // --- Create Floor and Ceiling for empty spaces ---
            else if (wallType === 0) {
                // Floor
                const floorTextureIndex = Math.min(floorMap[y]?.[x] ?? 0, floorTextures.length - 1);
                const floorTexture = floorTextures[floorTextureIndex] || floorTextures[0];
                const floorMaterial = getMaterial(floorTexture);
                const floorMesh = new THREE.Mesh(floorCeilingGeometry, floorMaterial); // Reuse geometry
                floorMesh.position.set(centerX, 0, centerZ); // Position at Y=0
                floorMesh.receiveShadow = true; // Floors receive shadows
                mapMeshesGroup.add(floorMesh);

                // Ceiling
                const ceilingTextureIndex = Math.min(ceilingMap[y]?.[x] ?? 0, ceilingTextures.length - 1);
                const ceilingTexture = ceilingTextures[ceilingTextureIndex] || ceilingTextures[0];
                // Use ceiling material (BackSide)
                const ceilingMaterial = getCeilingMaterial(ceilingTexture);
                // Create a distinct mesh for the ceiling, positioned at WALL_HEIGHT
                // We reuse the floor/ceiling *geometry* but need a separate *mesh* object.
                // Reusing floorCeilingGeometry is fine, just need to position it correctly.
                const ceilingMesh = new THREE.Mesh(floorCeilingGeometry, ceilingMaterial);
                ceilingMesh.position.set(centerX, WALL_HEIGHT, centerZ); // Position at Y=WALL_HEIGHT
                // Ceilings might cast shadows downwards if lights are above them,
                // but usually, they mainly receive shadows from walls/objects below lights.
                // ceilingMesh.castShadow = false;
                ceilingMesh.receiveShadow = true; // Can receive shadows from lights above
                mapMeshesGroup.add(ceilingMesh);
            }
        }
    }
    console.log("Map geometry built.");
}

// --- Player Start Position ---
function findStartPosition() {
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            if (wallMap[y]?.[x] === 0) {
                // Position the RIG, not the camera directly
                playerRig.position.x = x * TILE_SIZE + TILE_SIZE / 2;
                playerRig.position.z = y * TILE_SIZE + TILE_SIZE / 2;
                // Y position (base height) is already set in init
                console.log(`Player start position (Rig): x=${playerRig.position.x.toFixed(2)}, z=${playerRig.position.z.toFixed(2)}`);
                return;
            }
        }
    }
    // Fallback if no empty space found
    console.warn("No empty tile (0) found in wallMap. Placing player at map center.");
    playerRig.position.x = (mapWidth / 2) * TILE_SIZE;
    playerRig.position.z = (mapHeight / 2) * TILE_SIZE;
}

// --- Screen Controls (Keyboard/Mouse) ---
function setupScreenControls() {
    const canvas = renderer.domElement;
    canvas.addEventListener('click', () => {
        // Request pointer lock only if not in VR and not already locked
        if (!renderer.xr.isPresenting && !isPointerLocked) {
            canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
            if (canvas.requestPointerLock) {
                canvas.requestPointerLock();
            } else {
                console.warn("Pointer Lock API not available.");
            }
        }
    });

    const onPointerLockChange = () => {
        const lockElement = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
        isPointerLocked = !!(lockElement === canvas);
         // Ensure pointer lock is released if we enter VR
        if (renderer.xr.isPresenting) {
            isPointerLocked = false;
        }
        console.log("Pointer Locked:", isPointerLocked);
        // Maybe show/hide a crosshair based on isPointerLocked state
    };

    const onPointerLockError = (event) => {
        console.error("Pointer Lock Error:", event);
    };

    document.addEventListener('pointerlockchange', onPointerLockChange, false);
    document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);
    document.addEventListener('pointerlockerror', onPointerLockError, false);
    document.addEventListener('mozpointerlockerror', onPointerLockError, false);
    document.addEventListener('webkitpointerlockerror', onPointerLockError, false);

    document.addEventListener('mousemove', onMouseMoveScreen, false);
    document.addEventListener('keydown', onKeyDownScreen, false);
    document.addEventListener('keyup', onKeyUpScreen, false);
}

// Separate handler names to avoid confusion if VR controllers also emit mouse-like events
function onMouseMoveScreen(event) {
    // Only rotate if pointer is locked and we are NOT in VR
    if (!isPointerLocked || renderer.xr.isPresenting) return;

    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

    // Horizontal rotation (Yaw): Rotate the entire playerRig around the World's Y axis.
    playerRig.rotation.y -= movementX * lookSpeed;

    // Vertical rotation (Pitch): Rotate *only the camera* around its local X axis.
    // This prevents the whole rig from tilting, allowing looking up/down independently.
    const maxPitch = Math.PI / 2 - 0.1; // Prevent looking straight up/down
    const minPitch = -maxPitch;
    camera.rotation.x -= movementY * lookSpeed;
    camera.rotation.x = Math.max(minPitch, Math.min(maxPitch, camera.rotation.x));
}

function onKeyDownScreen(event) {
    // Ignore if in VR or key is held down
    if (event.repeat || renderer.xr.isPresenting) return;

    // Request pointer lock on movement key press if not locked/in VR
     if (!isPointerLocked && ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(event.key.toLowerCase())) {
         renderer.domElement.click(); // Simulate click to request lock
    }

    switch (event.key.toLowerCase()) {
        case 'w': case 'arrowup':    moveState.forward = 1; break;
        case 's': case 'arrowdown':  moveState.back = 1; break;
        case 'a': case 'arrowleft':  moveState.left = 1; break; // Strafe Left
        case 'd': case 'arrowright': moveState.right = 1; break;// Strafe Right
    }
}

function onKeyUpScreen(event) {
    if (renderer.xr.isPresenting) return; // Ignore if in VR
    switch (event.key.toLowerCase()) {
        case 'w': case 'arrowup':    moveState.forward = 0; break;
        case 's': case 'arrowdown':  moveState.back = 0; break;
        case 'a': case 'arrowleft':  moveState.left = 0; break;
        case 'd': case 'arrowright': moveState.right = 0; break;
    }
}

// --- Screen Controls (Gamepad) ---
function setupGamepadSupport() {
    window.addEventListener('gamepadconnected', (event) => {
        // Ignore if we're in a VR session (VR controllers handled separately)
        if (renderer.xr.isPresenting) return;
        console.log(`Gamepad connected (Screen): Index ${event.gamepad.index}, ID: ${event.gamepad.id}`);
        if (activeGamepadIndex === null) {
            activeGamepadIndex = event.gamepad.index;
            console.log(`Gamepad ${activeGamepadIndex} activated for screen control.`);
        }
    });

    window.addEventListener('gamepaddisconnected', (event) => {
        console.log(`Gamepad disconnected (Screen): Index ${event.gamepad.index}, ID: ${event.gamepad.id}`);
        if (activeGamepadIndex === event.gamepad.index) {
            console.log(`Active screen gamepad ${activeGamepadIndex} disconnected. Searching for another...`);
            activeGamepadIndex = null;
            findActiveGamepadScreen(); // Try to find another connected gamepad
        }
    });

    // Initial check for already connected gamepads
    findActiveGamepadScreen();
}

function findActiveGamepadScreen() {
    if (renderer.xr.isPresenting) { // Don't activate screen gamepads if in VR
        activeGamepadIndex = null;
        return;
    }
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    activeGamepadIndex = null; // Reset first
    for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            activeGamepadIndex = i;
            console.log(`Found active gamepad for screen control at index: ${i}`);
            return; // Use the first one found
        }
    }
     console.log("No active gamepad found for screen control.");
}

function handleGamepadInputScreen(delta) {
    // Only run if NOT in VR and an active gamepad exists
    if (renderer.xr.isPresenting || activeGamepadIndex === null) return;

    const gamepads = navigator.getGamepads();
    const gp = gamepads[activeGamepadIndex];

    if (!gp) { // Gamepad might have disconnected unexpectedly
        findActiveGamepadScreen(); // Try to find another
        return;
    }

    // --- Movement (Left Stick - Axes 0, 1) ---
    // Standard mapping: Axis 0 = X (Left/Right), Axis 1 = Y (Up/Down)
    const leftStickX = gp.axes[0] || 0;
    const leftStickY = gp.axes[1] || 0; // Note: Often negative Y is UP/FORWARD

    let gpForward = 0, gpBack = 0, gpLeft = 0, gpRight = 0;
    if (leftStickY < -gamepadDeadZone) gpForward = Math.abs(leftStickY); // Use magnitude for potential analog speed
    else if (leftStickY > gamepadDeadZone) gpBack = Math.abs(leftStickY);

    if (leftStickX < -gamepadDeadZone) gpLeft = Math.abs(leftStickX);
    else if (leftStickX > gamepadDeadZone) gpRight = Math.abs(leftStickX);

    // Update moveState (Gamepad values can overwrite 0s from keyboard release)
    // Use Math.max to combine keyboard (0 or 1) and gamepad (0 to 1)
    // If keyboard is pressed (1), it overrides gamepad analog value.
    moveState.forward = Math.max(moveState.forward, gpForward);
    moveState.back = Math.max(moveState.back, gpBack);
    moveState.left = Math.max(moveState.left, gpLeft);
    moveState.right = Math.max(moveState.right, gpRight);


    // --- Look (Right Stick - Axes 2, 3) ---
    // Standard mapping: Axis 2 = X (Left/Right), Axis 3 = Y (Up/Down)
    const rightStickX = gp.axes[2] || 0;
    const rightStickY = gp.axes[3] || 0; // Note: Often negative Y is UP

    let lookX = 0, lookY = 0;
    if (Math.abs(rightStickX) > gamepadDeadZone) lookX = rightStickX;
    if (Math.abs(rightStickY) > gamepadDeadZone) lookY = rightStickY;

    if (lookX !== 0 || lookY !== 0) {
        // Rotate using the same logic as the mouse
        // Horizontal rotation (Yaw) - Rotate playerRig
        playerRig.rotation.y -= lookX * gamepadLookSpeed * delta;

        // Vertical rotation (Pitch) - Rotate camera only
        const maxPitch = Math.PI / 2 - 0.1;
        const minPitch = -maxPitch;
        camera.rotation.x -= lookY * gamepadLookSpeed * delta;
        camera.rotation.x = Math.max(minPitch, Math.min(maxPitch, camera.rotation.x));
    }
}


// --- VR Input Handling ---
function handleVRInput() {
    // Reset VR move state each frame
    vrMoveState.forward = 0;
    vrMoveState.back = 0;
    vrMoveState.left = 0;
    vrMoveState.right = 0;

    // WebXR Input: Get controllers
    // Controller 0 is typically left, Controller 1 is typically right
    const session = renderer.xr.getSession();
    if (!session) return; // No active XR session

    // Process each input source (controller)
    session.inputSources.forEach(source => {
        if (source.gamepad && source.handedness) { // Check if it has gamepad data and handedness
            const gp = source.gamepad;
            const axes = gp.axes;

            // --- Movement (Typically Left Hand Controller) ---
            if (source.handedness === 'left') {
                // Common Mappings (CHECK YOUR CONTROLLER!):
                // - Oculus Touch: axes[2] = X, axes[3] = Y (Neg Y is Forward)
                // - Vive Wand: axes[0] = X (Touchpad), axes[1] = Y (Touchpad) (Neg Y is Forward)
                // - Index Knuckles: axes[2] = X, axes[3] = Y (Neg Y is Forward)
                const moveX = axes[2] || 0; // Use appropriate index for X
                const moveY = axes[3] || 0; // Use appropriate index for Y

                if (moveY < -vrDeadZone) vrMoveState.forward = Math.abs(moveY);
                else if (moveY > vrDeadZone) vrMoveState.back = Math.abs(moveY);

                if (moveX < -vrDeadZone) vrMoveState.left = Math.abs(moveX);
                else if (moveX > vrDeadZone) vrMoveState.right = Math.abs(moveX);
            }

            // --- Turning (Typically Right Hand Controller) ---
            if (source.handedness === 'right') {
                // Example: Snap turning with right stick X-axis
                // axes[2] for Oculus/Index, axes[0] for Vive
                const turnX = axes[2] || 0;

                // TODO: Implement Snap/Smooth Turning Logic
                // Example (Needs state tracking to turn only once per flick):
                // if (Math.abs(turnX) > 0.5) { // Threshold for flick
                //    const angle = Math.PI / 4; // 45 degrees
                //    playerRig.rotation.y -= Math.sign(turnX) * angle;
                //    // Add debounce/cooldown logic here
                // }

                // --- Other Actions (Buttons) ---
                // Example: Check trigger button (button index 0 is usually trigger)
                // if (gp.buttons[0] && gp.buttons[0].pressed) {
                //     console.log(`${source.handedness} Trigger pressed`);
                // }
                // Example: Check grip button (button index 1 is usually grip)
                // if (gp.buttons[1] && gp.buttons[1].pressed) {
                //     console.log(`${source.handedness} Grip pressed`);
                // }
            }
        }
    });
}


// --- Movement & Collision (Unified Logic) ---
const tempWorldDirection = new THREE.Vector3();
const tempRightDirection = new THREE.Vector3();
const finalVelocity = new THREE.Vector3();
const collisionCheckOffset = 0.2; // Small offset to check slightly ahead/into the wall

function updateMovement(delta) {
    const inVR = renderer.xr.isPresenting;
    const currentMoveState = inVR ? vrMoveState : moveState;
    const speed = inVR ? moveSpeed * vrMoveSpeedFactor : moveSpeed;
    const moveDistance = speed * delta;

    // --- Determine Movement Direction ---
    // In VR: Movement is relative to where the *head* (camera) is looking.
    // On Screen: Movement is relative to where the *player rig* (body) is facing (controlled by mouse/gamepad yaw).
    const referenceObject = inVR ? camera : playerRig;

    // Get the forward direction in the XZ plane
    referenceObject.getWorldDirection(tempWorldDirection);
    tempWorldDirection.y = 0; // Project onto the horizontal plane
    tempWorldDirection.normalize();

    // Get the right direction (perpendicular to forward, on XZ plane)
    // Cross forward vector with world UP vector (0, 1, 0)
    tempRightDirection.crossVectors(referenceObject.up, tempWorldDirection).normalize();
    // Note: THREE.Object3D.up is usually (0,1,0) unless modified.

    // --- Calculate Velocity based on Input ---
    finalVelocity.set(0, 0, 0); // Reset velocity vector

    // Combine forward/backward movement
    const moveZ = (currentMoveState.forward ? currentMoveState.forward : 0) - (currentMoveState.back ? currentMoveState.back : 0);
    // Combine left/right strafing movement
    const moveX = (currentMoveState.right ? currentMoveState.right : 0) - (currentMoveState.left ? currentMoveState.left : 0);

    // Add velocity components relative to the reference direction
    finalVelocity.addScaledVector(tempWorldDirection, moveZ);
    finalVelocity.addScaledVector(tempRightDirection, moveX); // Use right direction for X input

    // Normalize if diagonal movement, then scale by distance
    if (finalVelocity.lengthSq() > 0) {
        finalVelocity.normalize().multiplyScalar(moveDistance);
    } else {
        return; // No input, no movement
    }

    // --- Simple Collision Detection ---
    const currentPos = playerRig.position;
    let intendedPos = currentPos.clone().add(finalVelocity); // Where we want to go

    // Check collision on X axis
    const checkPosX = currentPos.x + finalVelocity.x;
    const gridZ = Math.floor(currentPos.z / TILE_SIZE);
    const gridX_CheckX = Math.floor((checkPosX + Math.sign(finalVelocity.x) * collisionCheckOffset) / TILE_SIZE); // Check slightly ahead
    if (finalVelocity.x !== 0 && isWallAt(gridX_CheckX, gridZ)) {
         // Collision on X: Adjust intended position to stop at wall boundary
        intendedPos.x = (gridX_CheckX - Math.sign(finalVelocity.x) * 0.5 + 0.5 * Math.sign(finalVelocity.x)) * TILE_SIZE - Math.sign(finalVelocity.x) * collisionCheckOffset;
        finalVelocity.x = 0; // Stop movement in X
    }

    // Check collision on Z axis (using potentially modified intendedPos.x)
    const checkPosZ = currentPos.z + finalVelocity.z;
    const gridX = Math.floor(intendedPos.x / TILE_SIZE); // Use potentially adjusted X for Z check
    const gridZ_CheckZ = Math.floor((checkPosZ + Math.sign(finalVelocity.z) * collisionCheckOffset) / TILE_SIZE); // Check slightly ahead
    if (finalVelocity.z !== 0 && isWallAt(gridX, gridZ_CheckZ)) {
        // Collision on Z: Adjust intended position
        intendedPos.z = (gridZ_CheckZ - Math.sign(finalVelocity.z) * 0.5 + 0.5 * Math.sign(finalVelocity.z)) * TILE_SIZE - Math.sign(finalVelocity.z) * collisionCheckOffset;
        finalVelocity.z = 0; // Stop movement in Z
    }

     // Diagonal corner case check (if both X and Z were non-zero initially but now are zero)
     // A better approach involves checking the diagonal cell directly if both axes had input,
     // but this simple wall boundary adjustment often suffices.

    // --- Apply Final Position ---
    // Apply the calculated final velocity (potentially zeroed by collisions)
    playerRig.position.add(finalVelocity);

    // Clamp Y position just in case (shouldn't change with current logic)
    playerRig.position.y = WALL_HEIGHT / 2;
}

function isWallAt(gridX, gridZ) {
    // Check boundaries first
    if (gridX < 0 || gridX >= mapWidth || gridZ < 0 || gridZ >= mapHeight) {
        return true; // Treat out-of-bounds as a wall
    }
    // Check the wall map data
    return wallMap[gridZ]?.[gridX] > 0; // Check if the tile index is > 0 (meaning a wall)
}


// --- Main Render Loop ---
function renderLoop(timestamp, frame) { // 'frame' is provided by WebXR session
    const delta = clock.getDelta();

    // --- Input Handling ---
    if (renderer.xr.isPresenting) {
        // VR Mode: Handle controller input
        handleVRInput();
        // NOTE: No explicit turning here yet, relies on physical turning or
        // needs snap/smooth turn implementation in handleVRInput.
    } else {
        // Screen Mode: Handle keyboard (already done via events) and gamepad
        // Reset moveState axes potentially set by gamepad last frame,
        // Keyboard events will set them back if keys are held.
        const keyF = moveState.forward; const keyB = moveState.back;
        const keyL = moveState.left;   const keyR = moveState.right;
        moveState.forward = 0; moveState.back = 0; moveState.left = 0; moveState.right = 0;

        handleGamepadInputScreen(delta); // Read gamepad, potentially updates moveState

        // Ensure keyboard state overrides gamepad if key is pressed
        moveState.forward = Math.max(moveState.forward, keyF);
        moveState.back = Math.max(moveState.back, keyB);
        moveState.left = Math.max(moveState.left, keyL);
        moveState.right = Math.max(moveState.right, keyR);

        // Mouse look is handled by event listeners directly updating rig/camera rotation
    }

    // --- Update Movement & Collision ---
    // This function now uses the appropriate state (vrMoveState or moveState)
    // and reference object (camera or playerRig) based on renderer.xr.isPresenting
    updateMovement(delta);

    // --- Render Scene ---
    // renderer.render() is automatically called for both eyes by setAnimationLoop when in VR
    renderer.render(scene, camera);
}

// --- Window Resizing ---
function onWindowResize() {
    // Only resize if NOT in VR, as the headset dictates resolution/aspect ratio
    if (!renderer.xr.isPresenting) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        // Note: setPixelRatio is usually only needed once at init,
        // but resetting it here doesn't hurt.
        // renderer.setPixelRatio(window.devicePixelRatio);
    }
}

// --- Start Everything ---
// Ensure the DOM is ready before initializing Three.js and accessing the canvas
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init(); // DOMContentLoaded has already fired
}