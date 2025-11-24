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

// --- NUEVO: CONFIGURACIÓN DE DISPARO ---
const BULLET_SPEED = 30.0;
const BULLET_RADIUS = 0.2;
const BULLET_COLOR = 0xffff00; // Amarillo
const ENEMY_BULLET_COLOR = 0xff0000; // Rojo para enemigos
const EXPLOSION_PARTICLE_COUNT = 15; // Cantidad de partículas al desintegrarse
const EXPLOSION_DURATION = 0.8; // Segundos que dura la explosión

// --- Datos del Mapa ---
// wallMap: -11 cargará el modelo índice 10 (dodecaedro.glb)
// <--- NUEVO: He puesto -16 en la posición [6][6] para el ROBOT --->
// <--- NUEVO: He puesto -17 en la posición [8][5] para el ROBOT ASPIRADORA --->
const wallMap = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, -7, 0, -8, 0, 0, 0, 0, -6, 0, 1],
  [1, 0, 0, 0, 0, 0, -1, 2, 0, 0, 0, 1], 
  [1, 0, 0, 3, -10, 0, 0, 2, 0, 0, 0, 1], // <--- NUEVO: He puesto -11 aquí (el dodecaedro)
  [1, 0, 0, 0, 0, 0, 0, -11,-2, 0, 0, 1],  
  [1, 0, 0, -14, 0, -5, -17, 1, 1, 0, 0, 1], // -17 es la aspiradora (Index 16)
  [1, 0, 0, 2, -16, 0, 0, -15, 0, 0, 0, 1], // -16 es el Robot Tanque (Index 15)
  [1, 0, 0, 2, 0, 0, -3, 0, -4, 0, 0, 1],
  [1, 0, 0, 0, 0, -9, 0, -13, 0, -12, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1],
];
const floorMap = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 4, 4, 4, 4, 4, 4, 1, 1, 1, 1, 0],
  [0, 4, 4, 4, 4, 4, 4, 1, 1, 1, 1, 0],
  [0, 4, 4, 4, 4, 4, 4, 0, 1, 1, 1, 0],
  [0, 4, 4, 0, 4, 4, 4, 0, 1, 1, 1, 0],
  [0, 1, 1, 1, 5, 5, 5, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 5, 5, 5, 0, 0, 1, 1, 0],
  [0, 1, 1, 0, 5, 5, 3, 3, 3, 3, 3, 0],
  [0, 1, 1, 0, 1, 2, 3, 3, 3, 3, 3, 0],
  [0, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 0],
  [0, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];
const ceilingMap = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 1 usará ceilingTextures[1]
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 0 usará placeholder (ceilingTextures[0])
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 1, 2, 2, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// --- Rutas de Texturas ---
const wallTextureUrls = ['textures/wall1.png', 'textures/wall2.png', 'textures/wall3.png'];
const floorTextureUrls = ['textures/floor1.png', 'textures/floor2.png', 'textures/floor3.png', 'textures/floor4.png', 'textures/floor5.png'];
const ceilingTextureUrls = ['textures/ceiling1.png', 'textures/ceiling2.png'];
const placeholderTextureUrl = 'textures/placeholder.png';

// --- Rutas de Modelos GLB ---
// <--- NUEVO: He añadido 'models/vacuum.glb' al final para la aspiradora (Index 16).
const modelUrls = [
    'models/barrel3.glb','models/barrel2.glb','models/barrel.glb', 
    'models/statue.glb', 'models/cruz.glb', 'models/geomag.glb', 
    'models/geomag1.glb', 'models/geomag12.glb', 'models/b.glb', 
    'models/a.glb', 'models/dodeestre.glb', 'models/dodeestre1.glb', 'models/t.glb', 'models/op.glb', 'models/s.glb',
    'models/robot.glb', // Index 15: El robot tanque
    'models/vacuum.glb' // Index 16: El robot aspiradora (usará placeholder si no existe el archivo)
]; 
const placeholderModelUrl = 'models/placeholder_cube.glb'; 

// --- Variables Globales ---
let scene, camera, renderer;
let clock = new THREE.Clock();
let textureLoader = new THREE.TextureLoader();
let mixers = []; // <--- Array para gestionar las animaciones generales
let activeRobots = []; // <--- NUEVO: Array para controlar la lógica de los enemigos
let gameScore = 0; // Puntuación
let playerHp = 5; // <--- NUEVO: Vida del jugador

