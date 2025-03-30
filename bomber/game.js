import * as THREE from 'three';

// --- Constantes y Configuración ---
const GRID_SIZE = 15; // Tamaño del tablero (impar es mejor para patrones)
const CELL_SIZE = 4; // Tamaño de cada celda en unidades 3D
const PLAYER_SPEED_BASE = 8.0; // Unidades por segundo
const BOMB_TIMER = 2.5; // Segundos para explotar
const EXPLOSION_DURATION = 0.5; // Segundos que dura la visualización de la explosión
const DESTRUCTIBLE_CHANCE = 0.7; // Probabilidad de que una celda vacía sea destructible
const POWERUP_CHANCE = 0.25; // Probabilidad de que un bloque destruido deje un power-up

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
    const material = (type === CELL_INDESTRUCTIBLE) ? materials.indestructible : materials.destructible;
    if (!material) {
        console.error(`Material not found for block type ${type} at ${r},${c}. Using fallback.`);
        material = new THREE.MeshStandardMaterial({ color: 0xff00ff }); // Magenta fallback
    }
    const block = new THREE.Mesh(blockGeometry, material);
    block.position.copy(gridToWorld(r, c));
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
    // Ajustar altura cápsula (centro de la cápsula = worldY + mitad_altura_cilindro)
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
         if(exp.visuals) exp.visuals.forEach(v => { if(v) scene.remove(v); });
     });
     explosions = [];
     Object.values(powerups).forEach(p => { if (p.mesh) scene.remove(p.mesh); });
     powerups = {};
     Object.values(blocks).forEach(b => { if (b) scene.remove(b); }); // Quitar bloques viejos
     blocks = {};
     players.forEach(p => { if (p.mesh) scene.remove(p.mesh); }); // Quitar jugadores viejos
     players = [];
     grid = []; // Muy importante resetear el grid lógico

     // 3. Limpiar estado de input
     keysPressed = {};

     // 4. Recrear el nivel y los jugadores para la nueva partida
     console.log("Recreating level and players...");
     createLevel();
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
        handleInput(deltaTime);
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

function handleInput(deltaTime) {
    // Jugador 1 (WASD + Space)
    if (players[0]?.alive) {
        let moveDir = { r: 0, c: 0 };
        if (keysPressed['w']) moveDir.r -= 1;
        if (keysPressed['s']) moveDir.r += 1;
        if (keysPressed['a']) moveDir.c -= 1;
        if (keysPressed['d']) moveDir.c += 1;
        // Solo intentar mover si hay input
        if (moveDir.r !== 0 || moveDir.c !== 0) {
             movePlayer(players[0], moveDir);
        }

        if (keysPressed[' ']) { // Barra espaciadora
            placeBomb(players[0]);
            keysPressed[' '] = false; // Consumir la pulsación para evitar bombas múltiples
        }
    }

    // Jugador 2 (Flechas + Enter/Numpad0)
    if (players[1]?.alive) {
        let moveDir = { r: 0, c: 0 };
        if (keysPressed['arrowup']) moveDir.r -= 1;
        if (keysPressed['arrowdown']) moveDir.r += 1;
        if (keysPressed['arrowleft']) moveDir.c -= 1;
        if (keysPressed['arrowright']) moveDir.c += 1;
         // Solo intentar mover si hay input
        if (moveDir.r !== 0 || moveDir.c !== 0) {
            movePlayer(players[1], moveDir);
        }

        if (keysPressed['enter'] || keysPressed['numpad0']) {
            placeBomb(players[1]);
            keysPressed['enter'] = false; // Consumir pulsación
            keysPressed['numpad0'] = false; // Consumir pulsación
        }
    }
}

