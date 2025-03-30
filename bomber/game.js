import * as THREE from 'three';

// --- Constantes y Configuración ---
const GRID_SIZE = 15; // Tamaño del tablero (impar es mejor para patrones)
const CELL_SIZE = 4; // Tamaño de cada celda en unidades 3D
const PLAYER_SPEED_BASE = 8.0; // Unidades por segundo
const BOMB_TIMER = 2.5; // Segundos para explotar
const EXPLOSION_DURATION = 0.5; // Segundos que dura la visualización de la explosión
const DESTRUCTIBLE_CHANCE = 0.7; // Probabilidad de que una celda vacía sea destructible
const POWERUP_CHANCE = 0.25; // Probabilidad de que un bloque destruido deje un power-up
const GAMEPAD_DEADZONE = 0.2; // Zona muerta para los sticks del gamepad

// Tipos de Celdas (Lógico)
const CELL_EMPTY = 0;
const CELL_INDESTRUCTIBLE = 1;
const CELL_DESTRUCTIBLE = 2;
const CELL_BOMB = 3; // Celda temporalmente ocupada por una bomba
const CELL_EXPLOSION = 4; // Celda temporalmente afectada por una explosión
const CELL_POWERUP_BOMB = 5; // Power-up: más bombas simultáneas
const CELL_POWERUP_RANGE = 6; // Power-up: mayor rango de explosión
const CELL_POWERUP_SPEED = 7; // Power-up: mayor velocidad

// Texturas (¡IMPORTANTE: Cambia estas rutas a tus archivos!)
const TEXTURES = {
    floor: 'textures/floor.png',
    ceiling: 'textures/ceiling.png',
    indestructible: 'textures/indestructible.png',
    destructible: 'textures/destructible.png',
    player1: 'textures/player1.png', // O usa colores
    player2: 'textures/player2.png', // O usa colores
    bomb: 'textures/bomb.png',       // O usa colores
    powerup_bomb: 'textures/powerup_bomb.png',
    powerup_range: 'textures/powerup_range.png',
    powerup_speed: 'textures/powerup_speed.png',
};

// --- Variables Globales ---
let scene, renderer;
let cameras = []; // [cameraP1, cameraP2]
let players = []; // [player1, player2]
let grid = []; // El tablero lógico 2D
let blocks = {}; // Almacena meshes de bloques por coordenada "row_col"
let bombs = []; // Bombas activas { mesh, gridPos, timer, range, owner }
let explosions = []; // Explosiones activas { cells, timer, visuals }
let powerups = {}; // Powerups activos por coordenada "row_col" { mesh, type }
let clock = new THREE.Clock();
let gameRunning = false;
let textureLoader = new THREE.TextureLoader();
let materials = {}; // Almacenará los materiales creados con texturas

// Controles
let keysPressed = {};
let prevGamepadButtonPressed = { 0: {}, 1: {} }; // Para detectar flancos de subida en botones de gamepad

// Elementos UI
const ui = {
    p1Info: document.getElementById('player1-info'),
    p2Info: document.getElementById('player2-info'),
    p1Bombs: document.getElementById('p1-bombs'),
    p1BombCapacity: document.getElementById('p1-bomb-capacity'),
    p1Range: document.getElementById('p1-range'),
    p1Speed: document.getElementById('p1-speed'),
    p2Bombs: document.getElementById('p2-bombs'),
    p2BombCapacity: document.getElementById('p2-bomb-capacity'),
    p2Range: document.getElementById('p2-range'),
    p2Speed: document.getElementById('p2-speed'),
    messageOverlay: document.getElementById('message-overlay'),
    messageText: document.getElementById('message-text'),
    startButton: document.getElementById('start-button'),
};

// --- Inicialización ---

function init() {
    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x444466); // Fondo oscuro

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true; // Sombras suaves
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false; // Necesario para Sissor/Viewport
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Cámaras (Una para cada jugador)
    for (let i = 0; i < 2; i++) {
        const camera = new THREE.PerspectiveCamera(60, (window.innerWidth / 2) / window.innerHeight, 0.1, 1000);
        // Posición inicial un poco más genérica, se ajustará en updateCameraPositions
        camera.position.set(0, GRID_SIZE * CELL_SIZE * 0.8, GRID_SIZE * CELL_SIZE * 0.6);
        camera.lookAt(0, 0, 0);
        cameras.push(camera);
    }

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(GRID_SIZE * CELL_SIZE / 2, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE / 3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = GRID_SIZE * CELL_SIZE * 2.5; // Aumentar far plane de sombra
    directionalLight.shadow.camera.left = -GRID_SIZE * CELL_SIZE * 0.8;
    directionalLight.shadow.camera.right = GRID_SIZE * CELL_SIZE * 0.8;
    directionalLight.shadow.camera.top = GRID_SIZE * CELL_SIZE * 0.8;
    directionalLight.shadow.camera.bottom = -GRID_SIZE * CELL_SIZE * 0.8;
    scene.add(directionalLight);
    // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera); // Helper visual de sombra
    // scene.add(shadowHelper);


    // Cargar Texturas y Crear Materiales
    loadMaterials(() => {
        // Una vez cargadas las texturas, construir el nivel inicial
        createLevel();
        setupPlayers();
        updateUI(); // Actualiza UI inicial
        // Mostrar pantalla de inicio
        ui.messageText.textContent = "Bomber3D";
        ui.startButton.textContent = "Iniciar Juego";
        ui.messageOverlay.style.display = 'flex';
        // El botón de inicio inicial llama a startGame
        ui.startButton.onclick = () => startGame(); // Llama a startGame para la primera vez
        // Iniciar loop de animación (pero el juego no correrá hasta pulsar Start)
        animate();
    });

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
}

