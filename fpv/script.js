import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// --- Configuración Inicial ---
const TILE_SIZE = 5;      // Tamaño de cada cuadrado en el mundo 3D
const WALL_HEIGHT = 5;    // Altura de las paredes
const moveSpeed = 8.0;    // Velocidad de movimiento del jugador (teclado)
const lookSpeed = 0.003;  // Sensibilidad del ratón
const gamepadLookSpeed = 1.5; // Sensibilidad de la vista con gamepad (ajusta según sea necesario)
const gamepadDeadZone = 0.15; // Zona muerta para los sticks del gamepad
const PLAYER_RADIUS = TILE_SIZE * 0.2; // Radio de colisión del jugador
const PLAYER_COLLISION_HEIGHT_FACTOR = 0.9; // Factor para la altura de colisión del jugador (0.9 = 90% de WALL_HEIGHT)

// --- Touch Control Config ---
const TOUCH_LOOK_SENSITIVITY = 0.004; // Sensibilidad para la vista táctil (swipe original)
const TOUCH_DPAD_DEADZONE_RATIO = 0.15; // 15% del radio del D-Pad como zona muerta
// NUEVAS CONSTANTES PARA EL JOYSTICK DE VISTA
const TOUCH_JOYSTICK_LOOK_SENSITIVITY = 1.8; // Sensibilidad para el joystick de vista (ajusta según sea necesario)
const TOUCH_LOOK_DEADZONE_RATIO = 0.1;   // 10% del radio del control de vista como zona muerta


// --- Datos del Mapa (¡Aquí defines tus mapas!) ---
// 0 = Espacio vacío
// wallMap: 1+ = Índice de textura en wallTextures (1 usa wallTextures[1] que es wallTextureUrls[0])
// wallMap: -1, -2, ... = Índice de modelo en modelUrls (-1 usa loadedModels[0] que es modelUrls[0])
const wallMap = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, -7, 0, -8, 0, 0, 0, 0, -6, 1],
  [1, 0, 0, 0, 0, -1, 2, 0, 0, 1], // -1 para el primer modelo
  [1, 0, 3, -10, 0, 0, 2, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0,-2, 0, 1],  // -2 para el segundo modelo
  [1, 0, 0, 0, -5, 0, 1, 1, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, -3, 0, -4, 0, 1],
  [1, 0, 0, 0, -9, 0, 0, 0, 0, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
];
const floorMap = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 4, 4, 4, 4, 4, 1, 1, 1, 0],
  [0, 4, 4, 4, 4, 4, 0, 1, 1, 0],
  [0, 4, 0, 4, 4, 4, 0, 1, 1, 0],
  [0, 1, 1, 5, 5, 5, 1, 1, 1, 0],
  [0, 1, 1, 5, 5, 5, 0, 0, 1, 0],
  [0, 1, 0, 5, 5, 3, 3, 3, 3, 0],
  [0, 1, 0, 1, 2, 3, 3, 3, 3, 0],
  [0, 1, 1, 1, 1, 3, 3, 3, 3, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];