function movePlayer(player, direction) {
    // No iniciar nuevo movimiento si ya se está moviendo o está muerto
    if (!player.alive || player.isMoving || (direction.r === 0 && direction.c === 0)) {
        return;
    }

    const currentR = player.gridPos.r;
    const currentC = player.gridPos.c;
    let targetR = currentR + direction.r;
    let targetC = currentC + direction.c;

    // Lógica para "deslizar" en diagonales contra paredes
    if (direction.r !== 0 && direction.c !== 0) {
        let canMoveHorizontally = isCellPassable(currentR, targetC, player);
        let canMoveVertically = isCellPassable(targetR, currentC, player);

        if (canMoveHorizontally && canMoveVertically) {
            // Si ambas direcciones parciales son válidas, comprobar la diagonal final
            if (!isCellPassable(targetR, targetC, player)) {
                // Si la diagonal está bloqueada, intentar moverse solo H o V
                if (isCellPassable(currentR, targetC, player)) { // Priorizar H?
                    targetR = currentR; // Mover solo horizontal
                } else if (isCellPassable(targetR, currentC, player)){
                    targetC = currentC; // Mover solo vertical
                } else {
                    return; // No puede moverse ni H ni V desde aquí en esa dirección
                }
            }
            // Si la diagonal es pasable, targetR y targetC ya son correctos
        } else if (canMoveHorizontally) {
            targetR = currentR; // Mover solo horizontalmente
        } else if (canMoveVertically) {
            targetC = currentC; // Mover solo verticalmente
        } else {
            return; // Ambas direcciones bloqueadas, no moverse
        }
    }
    // Si no es diagonal, targetR y targetC se calcularon arriba

    // Chequeo final para la celda destino (sea original o ajustada por deslizamiento)
    if (isCellPassable(targetR, targetC, player)) {
        player.gridPos.r = targetR;
        player.gridPos.c = targetC;
        const targetWorldPos = gridToWorld(targetR, targetC);
        player.targetPos.set(targetWorldPos.x, player.mesh.position.y, targetWorldPos.z); // Mantener altura Y
        player.isMoving = true;

        // Comprobar si pisa un power-up al *entrar* en la celda (lógico)
        checkPowerupPickup(player); // Se recogerá al llegar visualmente? O al entrar lógicamente? Pongámoslo aquí.
    }
}