function loadMaterials(callback) {
    let texturesToLoad = Object.keys(TEXTURES).length;
    let loadedCount = 0; // Use a counter instead of decrementing

    if (texturesToLoad === 0) {
        console.warn("No texture paths defined in TEXTURES constant.");
        if (callback) callback();
        return;
    }

    function textureLoaded() {
        loadedCount++;
        // console.log(`Texture loaded (${loadedCount}/${Object.keys(TEXTURES).length})`);
        if (loadedCount === Object.keys(TEXTURES).length && callback) {
            console.log("All textures loaded.");
            callback();
        }
    }

     function textureError(url) {
        console.error(`Failed to load texture: ${url}`);
        console.warn(`Using fallback color for ${url}`);
        textureLoaded(); // Still count it as "attempted" to proceed
    }


    function createMaterial(texturePath, fallbackColor = 0xffffff) {
         if (!texturePath) {
             console.warn("Missing texture path, using fallback color.");
             textureLoaded(); // Count as loaded even if path missing
             return new THREE.MeshStandardMaterial({ color: fallbackColor });
         }
         try {
            const texture = textureLoader.load(
                texturePath,
                textureLoaded, // Success
                undefined,     // Progress (optional)
                () => textureError(texturePath) // Error simplified
            );
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            // Ajusta el repeat si la textura no está diseñada para un cubo unidad
            // texture.repeat.set(1, 1); // Default for now
            return new THREE.MeshStandardMaterial({ map: texture, metalness: 0.1, roughness: 0.8 });
        } catch (e) {
            console.error(`Error creating material for ${texturePath}: `, e);
            textureError(texturePath); // Call error handler
            return new THREE.MeshStandardMaterial({ color: fallbackColor });
        }
    }


    materials.floor = createMaterial(TEXTURES.floor, 0x888888);
    materials.ceiling = createMaterial(TEXTURES.ceiling, 0xaaaaaa);
    materials.indestructible = createMaterial(TEXTURES.indestructible, 0x555555);
    materials.destructible = createMaterial(TEXTURES.destructible, 0xaaaa55);
    materials.player1 = createMaterial(TEXTURES.player1, 0x0000ff); // Azul si falla
    materials.player2 = createMaterial(TEXTURES.player2, 0xff0000); // Rojo si falla
    materials.bomb = createMaterial(TEXTURES.bomb, 0x222222);       // Negro si falla
    materials.powerup_bomb = createMaterial(TEXTURES.powerup_bomb, 0xff8800);
    materials.powerup_range = createMaterial(TEXTURES.powerup_range, 0x00ff00);
    materials.powerup_speed = createMaterial(TEXTURES.powerup_speed, 0x00ffff);
    // *** Explosión usa un material base, pero clonaremos para la opacidad ***
    materials.explosion = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 }); // Naranja para explosión

     // Fallback if texture count calculation was off (shouldn't happen with counter)
     if (loadedCount === Object.keys(TEXTURES).length && texturesToLoad > 0 && callback) {
         console.warn("Callback potentially called early, but proceeding.");
         callback();
     }
}