const ceilingMap = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 1 usará ceilingTextures[1]
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 0 usará placeholder (ceilingTextures[0])
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 1, 0, 1],
  [1, 0, 1, 2, 2, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// --- Rutas de Texturas ---
const wallTextureUrls = ['textures/wall1.png', 'textures/wall2.png', 'textures/wall3.png'];
const floorTextureUrls = ['textures/floor1.png', 'textures/floor2.png', 'textures/floor3.png', 'textures/floor4.png', 'textures/floor5.png'];
const ceilingTextureUrls = ['textures/ceiling1.png', 'textures/ceiling2.png'];
const placeholderTextureUrl = 'textures/placeholder.png';

// --- Rutas de Modelos GLB ---
const modelUrls = ['models/barrel3.glb','models/barrel2.glb','models/barrel.glb', 'models/statue.glb', 'models/cruz.glb', 'models/geomag.glb', 'models/geomag1.glb', 'models/geomag12.glb', 'models/a.glb', 'models/b.glb']; // Rutas a tus modelos GLB
const placeholderModelUrl = 'models/placeholder_cube.glb'; // Un GLB simple como fallback

// --- Variables Globales ---
let scene, camera, renderer;
let clock = new THREE.Clock();
let textureLoader = new THREE.TextureLoader();

// Loaders para GLB
let gltfLoader = new GLTFLoader();
let dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/gltf/');
gltfLoader.setDRACOLoader(dracoLoader);


let wallTextures = [];      // [placeholder, tex1, tex2, ...]
let floorTextures = [];     // [placeholder, tex1, tex2, ...]
let ceilingTextures = [];   // [placeholder, tex1, tex2, ...]
let placeholderTexture = null;

let loadedModels = [];      // [modelGltf1, modelGltf2, ...] (corresponde a modelUrls)
let placeholderModel = null; // GLTF del modelo placeholder

let modelCollisionCapsules = []; // Array para almacenar datos de colisión de modelos

let mapMeshesGroup = new THREE.Group();
let mapWidth = wallMap[0].length;
let mapHeight = wallMap.length;

const moveState = { forward: 0, back: 0, left: 0, right: 0 };
let isPointerLocked = false;
let activeGamepadIndex = null;
let stats; // Para stats.js

let isMobileDevice = false; // Flag for mobile device
let touchControls = { // Object to store touch control state
    dPadContainer: null,
    left: {
        element: null,
        rect: null,
        touchId: null,
        center: { x: 0, y: 0 },
        radius: 0,
        deadZone: 0
    },
    right: {
        element: null,
        rect: null,
        touchId: null,
        center: { x: 0, y: 0 },
        radius: 0,
        // startPos: { x: 0, y: 0 }, // No se usará para el joystick de vista, pero se puede dejar si se alterna
        isActive: false,       // Para saber si el joystick de vista está activo
        currentRelX: 0,        // Posición X relativa del dedo (-1 a 1)
        currentRelY: 0,        // Posición Y relativa del dedo (-1 a 1)
        deadZone: 0            // Zona muerta para el joystick de vista
    }
};


// --- Detección de Móvil ---
function detectMobile() {
    const toMatch = [
        /Android/i, /webOS/i, /iPhone/i, /iPad/i, /iPod/i,
        /BlackBerry/i, /Windows Phone/i
    ];
    return toMatch.some(toMatchItem => navigator.userAgent.match(toMatchItem));
}

// --- Inicialización ---
function init() {
    isMobileDevice = detectMobile();
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xADD8E6); // Light blue background

    if (typeof Stats !== 'undefined') {
        stats = new Stats();
        stats.showPanel(0);
        document.body.appendChild(stats.dom);
    } else {
        console.warn("Stats.js no está cargado. El contador FPS no funcionará.");
    }

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = WALL_HEIGHT / 2;
    camera.rotation.order = 'YXZ';

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;


    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(15, 30, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);
    const playerLight = new THREE.PointLight(0xffccaa, 0.8, TILE_SIZE * 7);
    camera.add(playerLight);
    scene.add(camera);

    // Controles
    setupControls(); // Combined setup function

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

    preloadAssets().then(() => {
        findStartPosition();
        buildMapGeometry();
        scene.add(mapMeshesGroup);
        animate();
    }).catch(error => {
        console.error("Error crítico al cargar assets:", error);
        document.body.innerHTML = `<div style="color: red; font-size: 20px; padding: 20px;">Error al cargar assets. Revisa la consola (F12).</div>`;
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

// --- Carga de Assets (Texturas y Modelos) ---
async function loadTexture(url, isPlaceholder = false) {
    return new Promise((resolve, reject) => {
        textureLoader.load(
            url,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestMipmapLinearFilter;
                if (!isPlaceholder) console.log(`Textura cargada: ${url}`);
                resolve(texture);
            },
            undefined,
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

async function loadModel(url, isPlaceholder = false) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(
            url,
            (gltf) => {
                if (!isPlaceholder) console.log(`Modelo GLB cargado: ${url}`);
                resolve(gltf);
            },
            undefined,
            (error) => {
                if (!isPlaceholder) {
                    console.error(`Error cargando modelo GLB: ${url}`, error);
                    if (placeholderModel) {
                        console.warn(`Usando modelo placeholder para ${url}`);
                        resolve(placeholderModel);
                    } else {
                        reject(`No se pudo cargar ${url} y el modelo placeholder no está disponible.`);
                    }
                } else {
                    console.error(`¡¡ERROR CRÍTICO: No se pudo cargar el modelo placeholder ${url}!!`, error);
                    reject(`No se pudo cargar el modelo placeholder ${url}`);
                }
            }
        );
    });
}

async function preloadAssets() {
    try {
        placeholderTexture = await loadTexture(placeholderTextureUrl, true);
        console.log("Textura placeholder cargada.");
        placeholderModel = await loadModel(placeholderModelUrl, true);
        console.log("Modelo placeholder cargado.");

        const loadTextureArray = async (urls) => Promise.all(urls.map(url => loadTexture(url)));
        const loadModelArray = async (urls) => Promise.all(urls.map(url => loadModel(url)));

        const results = await Promise.all([
            loadTextureArray(wallTextureUrls),
            loadTextureArray(floorTextureUrls),
            loadTextureArray(ceilingTextureUrls),
            loadModelArray(modelUrls)
        ]);

        wallTextures = [placeholderTexture, ...results[0]];
        floorTextures = [placeholderTexture, ...results[1]];
        ceilingTextures = [placeholderTexture, ...results[2]];
        loadedModels = results[3];

        console.log("Texturas y Modelos de mapa procesados.");
    } catch (error) {
        console.error("Fallo catastrófico durante la carga de assets:", error);
        throw error;
    }
}

// --- Construcción de la Geometría del Mapa ---
function buildMapGeometry() {
    modelCollisionCapsules.length = 0;

    while (mapMeshesGroup.children.length > 0) {
        const object = mapMeshesGroup.children[0];
        mapMeshesGroup.remove(object);
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach(mat => {
                Object.keys(mat).forEach(key => {
                    if (mat[key] && typeof mat[key].dispose === 'function' && mat[key] !== mat) {
                        if (mat[key].isTexture) mat[key].dispose();
                    }
                });
                mat.dispose();
            });
        }
         if (object.traverse) {
            object.traverse(child => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                         const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
                         childMaterials.forEach(mat => {
                            Object.keys(mat).forEach(key => {
                                if (mat[key] && typeof mat[key].dispose === 'function' && mat[key] !== mat) {
                                    if (mat[key].isTexture) mat[key].dispose();
                                }
                            });
                            mat.dispose();
                         });
                    }
                }
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
        if (!texture || !texture.uuid) return new THREE.MeshStandardMaterial({ color: 0xff00ff });
        const cacheKey = texture.uuid;
        if (!materialsCache[cacheKey]) {
            materialsCache[cacheKey] = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.7,
                metalness: 0.05,
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

            } else if (wallType !== undefined && wallType < 0) {
                const modelIndex = Math.abs(wallType) - 1;
                let modelGltf = loadedModels[modelIndex];

                if (!modelGltf && placeholderModel) {
                    console.warn(`Modelo GLTF ${modelIndex} no encontrado, usando placeholder.`);
                    modelGltf = placeholderModel;
                }

                if (modelGltf && modelGltf.scene) {
                    const modelInstance = SkeletonUtils.clone(modelGltf.scene);
                    modelInstance.position.set(worldX + TILE_SIZE / 2, 0, worldZ + TILE_SIZE / 2);
                    
                    modelInstance.updateMatrixWorld(true);
                    const box = new THREE.Box3().setFromObject(modelInstance);
                    const size = box.getSize(new THREE.Vector3());
                    const currentMaxDim = Math.max(size.x, size.y, size.z);
                    if (currentMaxDim > 0) {
                        const desiredMaxDim = TILE_SIZE * 0.6;
                        const scale = desiredMaxDim / currentMaxDim;
                        modelInstance.scale.set(scale, scale, scale);
                        
                        modelInstance.updateMatrixWorld(true);
                        const scaledBox = new THREE.Box3().setFromObject(modelInstance);
                        modelInstance.position.y = -scaledBox.min.y; 
                    }

                    modelInstance.updateMatrixWorld(true);
                    const finalBox = new THREE.Box3().setFromObject(modelInstance);
                    const finalSize = finalBox.getSize(new THREE.Vector3());

                    const capsuleRadius = Math.max(finalSize.x, finalSize.z) / 2 * 0.85;
                    const capsuleHeight = finalSize.y;
                    
                    modelCollisionCapsules.push({
                        worldPosition: modelInstance.position.clone(),
                        radius: capsuleRadius,
                        height: capsuleHeight,
                    });

                    modelInstance.traverse(child => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    mapMeshesGroup.add(modelInstance);
                } else {
                    console.error(`Fallo: No hay modelo GLTF para el índice ${modelIndex} (${x},${y}) ni placeholder.`);
                }
                renderFloorAndCeiling(x, y, worldX, worldZ, getMaterial, floorCeilingGeometry, ceilingGeometry);

            } else if (wallType === 0) {
                renderFloorAndCeiling(x, y, worldX, worldZ, getMaterial, floorCeilingGeometry, ceilingGeometry);
            }
        }
    }
    console.log("Geometría del mapa construida. Cápsulas de colisión de modelos:", modelCollisionCapsules.length);
}

function renderFloorAndCeiling(mapGridX, mapGridY, worldX, worldZ, getMaterialFunc, floorGeom, ceilingGeom) {
    const floorTextureIndex = floorMap[mapGridY]?.[mapGridX] ?? 0;
    const ceilingTextureIndex = ceilingMap[mapGridY]?.[mapGridX] ?? 0;

    const floorTexture = floorTextures[floorTextureIndex] || floorTextures[0];
    const ceilingTexture = ceilingTextures[ceilingTextureIndex] || ceilingTextures[0];

    if (floorTexture) {
        const floorMaterial = getMaterialFunc(floorTexture);
        const floorMesh = new THREE.Mesh(floorGeom, floorMaterial);
        floorMesh.position.set(worldX + TILE_SIZE / 2, 0, worldZ + TILE_SIZE / 2);
        floorMesh.receiveShadow = true;
        mapMeshesGroup.add(floorMesh);
    }

    if (ceilingTexture) {
        const ceilingMaterial = getMaterialFunc(ceilingTexture);
        const ceilingMesh = new THREE.Mesh(ceilingGeom, ceilingMaterial);
        ceilingMesh.position.set(worldX + TILE_SIZE / 2, WALL_HEIGHT, worldZ + TILE_SIZE / 2);
        mapMeshesGroup.add(ceilingMesh);
    }
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

// --- Controles ---
function setupControls() {
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    if (isMobileDevice) {
        console.log("Mobile device detected, setting up touch controls.");
        setupTouchControls();
    } else {
        console.log("Desktop device detected, setting up pointer lock.");
        setupPointerLock();
    }
}

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
    };

    document.addEventListener('pointerlockchange', pointerLockChange, false);
    document.addEventListener('mozpointerlockchange', pointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
    document.addEventListener('mousemove', onMouseMove, false);
}

function rotateCamera(deltaX, deltaY) {
    camera.rotation.y -= deltaX;
    const maxPitch = Math.PI / 2 - 0.05;
    const minPitch = -Math.PI / 2 + 0.05;
    camera.rotation.x -= deltaY;
    camera.rotation.x = Math.max(minPitch, Math.min(maxPitch, camera.rotation.x));
    camera.rotation.z = 0;
}

function onMouseMove(event) {
    if (!isPointerLocked) return;
    const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
    const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
    rotateCamera(movementX * lookSpeed, movementY * lookSpeed);
}

function onKeyDown(event) {
    if (event.repeat) return;
    // On desktop, try to lock pointer if not locked and movement key is pressed
    if (!isMobileDevice && !isPointerLocked && 
        ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(event.key.toLowerCase())) {
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

    const leftStickX = gp.axes[0] || 0;
    const leftStickY = gp.axes[1] || 0;
    const rightStickX = gp.axes[2] || 0;
    const rightStickY = gp.axes[3] || 0;

    // --- INICIO DE LA RESTAURACIÓN A LA LÓGICA ORIGINAL DEL USUARIO ---
    let gpForward = 0, gpBack = 0, gpLeft = 0, gpRight = 0; // Se restauran gpLeft y gpRight

    if (leftStickY < -gamepadDeadZone) gpForward = 1;
    else if (leftStickY > gamepadDeadZone) gpBack = 1;

    // Lógica original del usuario para el eje X del stick izquierdo:
    // Stick físico DERECHA -> activa gpLeft
    // Stick físico IZQUIERDA -> activa gpRight
    if (leftStickX > gamepadDeadZone) gpLeft = 1;
    else if (leftStickX < -gamepadDeadZone) gpRight = 1;

    moveState.forward = Math.max(moveState.forward, gpForward);
    moveState.back = Math.max(moveState.back, gpBack);
    // Aplicación original:
    // gpLeft (stick físico DERECHA) se asigna a moveState.left
    // gpRight (stick físico IZQUIERDA) se asigna a moveState.right
    moveState.left = Math.max(moveState.left, gpLeft);
    moveState.right = Math.max(moveState.right, gpRight);
    // --- FIN DE LA RESTAURACIÓN A LA LÓGICA ORIGINAL DEL USUARIO ---

    let lookX = 0, lookY = 0;
    if (Math.abs(rightStickX) > gamepadDeadZone) lookX = rightStickX;
    if (Math.abs(rightStickY) > gamepadDeadZone) lookY = rightStickY;

    if (lookX !== 0 || lookY !== 0) {
        const deltaLookX = lookX * gamepadLookSpeed * delta;
        const deltaLookY = lookY * gamepadLookSpeed * delta;
        rotateCamera(deltaLookX, deltaLookY);
    }
}

// --- Touch Controls Setup ---
function setupTouchControls() {
    touchControls.dPadContainer = document.getElementById('dPadContainer');
    touchControls.left.element = document.getElementById('leftDPad');
    touchControls.right.element = document.getElementById('rightDPad');

    if (!touchControls.left.element || !touchControls.right.element || !touchControls.dPadContainer) {
        console.error("D-Pad elements not found in HTML!");
        return;
    }
    touchControls.dPadContainer.style.display = 'block'; // Show the D-pads

    setTimeout(() => {
        const leftRect = touchControls.left.element.getBoundingClientRect();
        touchControls.left.rect = leftRect;
        touchControls.left.center.x = leftRect.left + leftRect.width / 2;
        touchControls.left.center.y = leftRect.top + leftRect.height / 2;
        touchControls.left.radius = leftRect.width / 2;
        touchControls.left.deadZone = touchControls.left.radius * TOUCH_DPAD_DEADZONE_RATIO;

        const rightRect = touchControls.right.element.getBoundingClientRect();
        touchControls.right.rect = rightRect;
        touchControls.right.center.x = rightRect.left + rightRect.width / 2;
        touchControls.right.center.y = rightRect.top + rightRect.height / 2;
        touchControls.right.radius = rightRect.width / 2; 
        touchControls.right.deadZone = touchControls.right.radius * TOUCH_LOOK_DEADZONE_RATIO; 

        touchControls.right.isActive = false;
        touchControls.right.currentRelX = 0;
        touchControls.right.currentRelY = 0;

    }, 100);

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
}

function isTouchOnElement(touch, elementControl) {
    if (!elementControl.rect) return false;
    return (
        touch.clientX >= elementControl.rect.left &&
        touch.clientX <= elementControl.rect.right &&
        touch.clientY >= elementControl.rect.top &&
        touch.clientY <= elementControl.rect.bottom
    );
}

function updateRightJoystickState(touch) {
    if (!touchControls.right.rect || touchControls.right.radius === 0) return;

    let relX = (touch.clientX - touchControls.right.center.x);
    let relY = (touch.clientY - touchControls.right.center.y);

    touchControls.right.currentRelX = relX / touchControls.right.radius;
    touchControls.right.currentRelY = relY / touchControls.right.radius;

    const magnitude = Math.sqrt(touchControls.right.currentRelX * touchControls.right.currentRelX + touchControls.right.currentRelY * touchControls.right.currentRelY);
    if (magnitude > 1) {
        touchControls.right.currentRelX /= magnitude;
        touchControls.right.currentRelY /= magnitude;
    }
}

function handleTouchStart(event) {
    if (!isMobileDevice) return;
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];

        if (touchControls.left.touchId === null && isTouchOnElement(touch, touchControls.left)) {
            event.preventDefault(); 
            touchControls.left.touchId = touch.identifier;
            updateLeftDPadState(touch);
        } else if (touchControls.right.touchId === null && isTouchOnElement(touch, touchControls.right)) {
            event.preventDefault();
            touchControls.right.touchId = touch.identifier;
            touchControls.right.isActive = true; 
            updateRightJoystickState(touch); 
            // Si usabas startPos para swipe, ya no es necesario para el joystick:
            // touchControls.right.startPos.x = touch.clientX;
            // touchControls.right.startPos.y = touch.clientY;
        }
    }
}

function handleTouchMove(event) {
    if (!isMobileDevice) return;
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];

        if (touch.identifier === touchControls.left.touchId) {
            event.preventDefault();
            updateLeftDPadState(touch);
        } else if (touch.identifier === touchControls.right.touchId) {
            event.preventDefault();
            if (touchControls.right.isActive) {
                updateRightJoystickState(touch); 
            }
            // La rotación se maneja en handleTouchLook, no directamente aquí
            // const deltaX = touch.clientX - touchControls.right.startPos.x;
            // const deltaY = touch.clientY - touchControls.right.startPos.y;
            // rotateCamera(deltaX * TOUCH_LOOK_SENSITIVITY, deltaY * TOUCH_LOOK_SENSITIVITY);
            // touchControls.right.startPos.x = touch.clientX;
            // touchControls.right.startPos.y = touch.clientY;
        }
    }
}