// Elementos UI
let scoreElement;
let hpElement;

// --- NUEVO: VARIABLES PARA PROYECTILES ---
let bullets = []; // Array para almacenar balas activas
let activeExplosions = []; // Array para partículas de explosión

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
        deadZone: 0,
        // startPos: { x: 0, y: 0 }, // No se usará para el joystick de vista, pero se puede dejar si se alterna
        isActive: false,       // Para saber si el joystick de vista está activo
        currentRelX: 0,        // Posición X relativa del dedo (-1 a 1)
        currentRelY: 0,        // Posición Y relativa del dedo (-1 a 1)
        deadZone: 0            // Zona muerta para el joystick de vista
    }
};

// --- NUEVO: CLASE PARA CONTROLAR LOS ENEMIGOS ---
class GameEnemy {
    constructor(mesh, animations, type) {
        this.mesh = mesh;
        this.type = type; // 'HEAVY' (Tanque) o 'VACUUM' (Aspiradora)
        this.mixer = new THREE.AnimationMixer(mesh);
        
        // Propiedades según tipo
        if (this.type === 'HEAVY') {
            this.maxHp = 3;
            this.moveSpeed = 3.0;
            this.walkDuration = 5.0;
            this.idleDuration = 3.0;
            this.radius = TILE_SIZE * 0.4;
        } else { // VACUUM
            this.maxHp = 1;
            this.moveSpeed = 6.0; // Más rápido
            this.walkDuration = 9999.0; // Siempre moviéndose
            this.idleDuration = 0.0;
            this.radius = (TILE_SIZE / 5) / 2;
        }
        
        this.hp = this.maxHp;
        this.isDead = false;
        this.respawnTimer = 0;
        this.respawnDelay = 2.0;

        // --- NUEVO: Temporizador para disparar ---
        this.shootTimer = 0; 

        // Configuración de animaciones
        this.walkClip = animations.find(a => a.name.toLowerCase().includes('walk'));
        this.idleClip = animations.find(a => a.name.toLowerCase().includes('idle'));

        this.actions = {};

        if (this.walkClip) {
            this.actions['walk'] = this.mixer.clipAction(this.walkClip);
            this.actions['walk'].setEffectiveWeight(1);
        }
        if (this.idleClip) {
            this.actions['idle'] = this.mixer.clipAction(this.idleClip);
            this.actions['idle'].setEffectiveWeight(1);
        }

        this.currentState = 'idle'; 
        this.timer = 0;
        
        // Tiempos configurables
        this.walkDuration = 5.0;
        this.idleDuration = 3.0;
        this.moveSpeed = 3.0; // Velocidad del robot

        // Dirección aleatoria inicial
        const randomAngle = Math.random() * Math.PI * 2;
        this.direction = new THREE.Vector3(Math.sin(randomAngle), 0, Math.cos(randomAngle));
        this.mesh.rotation.y = randomAngle;

        // Iniciar en movimiento para vacuum, idle para heavy
        if (this.type === 'VACUUM') {
             this.switchState('walk');
             this.moveSpeed = 6.0; // Reafirmar velocidad
        } else {
             if (this.actions['idle']) this.actions['idle'].play();
        }
    }