function createLevel() {
    console.log("Creating Level...");
    // Crear Suelo y Techo
    const planeGeometry = new THREE.PlaneGeometry(GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

    // Suelo
    const floor = new THREE.Mesh(planeGeometry, materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -CELL_SIZE / 2; // Centrar bloques sobre el suelo
    floor.receiveShadow = true;
    scene.add(floor);

    // Techo (opcional, puede quitarse si da problemas de visibilidad)
    const ceiling = new THREE.Mesh(planeGeometry, materials.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = CELL_SIZE / 2;
    ceiling.receiveShadow = true; // El techo también recibe sombras
    scene.add(ceiling);


    // Crear Tablero Lógico y Bloques 3D
    grid = []; // Asegurarse de resetear el grid lógico
    blocks = {}; // Asegurarse de resetear los bloques físicos
    powerups = {}; // Asegurarse de resetear los powerups lógicos/físicos
    for (let r = 0; r < GRID_SIZE; r++) {
        grid[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            let cellType = CELL_EMPTY;
            // Define starting areas - need to be empty
            const isP1StartArea = (r >= 1 && r <= 2 && c >= 1 && c <= 2);
            const isP2StartArea = (r >= GRID_SIZE - 3 && r <= GRID_SIZE - 2 && c >= GRID_SIZE - 3 && c <= GRID_SIZE - 2);

            if (r === 0 || c === 0 || r === GRID_SIZE - 1 || c === GRID_SIZE - 1 || (r % 2 === 0 && c % 2 === 0)) {
                cellType = CELL_INDESTRUCTIBLE; // Bordes y pilares
            } else if (isP1StartArea || isP2StartArea) {
                 cellType = CELL_EMPTY; // Ensure start areas are clear
            }
            else {
                // Place destructible blocks randomly elsewhere
                if (Math.random() < DESTRUCTIBLE_CHANCE) {
                     cellType = CELL_DESTRUCTIBLE;
                } else {
                    cellType = CELL_EMPTY;
                }
            }

            grid[r][c] = cellType;

            if (cellType === CELL_INDESTRUCTIBLE || cellType === CELL_DESTRUCTIBLE) {
                createBlock(r, c, cellType);
            }
        }
    }
    console.log("Grid created:", grid.length > 0 ? "OK" : "Failed");
}

function createBlock(r, c, type) {
    const blockGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
    let material = (type === CELL_INDESTRUCTIBLE) ? materials.indestructible : materials.destructible;
    if (!material) {
        console.error(`Material not found for block type ${type} at ${r},${c}. Using fallback.`);
        material = new THREE.MeshStandardMaterial({ color: 0xff00ff }); // Magenta fallback
    }
    const block = new THREE.Mesh(blockGeometry, material);
    block.position.copy(gridToWorld(r, c)); // Centrado en la celda
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
    blocks[`${r}_${c}`] = block; // Guardar referencia
    return block;
}

function setupPlayers() {
    console.log("Setting up Players...");
    players = []; // Limpiar jugadores si se reinicia

    // Jugador 1 (Esquina Superior Izquierda) - Posición inicial (1,1)
    players.push(createPlayer(1, 1, materials.player1, 0));

    // Jugador 2 (Esquina Inferior Derecha) - Posición inicial (GRID_SIZE-2, GRID_SIZE-2)
    players.push(createPlayer(GRID_SIZE - 2, GRID_SIZE - 2, materials.player2, 1));

     // Ajustar cámaras iniciales para mirar a sus jugadores
    updateCameraPositions(); // Llama esto para centrar cámaras inicialmente
}

function createPlayer(r, c, material, playerIndex) {
    const playerGeometry = new THREE.CapsuleGeometry(CELL_SIZE * 0.35, CELL_SIZE * 0.3, 16, 8); // Un poco más pequeño que la celda
     if (!material) {
        console.error(`Material not found for player ${playerIndex + 1}. Using fallback.`);
        material = new THREE.MeshStandardMaterial({ color: playerIndex === 0 ? 0x0000ff : 0xff0000 });
    }
    const playerMesh = new THREE.Mesh(playerGeometry, material);
    const worldPos = gridToWorld(r, c);
    playerMesh.position.copy(worldPos);
    // Ajustar altura cápsula (base de la cápsula al nivel del suelo)
    playerMesh.position.y = worldPos.y -CELL_SIZE / 2 + (CELL_SIZE * 0.3); // Levantar base cápsula al suelo
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true;
    scene.add(playerMesh);

    return {
        mesh: playerMesh,
        gridPos: { r, c },
        targetPos: playerMesh.position.clone(), // Para movimiento suave
        isMoving: false,
        alive: true,
        speedMultiplier: 1.0, // Multiplicador de velocidad (para power-up)
        bombCapacity: 1,    // Cuántas bombas puede poner a la vez
        bombsActive: 0,      // Cuántas ha puesto
        bombRange: 1,        // Rango de la explosión (celdas desde el centro)
        index: playerIndex,  // 0 para P1, 1 para P2
    };
}

// Llamada por el botón 'Iniciar Juego' / 'Jugar de Nuevo (via resetGame)'
function startGame() {
    // No necesita resetear aquí, resetGame lo hace si es necesario.
    console.log("Attempting to start game...");
    ui.messageOverlay.style.display = 'none'; // Ocultar mensaje/botón
    gameRunning = true; // Activar lógica del juego en animate()
    if (!clock.running) { // Iniciar reloj si no está corriendo
        clock.start();
    }
    // Reset delta time in case of restart while clock was running
    clock.getDelta();
    // Resetear estado de botones del gamepad al iniciar/reiniciar
    prevGamepadButtonPressed = { 0: {}, 1: {} };
    console.log("Game Running Flag set to TRUE.");
}

// Llamada SOLO por el botón 'Jugar de Nuevo'
function resetGame() {
     console.log("Resetting Game...");
     // 1. Detener el estado de juego activo
     gameRunning = false;
     // No detenemos el clock, el requestAnimationFrame sigue corriendo

     // 2. Limpiar objetos de la partida anterior
     console.log("Cleaning up old game objects...");
     bombs.forEach(b => { if (b.mesh) scene.remove(b.mesh); });
     bombs = [];
     explosions.forEach(exp => {
         if(exp.visuals) exp.visuals.forEach(v => { if(v && v.parent) scene.remove(v); }); // Safe remove
     });
     explosions = [];
     Object.values(powerups).forEach(p => { if (p.mesh && p.mesh.parent) scene.remove(p.mesh); }); // Safe remove
     powerups = {};
     Object.values(blocks).forEach(b => { if (b && b.parent) scene.remove(b); }); // Safe remove
     blocks = {};
     players.forEach(p => { if (p.mesh && p.mesh.parent) scene.remove(p.mesh); }); // Safe remove
     players = [];
     grid = []; // Muy importante resetear el grid lógico

     // 3. Limpiar estado de input
     keysPressed = {};
     prevGamepadButtonPressed = { 0: {}, 1: {} }; // Limpiar estado gamepad también

     // 4. Recrear el nivel y los jugadores para la nueva partida
     console.log("Recreating level and players...");
     createLevel(); // Esto resetea grid y powerups
     setupPlayers(); // Asegúrate que esto posiciona bien las cámaras también
     updateUI(); // Actualizar la UI con los stats iniciales

     // 5. Iniciar la nueva partida llamando a startGame
     console.log("Game Reset Complete. Calling startGame...");
     startGame(); // Esto ocultará el overlay y pondrá gameRunning = true
}


// --- Lógica del Juego (Actualización) ---

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // Solo actualiza la lógica del juego si gameRunning es true
    if (gameRunning) {
        handleInputAndGamepad(deltaTime); // Combinado input keyboard/gamepad
        updatePlayers(deltaTime);
        updateBombs(deltaTime);
        updateExplosions(deltaTime);
        checkCollisions(); // Comprobar colisiones JUGADOR vs EXPLOSION
        checkWinCondition(); // Comprobar si alguien ha ganado/empatado
    }

    // Actualizar cámaras siempre para seguir a los jugadores (o la posición donde murieron)
    updateCameraPositions();

    // Renderizado Split Screen
    renderer.clear(); // Limpia todo el buffer

    const width = window.innerWidth;
    const height = window.innerHeight;
    const halfWidth = width / 2;

    // --- Render Jugador 1 (Izquierda) ---
    renderer.setViewport(0, 0, halfWidth, height);
    renderer.setScissor(0, 0, halfWidth, height);
    renderer.setScissorTest(true);
    if (cameras[0]) renderer.render(scene, cameras[0]);

    // --- Render Jugador 2 (Derecha) ---
    renderer.setViewport(halfWidth, 0, halfWidth, height);
    renderer.setScissor(halfWidth, 0, halfWidth, height);
    renderer.setScissorTest(true); // Ya estaba true, pero por claridad
    if (cameras[1]) renderer.render(scene, cameras[1]);
}

function handleInputAndGamepad(deltaTime) {
    const gamepads = navigator.getGamepads();
    const currentGamepadButtonPressed = { 0: {}, 1: {} }; // Estado actual para este frame

    // --- Procesar Input para Jugador 1 (Índice 0) ---
    if (players[0]?.alive) {
        let moveDir = { r: 0, c: 0 };
        let placeBombAction = false;
        const gp = gamepads[0]; // Gamepad para Jugador 1

        // Prioridad Gamepad si está conectado y activo
        if (gp) {
            // Movimiento (Stick Izquierdo - axes 0, 1 / D-pad - buttons 12-15)
            const axisH = gp.axes[0];
            const axisV = gp.axes[1];
            const dpadLeft = gp.buttons[14]?.pressed;
            const dpadRight = gp.buttons[15]?.pressed;
            const dpadUp = gp.buttons[12]?.pressed;
            const dpadDown = gp.buttons[13]?.pressed;

            if (Math.abs(axisH) > GAMEPAD_DEADZONE || dpadLeft || dpadRight) {
                moveDir.c = (axisH < -GAMEPAD_DEADZONE || dpadLeft) ? -1 : (axisH > GAMEPAD_DEADZONE || dpadRight) ? 1 : 0;
            }
            if (Math.abs(axisV) > GAMEPAD_DEADZONE || dpadUp || dpadDown) {
                moveDir.r = (axisV < -GAMEPAD_DEADZONE || dpadUp) ? -1 : (axisV > GAMEPAD_DEADZONE || dpadDown) ? 1 : 0;
            }

            // Poner Bomba (Botón 0 - usualmente A/Cross, Botón 2 - usualmente X/Square)
            const bombButtonPressed = gp.buttons[0]?.pressed || gp.buttons[2]?.pressed;
            const buttonIndex = gp.buttons[0]?.pressed ? 0 : (gp.buttons[2]?.pressed ? 2 : -1);

            if(buttonIndex !== -1) {
                currentGamepadButtonPressed[0][buttonIndex] = bombButtonPressed;
                if (bombButtonPressed && !prevGamepadButtonPressed[0][buttonIndex]) { // Flanco de subida
                    placeBombAction = true;
                }
            }


        }

        // Fallback o Adición Teclado (si no hay input de gamepad para esa acción)
        if (moveDir.r === 0 && moveDir.c === 0) { // Si el gamepad no se movió
            if (keysPressed['w']) moveDir.r = -1;
            else if (keysPressed['s']) moveDir.r = 1;
            if (keysPressed['a']) moveDir.c = -1;
            else if (keysPressed['d']) moveDir.c = 1;
        }
        if (!placeBombAction && keysPressed[' ']) { // Si el gamepad no puso bomba
            placeBombAction = true;
            keysPressed[' '] = false; // Consumir pulsación teclado
        }

        // Aplicar acciones
        if (moveDir.r !== 0 || moveDir.c !== 0) {
             movePlayer(players[0], moveDir);
        }
        if (placeBombAction) {
            placeBomb(players[0]);
        }
    }

    // --- Procesar Input para Jugador 2 (Índice 1) ---
    if (players[1]?.alive) {
        let moveDir = { r: 0, c: 0 };
        let placeBombAction = false;
        const gp = gamepads[1]; // Gamepad para Jugador 2

        // Prioridad Gamepad
        if (gp) {
             // Movimiento
            const axisH = gp.axes[0];
            const axisV = gp.axes[1];
            const dpadLeft = gp.buttons[14]?.pressed;
            const dpadRight = gp.buttons[15]?.pressed;
            const dpadUp = gp.buttons[12]?.pressed;
            const dpadDown = gp.buttons[13]?.pressed;

            if (Math.abs(axisH) > GAMEPAD_DEADZONE || dpadLeft || dpadRight) {
                moveDir.c = (axisH < -GAMEPAD_DEADZONE || dpadLeft) ? -1 : (axisH > GAMEPAD_DEADZONE || dpadRight) ? 1 : 0;
            }
            if (Math.abs(axisV) > GAMEPAD_DEADZONE || dpadUp || dpadDown) {
                 moveDir.r = (axisV < -GAMEPAD_DEADZONE || dpadUp) ? -1 : (axisV > GAMEPAD_DEADZONE || dpadDown) ? 1 : 0;
            }

             // Bomba
             const bombButtonPressed = gp.buttons[0]?.pressed || gp.buttons[2]?.pressed;
             const buttonIndex = gp.buttons[0]?.pressed ? 0 : (gp.buttons[2]?.pressed ? 2 : -1);

             if(buttonIndex !== -1) {
                 currentGamepadButtonPressed[1][buttonIndex] = bombButtonPressed;
                 if (bombButtonPressed && !prevGamepadButtonPressed[1][buttonIndex]) {
                     placeBombAction = true;
                 }
             }
        }

        // Fallback Teclado
        if (moveDir.r === 0 && moveDir.c === 0) {
             if (keysPressed['arrowup']) moveDir.r = -1;
             else if (keysPressed['arrowdown']) moveDir.r = 1;
             if (keysPressed['arrowleft']) moveDir.c = -1;
             else if (keysPressed['arrowright']) moveDir.c = 1;
        }
        if (!placeBombAction && (keysPressed['enter'] || keysPressed['numpad0'])) {
            placeBombAction = true;
            keysPressed['enter'] = false;
            keysPressed['numpad0'] = false;
        }

         // Aplicar acciones
        if (moveDir.r !== 0 || moveDir.c !== 0) {
            movePlayer(players[1], moveDir);
        }
        if (placeBombAction) {
            placeBomb(players[1]);
        }
    }

    // Actualizar el estado previo de los botones del gamepad para el siguiente frame
    prevGamepadButtonPressed[0] = { ...currentGamepadButtonPressed[0] };
    prevGamepadButtonPressed[1] = { ...currentGamepadButtonPressed[1] };
}


function movePlayer(player, direction) {
    // No iniciar nuevo movimiento si ya se está moviendo o está muerto
    if (!player.alive || player.isMoving || (direction.r === 0 && direction.c === 0)) {
        return;
    }

    const currentR = player.gridPos.r;
    const currentC = player.gridPos.c;
    const desiredR = currentR + direction.r;
    const desiredC = currentC + direction.c;

    let targetR = currentR; // Por defecto, no se mueve
    let targetC = currentC;

    // *** MODIFICACIÓN CLAVE PARA COLISIONES CUADRADAS ***
    if (direction.r !== 0 && direction.c !== 0) {
        // --- Movimiento Diagonal ---
        // 1. Comprobar si la celda destino DIAGONAL es pasable.
        if (isCellPassable(desiredR, desiredC, player)) {
            // 2. Comprobar si AMBAS celdas adyacentes necesarias para el corte de esquina son pasables.
            //    (Si alguna es un bloque, no se puede cortar la esquina)
            const cornerCheck1Passable = isCellPassable(currentR, desiredC, player);
            const cornerCheck2Passable = isCellPassable(desiredR, currentC, player);

            if (cornerCheck1Passable && cornerCheck2Passable) {
                // Solo permite el movimiento diagonal si el destino Y las esquinas son pasables
                targetR = desiredR;
                targetC = desiredC;
            } else {
                 // No puede cortar la esquina, intentar moverse solo H o V si es posible
                 if (direction.r !== 0 && isCellPassable(desiredR, currentC, player)) {
                    targetR = desiredR; // Mover solo vertical
                    targetC = currentC;
                } else if (direction.c !== 0 && isCellPassable(currentR, desiredC, player)) {
                    targetR = currentR; // Mover solo horizontal
                    targetC = desiredC;
                }
                 // Si ni siquiera H o V son posibles desde aquí, targetR/C no cambian (no se mueve)
            }
        } else {
             // El destino diagonal directo está bloqueado. Intentar H o V solamente.
             if (direction.r !== 0 && isCellPassable(desiredR, currentC, player)) {
                targetR = desiredR; // Mover solo vertical
                targetC = currentC;
            } else if (direction.c !== 0 && isCellPassable(currentR, desiredC, player)) {
                targetR = currentR; // Mover solo horizontal
                targetC = desiredC;
            }
            // Si ni H ni V son posibles, no se mueve.
        }
    } else {
        // --- Movimiento Ortogonal (No diagonal) ---
        if (isCellPassable(desiredR, desiredC, player)) {
            targetR = desiredR;
            targetC = desiredC;
        }
    }

    // Si hubo un cambio de posición válido (targetR/C diferente de currentR/C)
    if (targetR !== currentR || targetC !== currentC) {
        const targetCellKey = `${targetR}_${targetC}`;
        const isPickingUpPowerup = !!powerups[targetCellKey];

        // Actualizar posición lógica
        player.gridPos.r = targetR;
        player.gridPos.c = targetC;

        // Calcular posición visual destino
        const targetWorldPos = gridToWorld(targetR, targetC);
        player.targetPos.set(targetWorldPos.x, player.mesh.position.y, targetWorldPos.z); // Mantener altura Y
        player.isMoving = true;

        if (isPickingUpPowerup) {
             checkPowerupPickup(player);
        }
    }
}


function updatePlayers(deltaTime) {
    players.forEach(player => {
        if (!player.alive || !player.mesh) return; // Añadido check por si mesh se eliminó

        if (player.isMoving) {
            const moveSpeed = PLAYER_SPEED_BASE * player.speedMultiplier * deltaTime;
            const currentPos = player.mesh.position;
            const targetPos = player.targetPos;

            // Movimiento lineal basado en velocidad:
             const distanceToTarget = currentPos.distanceTo(targetPos);
             if (distanceToTarget <= moveSpeed * 1.1) { // Umbral un poco mayor
                 currentPos.copy(targetPos);
                 player.isMoving = false;
             } else {
                 const moveDirection = new THREE.Vector3().subVectors(targetPos, currentPos).normalize();
                 currentPos.addScaledVector(moveDirection, moveSpeed);
             }
        }
    });
}

function placeBomb(player) {
    if (!player.alive || player.bombsActive >= player.bombCapacity) {
        return; // Muerto o sin capacidad
    }

    // Usa la posición LÓGICA actual del jugador para colocar la bomba
    const r = player.gridPos.r;
    const c = player.gridPos.c;

    // Verificar si la celda lógica ya está marcada como bomba u otra cosa impasable
    if (grid[r]?.[c] !== CELL_EMPTY && !(grid[r]?.[c] >= CELL_POWERUP_BOMB && grid[r]?.[c] <= CELL_POWERUP_SPEED)) {
         return;
    }
    // Adicional: Verificar si ya existe una bomba en el array bombs en esa celda (doble check)
    if (bombs.some(b => b.gridPos.r === r && b.gridPos.c === c)) {
         return;
    }


    console.log(`Jugador ${player.index + 1} pone bomba en ${r}, ${c}`);

    const bombGeometry = new THREE.SphereGeometry(CELL_SIZE * 0.4, 16, 16);
    const bombMesh = new THREE.Mesh(bombGeometry, materials.bomb);
    const worldPos = gridToWorld(r, c);
    bombMesh.position.copy(worldPos);
    bombMesh.position.y = worldPos.y -CELL_SIZE / 2 + CELL_SIZE * 0.4; // Elevarla un poco del suelo
    bombMesh.castShadow = true;
    scene.add(bombMesh);

    const newBomb = {
        mesh: bombMesh,
        gridPos: { r, c },
        timer: BOMB_TIMER,
        range: player.bombRange,
        owner: player,
    };

    bombs.push(newBomb);
    grid[r][c] = CELL_BOMB; // Marcar la celda lógica como ocupada por bomba AHORA
    player.bombsActive++;
    updateUI();
}

function updateBombs(deltaTime) {
    for (let i = bombs.length - 1; i >= 0; i--) {
        const bomb = bombs[i];
        bomb.timer -= deltaTime;

        // Parpadeo rápido antes de explotar
        const blinkRate = 0.1;
         if (bomb.timer < blinkRate * 5 && bomb.mesh) { // 5 parpadeos
            bomb.mesh.visible = Math.floor(bomb.timer / blinkRate) % 2 === 0;
         } else if (bomb.mesh) {
            bomb.mesh.visible = true; // Asegurarse que es visible normalmente
         }

        if (bomb.timer <= 0) {
            // Marcarla para explotar en el siguiente paso para evitar problemas de índice
             const bombToExplode = bombs.splice(i, 1)[0]; // Quitar bomba de la lista activa
             explodeBomb(bombToExplode); // Explotar inmediatamente
        }
    }
}

function explodeBomb(bomb) {
    if (!bomb) return; // Seguridad
    console.log(`Bomba explota en ${bomb.gridPos.r}, ${bomb.gridPos.c}`);

    if (bomb.mesh) scene.remove(bomb.mesh);
    if (bomb.owner) bomb.owner.bombsActive--;

    // Marcar celda original como vacía para la propagación inicial
    if (grid[bomb.gridPos.r]?.[bomb.gridPos.c] === CELL_BOMB) {
        grid[bomb.gridPos.r][bomb.gridPos.c] = CELL_EMPTY;
    }


    const explosionCells = []; // Celdas afectadas lógicamente {r, c}
    const explosionVisuals = []; // Meshes para el efecto visual
    const affectedCellsSet = new Set(); // Para evitar duplicados visuales/lógicos

    // --- Función interna para procesar la expansión ---
    const processCell = (r, c) => {
         if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return 'stop'; // Fuera del tablero

        const cellKey = `${r}_${c}`;
        const cellType = grid[r]?.[c]; // Safe access

         if (cellType === undefined) return 'stop'; // Safety check

        // Si ya creamos un visual para esta celda EN ESTA MISMA explosión,
        // no crear otro, pero permitir que la lógica continúe si es necesario
        // (ej: chain reaction pasando por una celda ya afectada por la rama principal)
        let stopPropagation = false;
        let createVisual = true;
        if (affectedCellsSet.has(cellKey)) {
             createVisual = false; // Ya tiene visual de esta explosión
        } else {
            affectedCellsSet.add(cellKey); // Marcar como procesada (para visual)
             explosionCells.push({r, c}); // Añadir a la lista para marcar grid al final
        }


        // Crear visualización de explosión (CUBO centrado) si es necesario
        if (createVisual) {
            // *** CAMBIO: Geometría de cubo completo y centrado ***
            const explosionGeo = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
            const explosionMaterial = materials.explosion.clone(); // Clonar para opacidad individual
            explosionMaterial.opacity = 0.85; // Opacidad inicial slightly higher?
            const expMesh = new THREE.Mesh(explosionGeo, explosionMaterial);
            // *** CAMBIO: Posicionar en el centro Y=0 de la celda ***
            expMesh.position.copy(gridToWorld(r, c));
            scene.add(expMesh);
            explosionVisuals.push(expMesh);
        }

        // Lógica de propagación y efectos (se ejecuta incluso si el visual ya existía)
        if (cellType === CELL_INDESTRUCTIBLE) {
            stopPropagation = true; // La explosión (propagación) se detiene aquí
        } else if (cellType === CELL_DESTRUCTIBLE) {
            if (createVisual) { // Solo destruir si es la primera vez que esta explosión llega aquí
                 destroyBlock(r, c); // Destruye el bloque (puede spawnear powerup)
            }
            stopPropagation = true; // La explosión (propagación) se detiene aquí *después* de destruir
        } else if (cellType >= CELL_POWERUP_BOMB && cellType <= CELL_POWERUP_SPEED) {
             if (createVisual) { // Solo destruir powerup si es la primera vez
                removePowerup(r,c);
             }
             // La explosión CONTINÚA a través de la celda del powerup destruido
        } else if (cellType === CELL_BOMB) {
            // Reacción en cadena!
            const chainedBombIndex = bombs.findIndex(b => b.gridPos.r === r && b.gridPos.c === c);
            if (chainedBombIndex !== -1) {
                const chainedBomb = bombs.splice(chainedBombIndex, 1)[0];
                // Explotar inmediatamente
                 explodeBomb(chainedBomb);
            }
             // La explosión original CONTINÚA a través de esta celda
        }

        // Devolver 'stop' o 'continue' basado SOLO en si la propagación debe detenerse
        return stopPropagation ? 'stop' : 'continue';
    }; // Fin de processCell

    // --- Propagación de la explosión ---
    // Procesar celda central
    processCell(bomb.gridPos.r, bomb.gridPos.c);

    // Expandir en 4 direcciones
    const directions = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
    for (const dir of directions) {
        for (let i = 1; i <= bomb.range; i++) {
            const r = bomb.gridPos.r + dir.r * i;
            const c = bomb.gridPos.c + dir.c * i;
            const result = processCell(r, c); // Llama a la función interna
            if (result === 'stop') {
                break; // Detener expansión en esta dirección específica
            }
        }
    }

     // Registrar la explosión activa (con sus visuales y celdas lógicas)
     const explosionData = { cells: explosionCells, timer: EXPLOSION_DURATION, visuals: explosionVisuals };
     explosions.push(explosionData);

     // Marcar TODAS las celdas lógicas afectadas como CELL_EXPLOSION AHORA
     explosionCells.forEach(cell => {
          if (grid[cell.r]?.[cell.c] !== CELL_INDESTRUCTIBLE) { // Check row exists and not indestructible
            grid[cell.r][cell.c] = CELL_EXPLOSION;
          }
     });

    updateUI(); // Actualizar UI
}

function updateExplosions(deltaTime) {
     for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.timer -= deltaTime;

        if (exp.timer <= 0) {
            // Limpiar visualización y estado lógico de la explosión
             exp.visuals.forEach(v => { if(v && v.parent) scene.remove(v); }); // Safe remove
             exp.cells.forEach(cell => {
                 // Solo limpiar si *sigue* siendo una celda de explosión
                 if (grid[cell.r]?.[cell.c] === CELL_EXPLOSION) { // Check row exists
                     const cellKey = `${cell.r}_${cell.c}`;
                     if (powerups[cellKey]) {
                         grid[cell.r][cell.c] = powerups[cellKey].type; // Restaurar powerup si existe
                     } else {
                         grid[cell.r][cell.c] = CELL_EMPTY; // Si no, vacía
                     }
                 }
             });
            explosions.splice(i, 1); // Quitar de la lista de explosiones activas
        } else {
            // Hacer que la opacidad disminuya (fade out)
            const opacity = Math.max(0, (exp.timer / EXPLOSION_DURATION) * 0.85); // Max opacity base
             exp.visuals.forEach(v => {
                 if (v?.material instanceof THREE.Material && v.material.transparent) {
                    v.material.opacity = opacity;
                 }
             });
        }
    }
}


function destroyBlock(r, c) {
    const cellKey = `${r}_${c}`;
    if (blocks[cellKey]) {
        // console.log(`Destroying block at ${r}, ${c}`);
        if(blocks[cellKey].parent) scene.remove(blocks[cellKey]);
        delete blocks[cellKey];
        // grid[r][c] ahora es manejado por la explosión que lo llamó

        if (Math.random() < POWERUP_CHANCE) {
            spawnPowerup(r, c);
        }
    }
}

function spawnPowerup(r, c) {
     const cellKey = `${r}_${c}`;
     if (powerups[cellKey]) {
         return; // Ya existe
     }

    const powerupTypeRoll = Math.random();
    let type;
    let material;
    // Geometría de CUBO
    let geometry = new THREE.BoxGeometry(CELL_SIZE * 0.6, CELL_SIZE * 0.6, CELL_SIZE * 0.6);

    if (powerupTypeRoll < 0.4) { type = CELL_POWERUP_RANGE; material = materials.powerup_range;}
    else if (powerupTypeRoll < 0.7) { type = CELL_POWERUP_BOMB; material = materials.powerup_bomb; }
    else { type = CELL_POWERUP_SPEED; material = materials.powerup_speed; }

    if (!material) return;

    // console.log(`Spawn powerup tipo ${type} en ${r}, ${c}`);

    const powerupMesh = new THREE.Mesh(geometry, material);
    const worldPos = gridToWorld(r, c);
    powerupMesh.position.copy(worldPos);
    // Posición Y para un cubo centrado
    powerupMesh.position.y = worldPos.y; // El centro Y=0 ya está bien
    powerupMesh.castShadow = true;
    scene.add(powerupMesh);

    powerups[cellKey] = { mesh: powerupMesh, type: type };

    // Marcar grid lógico si no está explotando
    if (grid[r]?.[c] !== CELL_EXPLOSION) {
         grid[r][c] = type;
    }
}

function checkPowerupPickup(player) {
    const r = player.gridPos.r;
    const c = player.gridPos.c;
    const cellKey = `${r}_${c}`;

    if (powerups[cellKey]) { // Si el objeto powerup existe...
        const powerup = powerups[cellKey];
        console.log(`Jugador ${player.index + 1} recoge powerup tipo ${powerup.type} en ${r},${c}`);

        switch (powerup.type) {
            case CELL_POWERUP_BOMB: player.bombCapacity++; break;
            case CELL_POWERUP_RANGE: player.bombRange++; break;
            case CELL_POWERUP_SPEED: player.speedMultiplier = Math.min(3.0, player.speedMultiplier + 0.25); break;
        }
        removePowerup(r, c); // Eliminar ahora
        updateUI();
    }
}

function removePowerup(r, c) {
     const cellKey = `${r}_${c}`;
     if (powerups[cellKey]) {
        const powerupData = powerups[cellKey];
        if (powerupData.mesh && powerupData.mesh.parent) {
            scene.remove(powerupData.mesh);
        }
        delete powerups[cellKey];

        // Marcar celda como vacía SOLO si no está actualmente en explosión
        if (grid[r]?.[c] !== CELL_EXPLOSION) {
            grid[r][c] = CELL_EMPTY;
        }
     }
}


function checkCollisions() {
    // Comprobar colisión JUGADOR vs EXPLOSION
    players.forEach(player => {
        if (!player.alive) return;

        const r = player.gridPos.r;
        const c = player.gridPos.c;

        if (grid[r]?.[c] === CELL_EXPLOSION) {
            killPlayer(player);
        }
    });
}

function killPlayer(player) {
    if (!player.alive) return; // Ya está muerto
    player.alive = false;
    if (player.mesh) {
        scene.remove(player.mesh);
        player.mesh = null;
    }
    console.log(`Jugador ${player.index + 1} ha muerto.`);
    updateUI();
}

function checkWinCondition() {
    if (!gameRunning) return;

    const alivePlayers = players.filter(p => p.alive);

    if (alivePlayers.length <= 1) {
        gameRunning = false;

        let message = "";
        if (alivePlayers.length === 1) {
            message = `¡Jugador ${alivePlayers[0].index + 1} Gana!`;
        } else {
            message = "¡Empate!";
        }

        console.log("Game Over:", message);
        ui.messageText.textContent = message;
        ui.startButton.textContent = "Jugar de Nuevo";
        ui.startButton.onclick = resetGame;
        ui.messageOverlay.style.display = 'flex';
    }
}

// --- Utilidades ---

function gridToWorld(r, c) {
    const worldX = (c - (GRID_SIZE - 1) / 2) * CELL_SIZE;
    const worldZ = (r - (GRID_SIZE - 1) / 2) * CELL_SIZE;
    // *** Centro Y de la celda está en 0 ***
    const worldY = 0;
    return new THREE.Vector3(worldX, worldY, worldZ);
}

function worldToGrid(worldPos) {
    const c = Math.round(worldPos.x / CELL_SIZE + (GRID_SIZE - 1) / 2);
    const r = Math.round(worldPos.z / CELL_SIZE + (GRID_SIZE - 1) / 2);
    return {
        r: Math.max(0, Math.min(GRID_SIZE - 1, r)),
        c: Math.max(0, Math.min(GRID_SIZE - 1, c)),
    };
}

function isCellPassable(r, c, player) {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;

    const cellType = grid[r]?.[c];
    if (cellType === undefined) return false;

    // Bloques y bombas bloquean
    if (cellType === CELL_INDESTRUCTIBLE || cellType === CELL_DESTRUCTIBLE || cellType === CELL_BOMB) {
        return false;
    }

    // Pasable si es EMPTY, EXPLOSION, o POWERUP
    return true;
}

function updateUI() {
    // Actualizar UI para Jugador 1
    if (players.length > 0 && players[0]) {
        const p1 = players[0];
        ui.p1Bombs.textContent = p1.alive ? p1.bombCapacity - p1.bombsActive : 'X';
        ui.p1BombCapacity.textContent = p1.alive ? p1.bombCapacity : '-';
        ui.p1Range.textContent = p1.alive ? p1.bombRange : '-';
        ui.p1Speed.textContent = p1.alive ? p1.speedMultiplier.toFixed(1) : '-';
        ui.p1Info.classList.toggle('dead', !p1.alive);
    } else {
        ui.p1Bombs.textContent = '-';
        ui.p1BombCapacity.textContent = '-';
        ui.p1Range.textContent = '-';
        ui.p1Speed.textContent = '-';
        if (ui.p1Info) ui.p1Info.classList.remove('dead');
    }

     // Actualizar UI para Jugador 2
     if (players.length > 1 && players[1]) {
        const p2 = players[1];
        ui.p2Bombs.textContent = p2.alive ? p2.bombCapacity - p2.bombsActive : 'X';
        ui.p2BombCapacity.textContent = p2.alive ? p2.bombCapacity : '-';
        ui.p2Range.textContent = p2.alive ? p2.bombRange : '-';
        ui.p2Speed.textContent = p2.alive ? p2.speedMultiplier.toFixed(1) : '-';
        ui.p2Info.classList.toggle('dead', !p2.alive);
    } else {
        ui.p2Bombs.textContent = '-';
        ui.p2BombCapacity.textContent = '-';
        ui.p2Range.textContent = '-';
        ui.p2Speed.textContent = '-';
        if (ui.p2Info) ui.p2Info.classList.remove('dead');
    }
}

// --- Manejadores de Eventos ---

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height);

    // Actualizar cámaras para split screen
    cameras.forEach(cam => {
        if (cam) {
            cam.aspect = (width / 2) / height; // Aspect ratio para media pantalla
            cam.updateProjectionMatrix();
        }
    });

    // Los viewports/scissors se actualizan en cada frame en animate()
}