function handleTouchEnd(event) {
    if (!isMobileDevice) return;
    for (let i = 0; i < event.changedTouches.length; i++) {
        const touch = event.changedTouches[i];

        if (touch.identifier === touchControls.left.touchId) {
            event.preventDefault();
            touchControls.left.touchId = null;
            moveState.forward = 0;
            moveState.back = 0;
            moveState.left = 0;
            moveState.right = 0;
        } else if (touch.identifier === touchControls.right.touchId) {
            event.preventDefault();
            touchControls.right.touchId = null;
            touchControls.right.isActive = false; 
            touchControls.right.currentRelX = 0;  
            touchControls.right.currentRelY = 0;
        }
    }
}

function updateLeftDPadState(touch) {
    if (!touchControls.left.rect) return;

    const dx = touch.clientX - touchControls.left.center.x;
    const dy = touch.clientY - touchControls.left.center.y;
    const distSq = dx * dx + dy * dy;

    moveState.forward = 0;
    moveState.back = 0;
    moveState.left = 0;
    moveState.right = 0;

    if (distSq < touchControls.left.deadZone * touchControls.left.deadZone) {
        return; 
    }

    const angle = Math.atan2(dy, dx);

    if (angle > -Math.PI / 4 && angle <= Math.PI / 4) {
        moveState.left = 1; 
    } else if (angle > Math.PI / 4 && angle <= 3 * Math.PI / 4) {
        moveState.back = 1;
    } else if (angle > 3 * Math.PI / 4 || angle <= -3 * Math.PI / 4) {
        moveState.right = 1; 
    } else if (angle > -3 * Math.PI / 4 && angle <= -Math.PI / 4) {
        moveState.forward = 1;
    }
}