    takeDamage() {
        if (this.isDead) return;

        this.hp--;
        console.log(`Enemigo ${this.type} dañado. HP: ${this.hp}`);

        if (this.hp <= 0) {
            this.die();
        } else {
            // Efecto visual simple de daño (parpadeo rojo)
            this.mesh.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.emissive.setHex(0xff0000);
                    setTimeout(() => {
                         if (!this.isDead) child.material.emissive.setHex(0x000000);
                    }, 100);
                }
            });
        }
    }

    die() {
        this.isDead = true;
        this.mesh.visible = false;
        this.respawnTimer = this.respawnDelay;
        gameScore++; // <--- NUEVO: Sumar punto
        updateUI();  // <--- NUEVO: Actualizar UI
        console.log(`Enemigo eliminado! Puntuación: ${gameScore}`);
        createExplosion(this.mesh.position);
    }

    respawn() {
        // Buscar una posición aleatoria donde el mapa sea 0
        let validSpot = false;
        let attempts = 0;
        let newX, newZ;

        while (!validSpot && attempts < 100) {
            const rx = Math.floor(Math.random() * mapWidth);
            const rz = Math.floor(Math.random() * mapHeight);
            
            // Comprobar si es un espacio vacío (0)
            if (wallMap[rz] && wallMap[rz][rx] === 0) {
                newX = rx * TILE_SIZE + TILE_SIZE / 2;
                newZ = rz * TILE_SIZE + TILE_SIZE / 2;
                validSpot = true;
            }
            attempts++;
        }

        if (validSpot) {
            // <--- CORRECCIÓN AQUÍ: Usamos la altura 'y' que ya tiene el modelo, calculada al inicio --->
            this.mesh.position.set(newX, this.mesh.position.y, newZ);
            this.mesh.visible = true;
            this.isDead = false;
            this.hp = this.maxHp;
            this.shootTimer = 0; // Resetear timer de disparo
            // Resetear color emissivo por si acaso
            this.mesh.traverse(child => {
                if (child.isMesh && child.material) child.material.emissive.setHex(0x000000);
            });
            console.log(`Enemigo respawneado en ${newX}, ${newZ}`);
        } else {
            // Si falla, reintentar en el siguiente frame
            this.respawnTimer = 0.1;
        }
    }

    update(delta) {
        if (this.isDead) {
            this.respawnTimer -= delta;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
            return;
        }

        // Actualizar mixer de animación
        if (this.mixer) this.mixer.update(delta);

        this.timer += delta;

        // --- LÓGICA DE DISPARO DEL VACUUM ---
        if (this.type === 'VACUUM') {
            this.shootTimer += delta;
            if (this.shootTimer >= 2.0) { // Cada 2 segundos
                this.shootHexagon();
                this.shootTimer = 0;
            }
        }

        // Lógica de estados para el HEAVY (El vacuum siempre está en 'walk')
        if (this.type === 'HEAVY') {
            if (this.currentState === 'idle') {
                if (this.timer >= this.idleDuration) {
                    this.switchState('walk');
                }
            } else if (this.currentState === 'walk') {
                if (this.timer >= this.walkDuration) {
                    this.switchState('idle');
                } else {
                    this.move(delta);
                }
            }
        } else {
            // VACUUM logic: Siempre mueve
            this.move(delta);
        }
    }

    // --- NUEVO: Función para disparar en hexágono ---
    shootHexagon() {
        const startY = this.mesh.position.y + 0.5; // Un poco arriba del suelo
        const origin = new THREE.Vector3(this.mesh.position.x, startY, this.mesh.position.z);
        
        for (let i = 0; i < 6; i++) {
            // Calcular ángulo para cada punta del hexágono (60 grados = PI/3)
            const angle = (i / 6) * Math.PI * 2;
            
            // Dirección horizontal base
            const dirX = Math.sin(angle);
            const dirZ = Math.cos(angle);
            
            // Vector dirección con ligera inclinación hacia arriba (y = 0.06)
            const direction = new THREE.Vector3(dirX, 0.06, dirZ).normalize();
            
            // Usar una posición de salida ligeramente desplazada para que no colisione con el propio vacuum
            const spawnPos = origin.clone().add(direction.clone().multiplyScalar(this.radius + 0.5));
            
            // Disparar bala como enemigo (isEnemy = true)
            shootBullet(spawnPos, direction, true);
        }
    }

    switchState(newState) {
        if (this.currentState === newState) return;

        const prevAction = this.actions[this.currentState];
        const nextAction = this.actions[newState];

        if (prevAction && nextAction) {
            prevAction.fadeOut(0.5);
            nextAction.reset().fadeIn(0.5).play();
        } else if (nextAction) {
            nextAction.reset().play();
        }

        this.currentState = newState;
        this.timer = 0;

        // Si empezamos a andar, podemos ajustar la dirección ligeramente o mantenerla
        if (newState === 'walk') {
           // Opcional: Cambiar dirección al empezar a andar
           // this.pickRandomDirection(); 
        }
    }

    move(delta) {
        const moveDist = this.moveSpeed * delta;
        const potentialPos = this.mesh.position.clone().add(this.direction.clone().multiplyScalar(moveDist));

        // Buffer de colisión
        const buffer = this.radius + 0.5; 
        
        // Verificar límites del grid y colisión con paredes
        const gridX = Math.floor((potentialPos.x + this.direction.x * buffer) / TILE_SIZE);
        const gridZ = Math.floor((potentialPos.z + this.direction.z * buffer) / TILE_SIZE);

        let collision = false;

        // 1. Colisión con Paredes
        if (isActualWallAt(gridX, gridZ)) {
            collision = true;
        }

        // Colisión con otros modelos estáticos
        if (!collision) {
            for (const capsule of modelCollisionCapsules) {
                // Calcular distancia cuadrada (más rápido que sqrt)
                const dx = potentialPos.x - capsule.worldPosition.x;
                const dz = potentialPos.z - capsule.worldPosition.z;
                const distSq = dx * dx + dz * dz;
                
                // Radio combinado: el "buffer" del robot + el radio del modelo
                const minSeparation = buffer + capsule.radius; 

                if (distSq < minSeparation * minSeparation) {
                    collision = true;
                    break;
                }
            }
        }

        // Detectar colisión global
        if (collision) {
            // ¡CHOQUE! Girar aleatoriamente
            this.pickRandomDirection();
        } else {
            // Camino libre, mover
            this.mesh.position.copy(potentialPos);
        }
    }

    pickRandomDirection() {
        // Girar entre 90 y 270 grados
        const turnAngle = (Math.PI / 2) + (Math.random() * Math.PI);
        
        // Aplicar rotación al vector dirección
        this.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), turnAngle);
        this.direction.normalize();

        // Rotar visualmente la malla para mirar hacia donde va
        // Nota: El modelo original mira hacia +Y o +Z dependiendo del export.
        // Asumimos que el frente es +Z (estándar GLB) o ajustamos aquí.
        // Blender exporta Z-up, Threejs es Y-up. Normalmente lookAt funciona bien.
        const target = this.mesh.position.clone().add(this.direction);
        this.mesh.lookAt(target);
    }
}


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
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (isMobileDevice && fullscreenBtn) {
        fullscreenBtn.classList.add('mobile-visible'); // Hace el botón visible
        fullscreenBtn.addEventListener('click', toggleFullscreen); // Asigna la función al click
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    // --- NUEVO: UI DE PUNTOS Y VIDA ---
    createGameUI();
    // ----------------------------------

    // --- NUEVO: CREAR LA CRUCETA (CROSSHAIR) ---
    const crosshair = document.createElement('div');
    crosshair.style.position = 'absolute';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.width = '10px';
    crosshair.style.height = '10px';
    crosshair.style.border = '2px solid rgba(255, 255, 255, 0.8)'; // Borde blanco semi-transparente
    crosshair.style.borderRadius = '50%'; // Redondo
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.pointerEvents = 'none'; // Permitir clicks a través
    crosshair.style.boxSizing = 'border-box';
    
    // Un punto central rojo
    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.top = '50%';
    dot.style.left = '50%';
    dot.style.width = '2px';
    dot.style.height = '2px';
    dot.style.backgroundColor = 'red';
    dot.style.transform = 'translate(-50%, -50%)';
    crosshair.appendChild(dot);

    document.body.appendChild(crosshair);
    // ------------------------------------------

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

// --- NUEVO: Función para crear UI de Score y HP ---
function createGameUI() {
    // Contenedor Score
    scoreElement = document.createElement('div');
    scoreElement.style.position = 'absolute';
    scoreElement.style.top = '20px';
    scoreElement.style.left = '20px';
    scoreElement.style.color = 'yellow';
    scoreElement.style.fontFamily = 'Arial, sans-serif';
    scoreElement.style.fontSize = '24px';
    scoreElement.style.fontWeight = 'bold';
    scoreElement.style.textShadow = '2px 2px 2px #000';
    scoreElement.innerHTML = `PUNTOS: ${gameScore}`;
    document.body.appendChild(scoreElement);

    // Contenedor HP
    hpElement = document.createElement('div');
    hpElement.style.position = 'absolute';
    hpElement.style.top = '20px';
    hpElement.style.right = '20px';
    hpElement.style.color = 'red';
    hpElement.style.fontFamily = 'Arial, sans-serif';
    hpElement.style.fontSize = '24px';
    hpElement.style.fontWeight = 'bold';
    hpElement.style.textShadow = '2px 2px 2px #000';
    hpElement.innerHTML = `VIDA: ${playerHp}`;
    document.body.appendChild(hpElement);
}

// --- NUEVO: Función para actualizar UI ---
function updateUI() {
    if(scoreElement) scoreElement.innerHTML = `PUNTOS: ${gameScore}`;
    if(hpElement) hpElement.innerHTML = `VIDA: ${playerHp}`;
}

function toggleFullscreen() {
    const doc = window.document;
    const docEl = doc.documentElement;

    const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
    const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

    if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
        if (requestFullScreen) {
            requestFullScreen.call(docEl);
        } else {
            console.warn("La API de pantalla completa no es compatible con este navegador.");
        }
    } else {
        if (cancelFullScreen) {
            cancelFullScreen.call(doc);
        }
    }
}
function handleFullscreenChange() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (!fullscreenBtn) return; // Medida de seguridad

    // Comprueba si algún elemento está en modo de pantalla completa
    const isFullscreen = document.fullscreenElement ||
                         document.webkitFullscreenElement ||
                         document.mozFullScreenElement ||
                         document.msFullscreenElement;

    if (isFullscreen) {
        // Si estamos en pantalla completa, OCULTA el botón
        fullscreenBtn.style.display = 'none';
    } else {
        // Si NO estamos en pantalla completa (porque salimos), lo VOLVEMOS A MOSTRAR
        // solo si estamos en un dispositivo móvil
        if (isMobileDevice) {
            fullscreenBtn.style.display = 'block';
        }
    }
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
    // Limpiar mixers antiguos si se regenera el mapa
    mixers.forEach(m => m.stopAllAction());
    mixers.length = 0;
    activeRobots.length = 0; // Limpiar robots antiguos

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
                    
                    // Identificar enemigos
                    const IS_HEAVY_ROBOT = (modelIndex === 15); // El original
                    const IS_VACUUM_ROBOT = (modelIndex === 16); // El nuevo aspirador

                    if (IS_HEAVY_ROBOT || IS_VACUUM_ROBOT) {
                        const type = IS_VACUUM_ROBOT ? 'VACUUM' : 'HEAVY';
                        const enemy = new GameEnemy(modelInstance, modelGltf.animations, type);
                        
                        // Escalar el robot vacuum a 1/5 del tile
                        if (type === 'VACUUM') {
                            // Resetear escala primero para calcular bien la caja
                            modelInstance.scale.set(1,1,1);
                            const box = new THREE.Box3().setFromObject(modelInstance);
                            const size = box.getSize(new THREE.Vector3());
                            const maxDim = Math.max(size.x, size.y, size.z);
                            
                            const targetSize = TILE_SIZE / 5;
                            const scaleFactor = targetSize / maxDim;
                            modelInstance.scale.set(scaleFactor, scaleFactor, scaleFactor);
                        } else {
                            // Escalado normal para el heavy
                            const box = new THREE.Box3().setFromObject(modelInstance);
                            const size = box.getSize(new THREE.Vector3());
                            const maxDim = Math.max(size.x, size.y, size.z);
                            const desiredMaxDim = TILE_SIZE * 0.6;
                            const scale = desiredMaxDim / maxDim;
                            modelInstance.scale.set(scale, scale, scale);
                        }
                        
                        // Ajustar altura Y
                        const finalBox = new THREE.Box3().setFromObject(modelInstance);
                        modelInstance.position.y = -finalBox.min.y;

                        activeRobots.push(enemy);
                        // Añadir al grupo principal para renderizado
                        mapMeshesGroup.add(modelInstance);

                    } else {
                        // --- LÓGICA ESTÁNDAR PARA OBJETOS ESTÁTICOS ---
                        if (modelGltf.animations && modelGltf.animations.length > 0) {
                            const mixer = new THREE.AnimationMixer(modelInstance);
                            modelGltf.animations.forEach((clip) => {
                                mixer.clipAction(clip).play();
                            });
                            mixers.push(mixer);
                        }
                    
                    // -------------------------------------------------

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
                            height: capsuleHeight
                        });
                        
                        modelInstance.traverse(child => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });
                        mapMeshesGroup.add(modelInstance);
                    }
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