function onKeyDown(event) {
    const key = event.key.toLowerCase();
    keysPressed[key] = true;

    // Prevenir scroll con flechas/espacio/enter SOLO si el juego está activo
     if (gameRunning && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter', 'numpad0'].includes(key)) {
         event.preventDefault();
     }
}

function onKeyUp(event) {
    keysPressed[event.key.toLowerCase()] = false;
}

function updateCameraPositions() {
     // Offset relativo a la posición del JUGADOR
     const cameraOffset = new THREE.Vector3(0, CELL_SIZE * 6, CELL_SIZE * 4.5); // Un poco más arriba y atrás/cerca
     const lookAtOffset = new THREE.Vector3(0, -CELL_SIZE * 1.5, -CELL_SIZE * 3); // Mirar un poco hacia abajo y adelante del jugador

    for (let i = 0; i < cameras.length; i++) {
        const player = players[i];
        const camera = cameras[i];

        let targetPosition = null; // Dónde debe estar la cámara
        let targetLookAt = null;   // Dónde debe mirar la cámara

        if (player?.alive && player.mesh) { // Jugador vivo
             targetPosition = player.mesh.position.clone().add(cameraOffset);
             targetLookAt = player.mesh.position.clone().add(lookAtOffset);
        } else if (player && !player.alive && player.gridPos) { // Jugador muerto, usar última posición
             const lastWorldPos = gridToWorld(player.gridPos.r, player.gridPos.c);
             targetPosition = lastWorldPos.clone().add(cameraOffset);
             targetLookAt = lastWorldPos.clone().add(lookAtOffset);
        } else if (camera) {
             targetPosition = camera.position;
             if (!camera.currentLookAt) camera.currentLookAt = new THREE.Vector3(0, -CELL_SIZE, 0);
             targetLookAt = camera.currentLookAt;
        } else {
            continue; // No camera to update
        }


        if (camera) {
             const lerpAlpha = 0.08;
             camera.position.lerp(targetPosition, lerpAlpha);

             if (!camera.currentLookAt) camera.currentLookAt = targetLookAt.clone();
             camera.currentLookAt.lerp(targetLookAt, lerpAlpha);
             camera.lookAt(camera.currentLookAt);
        }
    }
}


// --- Iniciar Todo ---
init();