function handleTouchLook(delta) {
    if (!isMobileDevice || !touchControls.right.isActive) {
        return;
    }

    let lookX = touchControls.right.currentRelX;
    let lookY = touchControls.right.currentRelY;

    const magnitudeSq = lookX * lookX + lookY * lookY;
    // La deadzone del control derecho (touchControls.right.deadZone) es un valor de radio (e.g., 0.1 * radio_del_control)
    // currentRelX/Y están normalizados por el radio, así que su magnitud combinada
    // debe compararse con (TOUCH_LOOK_DEADZONE_RATIO)^2 (ya que magnitudeSq es cuadrado)
    // O, alternativamente, comparamos la magnitud con TOUCH_LOOK_DEADZONE_RATIO si calculamos Math.sqrt(magnitudeSq)
    // Aquí usaremos la comparación de cuadrados para evitar un sqrt innecesario
    if (magnitudeSq < TOUCH_LOOK_DEADZONE_RATIO * TOUCH_LOOK_DEADZONE_RATIO) {
        lookX = 0;
        lookY = 0;
    }

    if (lookX !== 0 || lookY !== 0) {
        const deltaLookX = lookX * TOUCH_JOYSTICK_LOOK_SENSITIVITY * delta;
        const deltaLookY = lookY * TOUCH_JOYSTICK_LOOK_SENSITIVITY * delta;
        rotateCamera(deltaLookX, deltaLookY);
    }
}