// --- NUEVO: FUNCIONALIDAD DE DISPARO (ACTUALIZADA) ---
// Ahora acepta origen, dirección y si es enemiga o no
function shootBullet(origin, direction, isEnemy = false) {
    const bulletGeometry = new THREE.SphereGeometry(BULLET_RADIUS, 8, 8);
    const color = isEnemy ? ENEMY_BULLET_COLOR : BULLET_COLOR;
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: color });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // Posición inicial
    if (origin) {
        bullet.position.copy(origin);
    } else {
        // Por defecto dispara el jugador desde la cámara
        bullet.position.copy(camera.position);
        
        // Obtener la dirección hacia donde mira la cámara si no se pasa dirección
        if (!direction) {
            direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
        }
        
        // Mover un poco la bala al frente para que no colisione con el jugador inmediatamente
        bullet.position.add(direction.clone().multiplyScalar(1.0));
    }
    
    // Velocidad
    const velocity = direction.clone().normalize().multiplyScalar(BULLET_SPEED);

    scene.add(bullet);
    bullets.push({ mesh: bullet, velocity: velocity, alive: true, isEnemy: isEnemy });
}

function createExplosion(position) {
    const particleGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const particleMaterial = new THREE.MeshBasicMaterial({ color: BULLET_COLOR });

    const particles = [];
    for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
        const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
        particle.position.copy(position);
        
        // Velocidad aleatoria para dispersión
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
        );
        
        scene.add(particle);
        particles.push({ mesh: particle, velocity: velocity });
    }

    activeExplosions.push({ particles: particles, age: 0 });
}