function updatePlayers(deltaTime) {
    players.forEach(player => {
        if (!player.alive) return;

        if (player.isMoving) {
            const moveSpeed = PLAYER_SPEED_BASE * player.speedMultiplier * deltaTime;
            const distanceToTarget = player.mesh.position.distanceTo(player.targetPos);

            if (distanceToTarget <= moveSpeed * 1.1) { // Umbral un poco mayor para evitar quedarse corto
                // Llegó al destino (o muy cerca)
                player.mesh.position.copy(player.targetPos);
                player.isMoving = false;
                // checkPowerupPickup(player); // Opcional: Recoger al *terminar* el movimiento
            } else {
                // Moverse hacia el destino
                const moveDirection = new THREE.Vector3().subVectors(player.targetPos, player.mesh.position).normalize();
                player.mesh.position.addScaledVector(moveDirection, moveSpeed);
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

    // Verificar si la celda lógica ya está marcada como bomba
    if (grid[r][c] === CELL_BOMB) {
        // console.log(`Intento de poner bomba en (${r},${c}) fallido (Ya hay CELL_BOMB)`);
        return;
    }
    // Adicional: Verificar si ya existe una bomba en el array bombs en esa celda (doble check)
    if (bombs.some(b => b.gridPos.r === r && b.gridPos.c === c)) {
         // console.log(`Intento de poner bomba en (${r},${c}) fallido (Ya existe en array bombs)`);
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

    // IMPORTANTE: La celda donde estaba la bomba ahora forma parte de la explosión,
    // pero lógicamente debe considerarse 'vacía' para que la explosión se propague a través de ella.
    // Sin embargo, debemos marcarla como CELL_EXPLOSION al final.
    // -> Primero la marcamos vacía para la propagación.
    grid[bomb.gridPos.r][bomb.gridPos.c] = CELL_EMPTY;


    const explosionCells = []; // Celdas afectadas lógicamente {r, c}
    const explosionVisuals = []; // Meshes para el efecto visual
    const affectedCellsSet = new Set(); // Para evitar duplicados visuales/lógicos

    // Función para procesar una celda durante la expansión de la explosión
    const processCell = (r, c) => {
         if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return 'stop'; // Fuera del tablero

        const cellKey = `${r}_${c}`;
        // Si ya procesamos esta celda en ESTA explosión, no hacer nada más
        if (affectedCellsSet.has(cellKey)) return 'continue'; // O 'stop'? Continue seems better for visuals

        const cellType = grid[r][c];

        // Añadir celda a la lista de afectadas y al set
        explosionCells.push({r, c});
        affectedCellsSet.add(cellKey);

        // Crear visualización de explosión (cubo plano)
        const explosionGeo = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE*0.2, CELL_SIZE); // Más plano
        const expMesh = new THREE.Mesh(explosionGeo, materials.explosion.clone()); // CLONE material for opacity changes
        expMesh.position.copy(gridToWorld(r, c));
        expMesh.position.y = -CELL_SIZE / 2 + CELL_SIZE*0.1; // Centrar visualmente
        scene.add(expMesh);
        explosionVisuals.push(expMesh);

        // Lógica de propagación
        if (cellType === CELL_INDESTRUCTIBLE) {
            return 'stop'; // La explosión se detiene aquí
        }

        if (cellType === CELL_DESTRUCTIBLE) {
            destroyBlock(r, c); // Destruye el bloque
            return 'stop'; // La explosión destruye el bloque y se detiene en esa dirección
        }

        if (cellType === CELL_BOMB) {
            // Reacción en cadena! Encontrar la bomba en esta celda y explotarla inmediatamente
             // Busca en el array 'bombs' que aún no han sido procesadas en este frame
            const chainedBombIndex = bombs.findIndex(b => b.gridPos.r === r && b.gridPos.c === c);
            if (chainedBombIndex !== -1) {
                const chainedBomb = bombs.splice(chainedBombIndex, 1)[0]; // Quitarla para evitar doble explosión
                // Poner timer a 0 o un valor muy pequeño para asegurar que explote en el *siguiente* ciclo de updateBombs si es necesario,
                // o explotarla directamente si no causa problemas de recursión/índice.
                // Explotarla directamente es más simple si se maneja bien:
                explodeBomb(chainedBomb);
                // Nota: La explosión original CONTINÚA a través de la celda de la bomba encadenada.
            }
            // Si no se encontró (ya explotó en este frame), la explosión pasa.
        }

        // Si es un powerup, la explosión lo destruye
        if (cellType >= CELL_POWERUP_BOMB && cellType <= CELL_POWERUP_SPEED) {
             if (powerups[cellKey]) {
                removePowerup(r,c);
             }
        }

        // Colisión con jugador se maneja en checkCollisions leyendo el grid

        return 'continue'; // La explosión continúa propagándose
    };

    // Procesar celda central (la de la bomba original)
    processCell(bomb.gridPos.r, bomb.gridPos.c);

    // Expandir en 4 direcciones
    const directions = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }];
    for (const dir of directions) {
        for (let i = 1; i <= bomb.range; i++) {
            const r = bomb.gridPos.r + dir.r * i;
            const c = bomb.gridPos.c + dir.c * i;
            const result = processCell(r, c);
            if (result === 'stop') {
                break; // Detener expansión en esta dirección
            }
        }
    }

     // Registrar la explosión activa (con sus visuales y celdas lógicas)
     const explosionData = { cells: explosionCells, timer: EXPLOSION_DURATION, visuals: explosionVisuals };
     explosions.push(explosionData);

     // Marcar TODAS las celdas afectadas como peligrosas (CELL_EXPLOSION) en el grid lógico AHORA
     explosionCells.forEach(cell => {
          // Solo marcar si la celda no es indestructible (que no debería estar en la lista, pero por si acaso)
          if (grid[cell.r][cell.c] !== CELL_INDESTRUCTIBLE) {
            grid[cell.r][cell.c] = CELL_EXPLOSION;
          }
     });

    updateUI(); // Actualizar UI por si cambió el contador de bombas del owner
}

function updateExplosions(deltaTime) {
     for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.timer -= deltaTime;

        if (exp.timer <= 0) {
            // Limpiar visualización y estado lógico de la explosión
             exp.visuals.forEach(v => { if(v) scene.remove(v); });
             exp.cells.forEach(cell => {
                 // Solo limpiar si *sigue* siendo una celda de explosión
                 // (podría haber una bomba nueva, otro powerup, etc.)
                 if (grid[cell.r]?.[cell.c] === CELL_EXPLOSION) { // Check if row exists
                     grid[cell.r][cell.c] = CELL_EMPTY;
                 }
             });
            explosions.splice(i, 1); // Quitar de la lista de explosiones activas
        } else {
            // Hacer que la opacidad disminuya (fade out)
            const opacity = Math.max(0, exp.timer / EXPLOSION_DURATION);
             exp.visuals.forEach(v => {
                  // Asegurarse que el material es único o clonado para esta explosión
                 if (v?.material.opacity !== undefined) {
                    v.material.opacity = opacity * 0.8; // *0.8 para no ser totalmente opaco al inicio
                 }
             });
        }
    }
}


function destroyBlock(r, c) {
    console.log(`Bloque destruido en ${r}, ${c}`);
    const cellKey = `${r}_${c}`;
    if (blocks[cellKey]) {
        scene.remove(blocks[cellKey]);
        delete blocks[cellKey];
        // IMPORTANTE: No cambiar grid[r][c] aquí. La explosión lo marcará como CELL_EXPLOSION.
        // Cuando la explosión termine, se limpiará a CELL_EMPTY.
        // grid[r][c] = CELL_EMPTY; // <-- NO HACER ESTO AQUÍ

        // Posibilidad de dejar un power-up (se creará 'debajo' de la explosión temporalmente)
        if (Math.random() < POWERUP_CHANCE) {
            // Spawn powerup ANTES de que la celda se marque como CELL_EXPLOSION
            spawnPowerup(r, c);
        }
    } else {
         console.warn(`Intento de destruir bloque en ${r},${c}, pero no se encontró en 'blocks'. Grid state: ${grid[r]?.[c]}`);
         // Aún así, permitir que la explosión marque la celda como CELL_EXPLOSION
    }
}

function spawnPowerup(r, c) {
    // Comprobar si la celda está lógicamente vacía ANTES de spawnear
    // (Aunque destroyBlock fue llamado, la explosión aún no marcó la celda)
    if (grid[r][c] !== CELL_EMPTY && grid[r][c] !== CELL_DESTRUCTIBLE) {
        // console.log(`No se puede spawnear powerup en ${r},${c}, la celda no está vacía/destructible (estado: ${grid[r][c]})`);
        return; // Evitar spawn sobre bombas, otras explosiones, etc.
    }

    const powerupTypeRoll = Math.random();
    let type;
    let material;
    let geometry = new THREE.BoxGeometry(CELL_SIZE * 0.6, CELL_SIZE * 0.2, CELL_SIZE * 0.6); // Más plano

    if (powerupTypeRoll < 0.4) { // 40% Rango
        type = CELL_POWERUP_RANGE;
        material = materials.powerup_range;
    } else if (powerupTypeRoll < 0.7) { // 30% Bomba extra
        type = CELL_POWERUP_BOMB;
        material = materials.powerup_bomb;
    } else { // 30% Velocidad
        type = CELL_POWERUP_SPEED;
        material = materials.powerup_speed;
    }

    if (!material) {
         console.error(`Material para powerup tipo ${type} no encontrado. No se spawneará.`);
         return;
    }

    console.log(`Spawn powerup tipo ${type} en ${r}, ${c}`);

    const powerupMesh = new THREE.Mesh(geometry, material);
    const worldPos = gridToWorld(r, c);
    powerupMesh.position.copy(worldPos);
    powerupMesh.position.y = worldPos.y -CELL_SIZE / 2 + CELL_SIZE * 0.1; // A nivel del suelo plano
    powerupMesh.castShadow = true; // Los powerups también arrojan sombra
    scene.add(powerupMesh);

    const cellKey = `${r}_${c}`;
    powerups[cellKey] = { mesh: powerupMesh, type: type };
    // Marcar la celda lógica con el tipo de powerup.
    // Esto sobreescribirá CELL_EMPTY o CELL_DESTRUCTIBLE.
    // Será sobreescrito temporalmente por CELL_EXPLOSION si está en una explosión.
    grid[r][c] = type;
}

function checkPowerupPickup(player) {
    // Comprobar la celda lógica a la que el jugador ACABA DE ENTRAR (lógicamente)
    const r = player.gridPos.r;
    const c = player.gridPos.c;
    const cellKey = `${r}_${c}`;
    const cellType = grid[r][c];

    if (cellType >= CELL_POWERUP_BOMB && cellType <= CELL_POWERUP_SPEED) {
        if (powerups[cellKey]) {
            const powerup = powerups[cellKey];
            console.log(`Jugador ${player.index + 1} recoge powerup tipo ${powerup.type} en ${r},${c}`);

            // Aplicar efecto
            switch (powerup.type) {
                case CELL_POWERUP_BOMB:
                    player.bombCapacity++;
                    break;
                case CELL_POWERUP_RANGE:
                    player.bombRange++;
                    break;
                case CELL_POWERUP_SPEED:
                    player.speedMultiplier = Math.min(3.0, player.speedMultiplier + 0.25); // Aumentar velocidad con límite
                    break;
            }

            removePowerup(r, c); // Quitar el powerup del juego (visual y lógico)
            updateUI();
        } else {
             // Esto podría pasar si la explosión destruyó el powerup justo antes
             // console.log(`Jugador ${player.index + 1} entró en celda ${r},${c} con tipo powerup ${cellType}, pero no hay objeto powerup.`);
             // Asegurarse que la celda quede vacía si el objeto no está
              if (grid[r][c] === cellType) { // Solo si no ha cambiado mientras tanto
                 grid[r][c] = CELL_EMPTY;
             }
        }
    }
}

function removePowerup(r, c) {
     const cellKey = `${r}_${c}`;
     if (powerups[cellKey]) {
        if (powerups[cellKey].mesh) scene.remove(powerups[cellKey].mesh);
        delete powerups[cellKey];
        // Solo marcar celda como vacía si actualmente contiene este powerup
        // (Podría haber sido sobreescrita por una bomba o explosión)
        const currentCellType = grid[r]?.[c];
        if(currentCellType >= CELL_POWERUP_BOMB && currentCellType <= CELL_POWERUP_SPEED) {
            grid[r][c] = CELL_EMPTY;
        }
        // console.log(`Powerup removido de ${r},${c}. Celda ahora es ${grid[r][c]}`);
     }
}


function checkCollisions() {
    // Comprobar colisión JUGADOR vs EXPLOSION
    players.forEach(player => {
        if (!player.alive) return;

        // Usar la posición LÓGICA actual del jugador
        const r = player.gridPos.r;
        const c = player.gridPos.c;

        // Si la celda lógica está marcada como explosión, el jugador muere
        if (grid[r]?.[c] === CELL_EXPLOSION) { // Check row exists
            console.log(`Jugador ${player.index + 1} en (${r}, ${c}) alcanzado por explosión!`);
            killPlayer(player);
        }
    });
}

function killPlayer(player) {
    if (!player.alive) return; // Ya está muerto
    player.alive = false;
    if (player.mesh) {
        scene.remove(player.mesh); // Quitar mesh del jugador
        player.mesh = null; // Evitar intentar acceder a él después
    }
    console.log(`Jugador ${player.index + 1} ha muerto.`);
    // La UI se actualizará implícitamente o en checkWinCondition
    // checkWinCondition será llamado en el mismo frame o el siguiente y detectará la muerte
}

function checkWinCondition() {
    // Solo comprobar si el juego estaba corriendo
    if (!gameRunning) return;

    const alivePlayers = players.filter(p => p.alive);

    // Si queda 1 o 0 jugadores vivos, el juego termina
    if (alivePlayers.length <= 1) {
        gameRunning = false; // ¡IMPORTANTE: Detener la lógica del juego AQUI!
        // No detener el clock, animate debe seguir corriendo para mostrar el mensaje

        let message = "";
        if (alivePlayers.length === 1) {
            message = `¡Jugador ${alivePlayers[0].index + 1} Gana!`;
        } else {
            message = "¡Empate!"; // Ambos murieron en el mismo frame
        }

        console.log("Game Over:", message);
        ui.messageText.textContent = message;
        ui.startButton.textContent = "Jugar de Nuevo";
        // Asignar resetGame al botón para la próxima vez
        ui.startButton.onclick = resetGame; // <--- ESTO ES CLAVE PARA REINICIAR
        ui.messageOverlay.style.display = 'flex'; // Mostrar el mensaje y el botón
    }
}

// --- Utilidades ---

function gridToWorld(r, c) {
    // Centra el tablero en el origen (0,0,0)
    const worldX = (c - (GRID_SIZE - 1) / 2) * CELL_SIZE;
    const worldZ = (r - (GRID_SIZE - 1) / 2) * CELL_SIZE;
    const worldY = 0; // Centro Y de la celda lógica
    return new THREE.Vector3(worldX, worldY, worldZ);
}

function worldToGrid(worldPos) {
    const c = Math.round(worldPos.x / CELL_SIZE + (GRID_SIZE - 1) / 2);
    const r = Math.round(worldPos.z / CELL_SIZE + (GRID_SIZE - 1) / 2);
    // Asegurarse que esté dentro de los límites
    return {
        r: Math.max(0, Math.min(GRID_SIZE - 1, r)),
        c: Math.max(0, Math.min(GRID_SIZE - 1, c)),
    };
}

function isCellPassable(r, c, player) {
    // Comprobar límites del tablero
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
        // console.log(`(${r},${c}) es fuera de límites`);
        return false;
    }

    // Comprobar tipo de celda lógica
    const cellType = grid[r]?.[c]; // Safely access grid cell

     if (cellType === undefined) {
         console.warn(`Grid cell (${r},${c}) is undefined!`);
         return false; // Consider undefined as impassable
     }

    // Bloques fijos y destructibles bloquean el paso
    if (cellType === CELL_INDESTRUCTIBLE || cellType === CELL_DESTRUCTIBLE) {
         // console.log(`(${r},${c}) es bloque (tipo ${cellType})`);
        return false;
    }

    // Bombas bloquean el paso, EXCEPTO si es la bomba que el jugador ACABA de poner y está intentando salir de esa celda
    if (cellType === CELL_BOMB) {
         // Excepción: ¿Está el jugador *actualmente* en la celda (r,c)?
         // (Esta función se llama para la celda *destino*, no la actual)
         // Necesitamos saber si la celda (r,c) contiene una bomba y si el jugador *no* está intentando salir de ella.
         const isPlayerCurrentlyInTargetCell = (player.gridPos.r === r && player.gridPos.c === c);

         if (!isPlayerCurrentlyInTargetCell) {
             // console.log(`(${r},${c}) es bomba y jugador no está saliendo de ella`);
             return false; // Bloquea si intenta entrar en una celda con bomba
         }
         // Si el jugador está intentando moverse *dentro* de la celda donde está (r=player.gridPos.r, c=player.gridPos.c)
         // y hay una bomba, SÍ puede salir. ¡Esta condición raramente se dará aquí!
         // La comprobación principal es simplemente: ¿Hay una bomba en la celda *destino*? Si sí, no pases.
         // La lógica original de permitir salir de la bomba recién puesta estaba implícita porque
         // el check se hace antes de moverse, y la celda destino no tenía bomba aún.
         // --> Mantenemos: Si la celda DESTINO tiene bomba, no es pasable.
         // console.log(`(${r},${c}) es bomba`);
         // return false; // Simplificado: Las bombas siempre bloquean la entrada.

         // Revisión Lógica "Salir de tu bomba":
         // Cuando pones una bomba, estás en la celda (r,c). grid[r][c] se vuelve CELL_BOMB.
         // Si intentas moverte a (r+1, c), isCellPassable(r+1, c) se evalúa. Eso está bien.
         // Si intentas moverte *otra vez* a (r,c) (donde está la bomba), isCellPassable(r,c) -> CELL_BOMB -> return false. Correcto.
         // El problema sería si te quedas quieto y luego intentas salir.
         // Necesitamos permitir salir si player.gridPos === la celda con bomba que es tuya? No, eso es muy complejo.
         // Regla simple: No puedes entrar a una celda que TENGA una bomba. Punto.
         return false;

    }

    // Comprobar colisión con otros jugadores (opcional, puede ser molesto)
    /*
    for (const otherPlayer of players) {
        if (otherPlayer !== player && otherPlayer.alive) {
            // Comprobar si el otro jugador está LÓGICAMENTE en la celda destino
            if (otherPlayer.gridPos.r === r && otherPlayer.gridPos.c === c) {
                 // console.log(`(${r},${c}) ocupada por otro jugador`);
                 return false;
            }
            // Podría necesitarse una comprobación más compleja si los jugadores se mueven a la misma celda a la vez
        }
    }
    */

    // La celda es pasable si es EMPTY, EXPLOSION (morirás), o POWERUP
    // console.log(`(${r},${c}) es pasable (tipo ${cellType})`);
    return true;
}