function updateMovement(delta) {
    const keyboardState = { ...moveState }; 
    handleGamepadInput(delta); 

    const moveDistance = moveSpeed * delta;
    const velocity = new THREE.Vector3();
    const worldDirection = new THREE.Vector3();

    camera.getWorldDirection(worldDirection);
    worldDirection.y = 0;
    worldDirection.normalize();

    const rightDirection = new THREE.Vector3().crossVectors(camera.up, worldDirection).normalize();

    let moveZ = (moveState.forward ? 1 : 0) - (moveState.back ? 1 : 0);
    let moveX = (moveState.right ? 1 : 0) - (moveState.left ? 1 : 0); 

    velocity.add(worldDirection.multiplyScalar(moveZ));
    velocity.add(rightDirection.multiplyScalar(moveX));

    moveState.forward = keyboardState.forward;
    moveState.back = keyboardState.back;
    moveState.left = keyboardState.left;
    moveState.right = keyboardState.right;
    
    if (velocity.lengthSq() > 0) {
        velocity.normalize().multiplyScalar(moveDistance);
    } else {
        return; 
    }

    const currentPos = camera.position;
    let finalVelocity = velocity.clone();

    const nextPlayerPosX_wall = currentPos.x + finalVelocity.x;
    const gridXToCheck_wall = Math.floor((nextPlayerPosX_wall + PLAYER_RADIUS * Math.sign(finalVelocity.x)) / TILE_SIZE);
    const currentGridZ_wall = Math.floor(currentPos.z / TILE_SIZE);
    if (isActualWallAt(gridXToCheck_wall, currentGridZ_wall)) {
        finalVelocity.x = 0;
    }

    const nextPlayerPosZ_wall = currentPos.z + finalVelocity.z;
    const gridZToCheck_wall = Math.floor((nextPlayerPosZ_wall + PLAYER_RADIUS * Math.sign(finalVelocity.z)) / TILE_SIZE);
    const currentGridX_wall = Math.floor(currentPos.x / TILE_SIZE);
    if (isActualWallAt(currentGridX_wall, gridZToCheck_wall)) {
        finalVelocity.z = 0;
    }
    
    if (velocity.x !== 0 && finalVelocity.x === 0 && velocity.z !== 0 && finalVelocity.z === 0) {
        const cornerGridX = Math.floor((currentPos.x + velocity.x + PLAYER_RADIUS * Math.sign(velocity.x)) / TILE_SIZE);
        const cornerGridZ = Math.floor((currentPos.z + velocity.z + PLAYER_RADIUS * Math.sign(velocity.z)) / TILE_SIZE);
        if (isActualWallAt(cornerGridX, cornerGridZ)) {
            // Blocked
        }
    }
    
    let allowedVelocityForModels = finalVelocity.clone(); 

    for (const capsule of modelCollisionCapsules) {
        if (allowedVelocityForModels.x !== 0) {
            const testVelX = new THREE.Vector3(allowedVelocityForModels.x, 0, 0);
            if (checkCapsuleCollision(currentPos, testVelX, capsule)) {
                allowedVelocityForModels.x = 0;
            }
        }
        if (allowedVelocityForModels.z !== 0) {
            const testVelZ = new THREE.Vector3(0, 0, allowedVelocityForModels.z);
            if (checkCapsuleCollision(currentPos, testVelZ, capsule)) {
                allowedVelocityForModels.z = 0;
            }
        }
    }
    finalVelocity.copy(allowedVelocityForModels);

    camera.position.add(finalVelocity);
    camera.position.y = WALL_HEIGHT / 2;
}