function updateProjectiles(delta) {
    // --- Actualizar Balas ---
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Mover
        const moveStep = bullet.velocity.clone().multiplyScalar(delta);
        const nextPos = bullet.mesh.position.clone().add(moveStep);
        
        // Detección de colisión (simple)
        let collision = false;
        let hitEnemy = null;
        let hitPlayer = false;

        // 1. Colisión con Paredes del Mapa (Grid)
        const gridX = Math.floor(nextPos.x / TILE_SIZE);
        const gridZ = Math.floor(nextPos.z / TILE_SIZE);
        
        if (isActualWallAt(gridX, gridZ)) {
            collision = true;
        }

        // 2. Colisión con Objetos Estáticos (Capsulas)
        if (!collision) {
            for (const capsule of modelCollisionCapsules) {
                const distSq = nextPos.distanceToSquared(capsule.worldPosition);
                // Aproximación simple: radio de la cápsula + radio bala
                const threshold = (capsule.radius + BULLET_RADIUS);
                if (distSq < threshold * threshold) {
                    collision = true;
                    break;
                }
            }
        }

        // 3. Colisión Específica (Jugador vs Enemigos o Enemigos vs Jugador)
        if (!collision) {
            if (bullet.isEnemy) {
                // Bala de Enemigo -> Chequear colisión con Jugador
                // Usamos la posición de la cámara como posición del jugador
                const distSq = nextPos.distanceToSquared(camera.position);
                const hitRadius = PLAYER_RADIUS + BULLET_RADIUS;
                if (distSq < hitRadius * hitRadius) {
                    collision = true;
                    hitPlayer = true;
                }
            } else {
                // Bala de Jugador -> Chequear colisión con Enemigos
                for (const robot of activeRobots) {
                    if (robot.isDead) continue;
                    
                    // Usar caja de colisión simple basada en posición y un radio estimado
                    const distSq = nextPos.distanceToSquared(robot.mesh.position);
                    const hitRadius = robot.radius + BULLET_RADIUS; 
                    
                    if (distSq < hitRadius * hitRadius) {
                        collision = true;
                        hitEnemy = robot;
                        break;
                    }
                }
            }
        }
        
        // 4. Colisión con Suelo/Techo (límites verticales)
        if (!collision && (nextPos.y < 0 || nextPos.y > WALL_HEIGHT)) {
            collision = true;
        }

        if (collision) {
            // Impacto
            createExplosion(nextPos);
            
            if (hitEnemy) {
                hitEnemy.takeDamage();
            }

            if (hitPlayer) {
                playerHp--;
                updateUI();
                console.log("¡Jugador golpeado! HP restante: " + playerHp);
                if (playerHp <= 0) {
                    // Lógica simple de muerte
                    alert("¡HAS MUERTO! Puntuación final: " + gameScore);
                    playerHp = 5;
                    gameScore = 0;
                    updateUI();
                    findStartPosition(); // Respawn
                }
            }

            scene.remove(bullet.mesh);
            bullet.mesh.geometry.dispose();
            bullet.mesh.material.dispose();
            bullets.splice(i, 1);
        } else {
            // Avanzar
            bullet.mesh.position.add(moveStep);
            
            // Limpieza si se va muy lejos (fuera del mapa seguro)
            if (gridX < -5 || gridX > mapWidth + 5 || gridZ < -5 || gridZ > mapHeight + 5) {
                scene.remove(bullet.mesh);
                bullets.splice(i, 1);
            }
        }
    }

    // --- Actualizar Explosiones ---
    for (let i = activeExplosions.length - 1; i >= 0; i--) {
        const explosion = activeExplosions[i];
        explosion.age += delta;

        if (explosion.age > EXPLOSION_DURATION) {
            // Eliminar explosión
            explosion.particles.forEach(p => {
                scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
            });
            activeExplosions.splice(i, 1);
        } else {
            // Animar partículas
            const progress = explosion.age / EXPLOSION_DURATION;
            explosion.particles.forEach(p => {
                p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
                // Efecto de desvanecimiento (reducir escala)
                const scale = 1 - progress;
                p.mesh.scale.setScalar(scale);
            });
        }
    }
}