function updateUI() {
    // Actualizar UI para Jugador 1
    if (players[0]) {
        const p1 = players[0];
        ui.p1Bombs.textContent = p1.alive ? p1.bombCapacity - p1.bombsActive : 'X';
        ui.p1BombCapacity.textContent = p1.alive ? p1.bombCapacity : '-';
        ui.p1Range.textContent = p1.alive ? p1.bombRange : '-';
        ui.p1Speed.textContent = p1.alive ? p1.speedMultiplier.toFixed(1) : '-';
        ui.p1Info.classList.toggle('dead', !p1.alive);
    } else { // Estado inicial o si P1 no existe
        ui.p1Bombs.textContent = '-';
        ui.p1BombCapacity.textContent = '-';
        ui.p1Range.textContent = '-';
        ui.p1Speed.textContent = '-';
         ui.p1Info.classList.remove('dead');
    }

     // Actualizar UI para Jugador 2
     if (players[1]) {
        const p2 = players[1];
        ui.p2Bombs.textContent = p2.alive ? p2.bombCapacity - p2.bombsActive : 'X';
        ui.p2BombCapacity.textContent = p2.alive ? p2.bombCapacity : '-';
        ui.p2Range.textContent = p2.alive ? p2.bombRange : '-';
        ui.p2Speed.textContent = p2.alive ? p2.speedMultiplier.toFixed(1) : '-';
        ui.p2Info.classList.toggle('dead', !p2.alive);
    } else { // Estado inicial o si P2 no existe
        ui.p2Bombs.textContent = '-';
        ui.p2BombCapacity.textContent = '-';
        ui.p2Range.textContent = '-';
        ui.p2Speed.textContent = '-';
        ui.p2Info.classList.remove('dead');
    }
}