function checkCapsuleCollision(playerCurrentPos, playerMoveVec, capsule) {
    const nextPlayerPosX = playerCurrentPos.x + playerMoveVec.x;
    const nextPlayerPosZ = playerCurrentPos.z + playerMoveVec.z;

    const dx = nextPlayerPosX - capsule.worldPosition.x;
    const dz = nextPlayerPosZ - capsule.worldPosition.z;
    const distanceSqXZ = dx * dx + dz * dz;
    const minSeparationDist = PLAYER_RADIUS + capsule.radius;

    if (distanceSqXZ < minSeparationDist * minSeparationDist) {
        const playerHeight = WALL_HEIGHT * PLAYER_COLLISION_HEIGHT_FACTOR;
        const playerMinY = playerCurrentPos.y - playerHeight / 2;
        const playerMaxY = playerCurrentPos.y + playerHeight / 2;

        const capsuleMinY = capsule.worldPosition.y;
        const capsuleMaxY = capsule.worldPosition.y + capsule.height;

        if (playerMaxY > capsuleMinY && playerMinY < capsuleMaxY) {
            return true;
        }
    }
    return false;
}

function isActualWallAt(gridX, gridZ) {
    if (gridX < 0 || gridX >= mapWidth || gridZ < 0 || gridZ >= mapHeight) {
        return true;
    }
    const cellType = wallMap[gridZ]?.[gridX];
    return cellType !== undefined && cellType > 0;
}