// --- Controles ---
function setupControls() {
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    // NUEVO: Listener para disparar con el ratón
    document.addEventListener('mousedown', onMouseDown, false);

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

// NUEVO: Manejador de click del ratón para disparar
function onMouseDown(event) {
    if (isPointerLocked && event.button === 0) { // Click izquierdo
        shootBullet(); // Sin argumentos = jugador
    }
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
        case ' ': shootBullet(); break; // NUEVO: Espacio para disparar
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

    // NUEVO: Disparo con Gamepad (Botón 0 -> 'X' o 'A', Botón 5 -> R1/RB, Botón 7 -> R2/RT)
    // Usaremos un sistema simple para evitar disparo continuo ametralladora si se mantiene presionado
    // (o dejamos ametralladora por diversión, aquí lo dejo continuo pero depende de animate rate)
    // Para simplificar, si se pulsa el botón 7 (Gatillo derecho) o botón 0 (Acción)
    if (gp.buttons[7] && gp.buttons[7].pressed) {
        // Podrías añadir un cooldown aquí si es demasiado rápido
        // Por ahora disparo simple por frame es demasiado, así que añadimos una pequeña probabilidad o timer
        // Simplemente llamamos shootBullet() pero el usuario debe pulsar rápido o añadimos un timer global
        // Para este ejemplo, requerimos soltar el botón, pero en animate es complejo.
        // Haremos que dispare solo si Math.random es bajo para simular cadencia si se mantiene presionado
        if (Math.random() < 0.1) shootBullet(); 
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
        } else {
            // NUEVO: Si tocas la pantalla fuera de los controles (ej: centro), dispara
            // Evitamos disparar si se toca muy cerca de los controles
            if (!isTouchOnElement(touch, touchControls.left) && !isTouchOnElement(touch, touchControls.right)) {
                 shootBullet();
            }
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

    // --- <NUEVO> ACTUALIZAR ANIMACIONES GENERALES ---
    if (mixers.length > 0) {
        for (const mixer of mixers) {
            mixer.update(delta);
        }
    }
    // --------------------------------------

    // --- <NUEVO> ACTUALIZAR ENEMIGOS ---
    if (activeRobots.length > 0) {
        for (const robot of activeRobots) {
            robot.update(delta);
        }
    }
    // --------------------------------------

    // --- <NUEVO> ACTUALIZAR PROYECTILES Y EFECTOS ---
    updateProjectiles(delta);
    // ------------------------------------------------

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