// --- Manejadores de Eventos ---

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    renderer.setSize(width, height); // Actualizar tamaño total del renderer

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
     const cameraOffset = new THREE.Vector3(0, CELL_SIZE * 6, CELL_SIZE * 4); // Un poco más arriba y atrás
     const lookAtOffset = new THREE.Vector3(0, -CELL_SIZE * 1, -CELL_SIZE * 3); // Mirar un poco hacia abajo y adelante del jugador

    for (let i = 0; i < cameras.length; i++) {
        const player = players[i];
        const camera = cameras[i];

        if (camera && player?.mesh) { // Solo actualizar si la cámara y el mesh del jugador existen
            const playerPos = player.mesh.position;

            // Calcular posición deseada de la cámara
            const desiredCamPos = playerPos.clone().add(cameraOffset);

            // Calcular punto deseado para mirar (relativo al jugador)
            const desiredLookAt = playerPos.clone().add(lookAtOffset);

            // Suavizar movimiento de cámara (LERP - Linear Interpolation)
            // Un valor más bajo de alpha (ej: 0.05) da más suavizado (más lento el seguimiento)
            // Un valor más alto (ej: 0.2) da menos suavizado (más rápido el seguimiento)
            const lerpAlpha = 0.08;
            camera.position.lerp(desiredCamPos, lerpAlpha);

            // Suavizar el punto de mira también puede ser bueno
            // Necesitamos un objeto temporal para lerpear el punto de mira, ya que lookAt necesita un Vector3
            // O podemos lerpear un vector director si quisiéramos... pero lerpear el target es más fácil.
            // Usaremos una propiedad temporal en la cámara o un objeto externo si es necesario.
            if (!camera.currentLookAt) camera.currentLookAt = desiredLookAt.clone(); // Inicializar si no existe
            camera.currentLookAt.lerp(desiredLookAt, lerpAlpha);
            camera.lookAt(camera.currentLookAt);

             // Opción sin suavizado de lookAt:
             // camera.lookAt(playerPos); // Mirar directamente al jugador
        } else if (camera && !player?.alive && player?.gridPos) {
             // Si el jugador está muerto pero tenemos su última posición lógica, mirar ahí
             const lastWorldPos = gridToWorld(player.gridPos.r, player.gridPos.c);
             const desiredCamPos = lastWorldPos.clone().add(cameraOffset); // Cámara sobre la última pos
             const desiredLookAt = lastWorldPos.clone().add(lookAtOffset);
             const lerpAlpha = 0.08;
             camera.position.lerp(desiredCamPos, lerpAlpha);
             if (!camera.currentLookAt) camera.currentLookAt = desiredLookAt.clone();
             camera.currentLookAt.lerp(desiredLookAt, lerpAlpha);
             camera.lookAt(camera.currentLookAt);
        }
        // Si no hay jugador o cámara, no hacer nada
    }
}


// --- Iniciar Todo ---
init();