// --- Bucle de Animación ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (stats) stats.begin();

    if (isMobileDevice) { 
        handleTouchLook(delta); 
    }
    updateMovement(delta); 
    
    renderer.render(scene, camera);
    if (stats) stats.end();
}

// --- Ajuste de Ventana ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (isMobileDevice) { 
        setTimeout(() => {
            if (touchControls.left.element) {
                const leftRect = touchControls.left.element.getBoundingClientRect();
                touchControls.left.rect = leftRect;
                touchControls.left.center.x = leftRect.left + leftRect.width / 2;
                touchControls.left.center.y = leftRect.top + leftRect.height / 2;
                touchControls.left.radius = leftRect.width / 2;
                touchControls.left.deadZone = touchControls.left.radius * TOUCH_DPAD_DEADZONE_RATIO;
            }
            if (touchControls.right.element) {
                const rightRect = touchControls.right.element.getBoundingClientRect();
                touchControls.right.rect = rightRect;
                touchControls.right.center.x = rightRect.left + rightRect.width / 2;
                touchControls.right.center.y = rightRect.top + rightRect.height / 2;
                touchControls.right.radius = rightRect.width / 2;
                touchControls.right.deadZone = touchControls.right.radius * TOUCH_LOOK_DEADZONE_RATIO; 
            }
        }, 100); 
    }
}

// --- ¡Empezar! ---
init();