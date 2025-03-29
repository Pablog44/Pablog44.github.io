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
let explosions = []; // Explosiones activas { cells, timer }
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
        camera.position.set(0, GRID_SIZE * CELL_SIZE * 0.8, GRID_SIZE * CELL_SIZE * 0.6); // Vista elevada
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
    directionalLight.shadow.camera.far = GRID_SIZE * CELL_SIZE * 2;
    directionalLight.shadow.camera.left = -GRID_SIZE * CELL_SIZE;
    directionalLight.shadow.camera.right = GRID_SIZE * CELL_SIZE;
    directionalLight.shadow.camera.top = GRID_SIZE * CELL_SIZE;
    directionalLight.shadow.camera.bottom = -GRID_SIZE * CELL_SIZE;
    scene.add(directionalLight);
    // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera); // Helper visual de sombra
    // scene.add(shadowHelper);


    // Cargar Texturas y Crear Materiales
    loadMaterials(() => {
        // Una vez cargadas las texturas, construir el nivel
        createLevel();
        setupPlayers();
        updateUI(); // Actualiza UI inicial
        // Mostrar pantalla de inicio
        ui.messageOverlay.style.display = 'flex';
        ui.startButton.onclick = startGame;
        // Iniciar loop (pero el juego no correrá hasta pulsar Start)
        animate();
    });

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
}

function loadMaterials(callback) {
    let texturesToLoad = Object.keys(TEXTURES).length;
    if (texturesToLoad === 0) {
        console.warn("No texture paths defined in TEXTURES constant.");
        if (callback) callback();
        return;
    }

    function textureLoaded() {
        texturesToLoad--;
        if (texturesToLoad === 0 && callback) {
            console.log("All textures loaded.");
            callback();
        }
    }

    function createMaterial(texturePath, fallbackColor = 0xffffff) {
         if (!texturePath) return new THREE.MeshStandardMaterial({ color: fallbackColor });
        try {
            const texture = textureLoader.load(
                texturePath,
                textureLoaded, // Success
                undefined,     // Progress (optional)
                (err) => {     // Error
                    console.error(`Failed to load texture: ${texturePath}`, err);
                     console.warn(`Using fallback color for ${texturePath}`);
                    textureLoaded(); // Still count it as "loaded" to proceed
                }
            );
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
             // Ajusta el repeat si la textura no está diseñada para un cubo unidad
             // texture.repeat.set(1 / CELL_SIZE, 1 / CELL_SIZE);
            return new THREE.MeshStandardMaterial({ map: texture, metalness: 0.1, roughness: 0.8 });
        } catch (e) {
            console.error(`Error creating material for ${texturePath}: `, e);
             console.warn(`Using fallback color for ${texturePath}`);
             textureLoaded();
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
}

function createLevel() {
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
    grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        grid[r] = [];
        for (let c = 0; c < GRID_SIZE; c++) {
            let cellType = CELL_EMPTY;
            if (r === 0 || c === 0 || r === GRID_SIZE - 1 || c === GRID_SIZE - 1 || (r % 2 === 0 && c % 2 === 0)) {
                cellType = CELL_INDESTRUCTIBLE; // Bordes y pilares
            } else {
                // Evitar bloques cerca de las esquinas de inicio
                 const isNearP1Start = (r <= 2 && c <= 2);
                 const isNearP2Start = (r >= GRID_SIZE - 3 && c >= GRID_SIZE - 3);
                 const isNearP3Start = (r <= 2 && c >= GRID_SIZE - 3); // Esquina superior derecha
                 const isNearP4Start = (r >= GRID_SIZE - 3 && c <= 2); // Esquina inferior izquierda (si hubiera 4 jug.)

                if (!isNearP1Start && !isNearP2Start && !isNearP3Start && !isNearP4Start && Math.random() < DESTRUCTIBLE_CHANCE) {
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
    console.log("Grid created:", grid);
}

function createBlock(r, c, type) {
    const blockGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
    const material = (type === CELL_INDESTRUCTIBLE) ? materials.indestructible : materials.destructible;
    const block = new THREE.Mesh(blockGeometry, material);
    block.position.copy(gridToWorld(r, c));
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
    blocks[`${r}_${c}`] = block; // Guardar referencia
    return block;
}

function setupPlayers() {
    players = []; // Limpiar jugadores si se reinicia

    // Jugador 1 (Esquina Superior Izquierda)
    players.push(createPlayer(1, 1, materials.player1, 0));

    // Jugador 2 (Esquina Inferior Derecha)
    players.push(createPlayer(GRID_SIZE - 2, GRID_SIZE - 2, materials.player2, 1));

     // Ajustar cámaras iniciales para mirar a sus jugadores
    updateCameraPositions();
}

function createPlayer(r, c, material, playerIndex) {
    const playerGeometry = new THREE.CapsuleGeometry(CELL_SIZE * 0.35, CELL_SIZE * 0.3, 16, 8); // Un poco más pequeño que la celda
    const playerMesh = new THREE.Mesh(playerGeometry, material);
    playerMesh.position.copy(gridToWorld(r, c));
     playerMesh.position.y = -CELL_SIZE / 2 + (CELL_SIZE * 0.3 + CELL_SIZE*0.35); // Ajustar altura cápsula
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

function startGame() {
    // Resetear estado si es necesario (opcional, mejor recargar la página por simplicidad ahora)
    // resetGame(); // Implementar si se quiere jugar varias rondas sin recargar

    // Ocultar mensaje y empezar el juego
    ui.messageOverlay.style.display = 'none';
    gameRunning = true;
    clock.start(); // Asegurarse que el reloj corra
    console.log("Game Started!");
}

function resetGame() {
     // Detener juego
    gameRunning = false;
    clock.stop();

    // Limpiar objetos de la escena que no sean persistentes
    bombs.forEach(b => scene.remove(b.mesh));
    bombs = [];
    explosions.forEach(exp => {
         if(exp.visuals) exp.visuals.forEach(v => scene.remove(v));
    });
    explosions = [];
    Object.values(powerups).forEach(p => scene.remove(p.mesh));
    powerups = {};
     Object.values(blocks).forEach(b => scene.remove(b)); // Quitar bloques viejos
     blocks = {};
     players.forEach(p => scene.remove(p.mesh)); // Quitar jugadores viejos
     players = [];


    // Recrear nivel y jugadores
    createLevel();
    setupPlayers();
    updateUI();

    // Mostrar pantalla de inicio de nuevo
    ui.messageText.textContent = "Bomber3D";
    ui.startButton.textContent = "Iniciar Juego";
    ui.messageOverlay.style.display = 'flex';
    keysPressed = {}; // Limpiar teclas presionadas
}


// --- Lógica del Juego (Actualización) ---

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (gameRunning) {
        handleInput(deltaTime);
        updatePlayers(deltaTime);
        updateBombs(deltaTime);
        updateExplosions(deltaTime);
        checkCollisions();
        checkWinCondition();
    }

    updateCameraPositions(); // Actualizar siempre para seguir jugadores

    // Renderizado Split Screen
    renderer.clear(); // Limpia todo el buffer

    // --- Render Jugador 1 (Izquierda) ---
    renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setScissorTest(true);
    renderer.render(scene, cameras[0]);

    // --- Render Jugador 2 (Derecha) ---
    renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setScissorTest(true); // Ya estaba true, pero por claridad
    renderer.render(scene, cameras[1]);
}

function handleInput(deltaTime) {
    // Jugador 1 (WASD + Space)
    if (players[0]?.alive) {
        let moveDir = { r: 0, c: 0 };
        if (keysPressed['w']) moveDir.r -= 1;
        if (keysPressed['s']) moveDir.r += 1;
        if (keysPressed['a']) moveDir.c -= 1;
        if (keysPressed['d']) moveDir.c += 1;
        movePlayer(players[0], moveDir);

        if (keysPressed[' ']) { // Barra espaciadora
            placeBomb(players[0]);
            keysPressed[' '] = false; // Evitar poner múltiples bombas con una pulsación
        }
    }

    // Jugador 2 (Flechas + Enter)
    if (players[1]?.alive) {
        let moveDir = { r: 0, c: 0 };
        if (keysPressed['arrowup']) moveDir.r -= 1;
        if (keysPressed['arrowdown']) moveDir.r += 1;
        if (keysPressed['arrowleft']) moveDir.c -= 1;
        if (keysPressed['arrowright']) moveDir.c += 1;
        movePlayer(players[1], moveDir);

        if (keysPressed['enter'] || keysPressed['numpad0']) { // Enter o Numpad 0
            placeBomb(players[1]);
            keysPressed['enter'] = false;
            keysPressed['numpad0'] = false;
        }
    }
}

function movePlayer(player, direction) {
    if (!player.alive || player.isMoving || (direction.r === 0 && direction.c === 0)) {
        return; // No mover si está muerto, ya se mueve, o no hay input
    }

    const currentR = player.gridPos.r;
    const currentC = player.gridPos.c;
    let targetR = currentR + direction.r;
    let targetC = currentC + direction.c;

    // Normalizar dirección si es diagonal (opcional, podría prohibirse)
    if (direction.r !== 0 && direction.c !== 0) {
         // Intentar mover horizontalmente primero si es posible
        if (isCellPassable(currentR, targetC, player)) {
            targetR = currentR;
        }
        // Si no, intentar verticalmente
        else if (isCellPassable(targetR, currentC, player)) {
             targetC = currentC;
        }
        // Si ninguna es posible, no moverse en diagonal
        else {
             return;
        }
    } else {
         targetR = currentR + direction.r;
         targetC = currentC + direction.c;
    }


    if (isCellPassable(targetR, targetC, player)) {
        player.gridPos.r = targetR;
        player.gridPos.c = targetC;
        player.targetPos = gridToWorld(targetR, targetC);
        player.targetPos.y = player.mesh.position.y; // Mantener altura Y
        player.isMoving = true;

        // Comprobar si pisa un power-up al *llegar* a la celda
         checkPowerupPickup(player);
    }
}


function updatePlayers(deltaTime) {
    players.forEach(player => {
        if (!player.alive) return;

        if (player.isMoving) {
            const moveSpeed = PLAYER_SPEED_BASE * player.speedMultiplier * deltaTime;
            const distanceToTarget = player.mesh.position.distanceTo(player.targetPos);

            if (distanceToTarget <= moveSpeed) {
                // Llegó al destino
                player.mesh.position.copy(player.targetPos);
                player.isMoving = false;
                 // checkPowerupPickup(player); // Recoger powerup al *terminar* el movimiento en la celda
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
        return; // Ya ha puesto el máximo
    }

    const r = player.gridPos.r;
    const c = player.gridPos.c;

    // Verificar si ya hay una bomba en esa celda
    if (grid[r][c] === CELL_BOMB || bombs.some(b => b.gridPos.r === r && b.gridPos.c === c)) {
        // console.log("Ya hay una bomba aquí!"); // Evitar poner una encima de otra
        return;
    }


    console.log(`Jugador ${player.index + 1} pone bomba en ${r}, ${c}`);

    const bombGeometry = new THREE.SphereGeometry(CELL_SIZE * 0.4, 16, 16);
    const bombMesh = new THREE.Mesh(bombGeometry, materials.bomb);
    bombMesh.position.copy(gridToWorld(r, c));
     bombMesh.position.y = -CELL_SIZE / 2 + CELL_SIZE * 0.4; // Elevarla un poco
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
    grid[r][c] = CELL_BOMB; // Marcar la celda como ocupada por bomba
    player.bombsActive++;
    updateUI();
}

function updateBombs(deltaTime) {
    for (let i = bombs.length - 1; i >= 0; i--) {
        const bomb = bombs[i];
        bomb.timer -= deltaTime;

        // Parpadeo rápido antes de explotar (opcional)
        const blinkRate = 0.1;
         if (bomb.timer < blinkRate * 4) {
            bomb.mesh.visible = Math.floor(bomb.timer / blinkRate) % 2 === 0;
         }


        if (bomb.timer <= 0) {
            // ¡Boom!
            explodeBomb(bomb);
            bombs.splice(i, 1); // Quitar bomba de la lista activa
        }
    }
}

function explodeBomb(bomb) {
    console.log(`Bomba explota en ${bomb.gridPos.r}, ${bomb.gridPos.c}`);

    scene.remove(bomb.mesh); // Quitar el mesh de la bomba
    bomb.owner.bombsActive--; // Liberar cupo para el jugador
    grid[bomb.gridPos.r][bomb.gridPos.c] = CELL_EMPTY; // La celda de la bomba ahora está vacía (antes de la explosión)


    const explosionCells = []; // Celdas afectadas por esta explosión
    const explosionVisuals = []; // Meshes para el efecto visual

    // Función para procesar una celda durante la expansión de la explosión
    const processCell = (r, c) => {
         if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return 'stop'; // Fuera del tablero

        const cellKey = `${r}_${c}`;
        const cellType = grid[r][c];

        // Añadir celda a la lista de afectadas
        if (!explosionCells.find(cell => cell.r === r && cell.c === c)) {
             explosionCells.push({r, c});

             // Crear visualización de explosión (cubo simple)
             const explosionGeo = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE*0.5, CELL_SIZE); // Más plano
             const expMesh = new THREE.Mesh(explosionGeo, materials.explosion);
             expMesh.position.copy(gridToWorld(r, c));
             expMesh.position.y = -CELL_SIZE / 2 + CELL_SIZE*0.25; // Centrar visualmente
             scene.add(expMesh);
             explosionVisuals.push(expMesh);
        }


        if (cellType === CELL_INDESTRUCTIBLE) {
            return 'stop'; // La explosión se detiene aquí
        }

        if (cellType === CELL_DESTRUCTIBLE) {
            destroyBlock(r, c);
            return 'stop'; // La explosión destruye el bloque y se detiene
        }

        if (cellType === CELL_BOMB) {
            // Chain reaction! Find the bomb in this cell and explode it immediately
            const chainedBombIndex = bombs.findIndex(b => b.gridPos.r === r && b.gridPos.c === c);
            if (chainedBombIndex !== -1) {
                const chainedBomb = bombs[chainedBombIndex];
                bombs.splice(chainedBombIndex, 1); // Remove from list to prevent re-triggering
                // No poner timer a 0, explotarla directamente para evitar loops infinitos si 2 explotan a la vez
                explodeBomb(chainedBomb);
            }
            // La explosión continúa a través de donde estaba la bomba encadenada (o debería detenerse?)
            // -> Por simplicidad, la explosión original continúa
        }

        // Si es un powerup, la explosión lo destruye
        if (powerups[cellKey]) {
             removePowerup(r,c);
        }


        // Check for players in this cell (collision check handled later)

        return 'continue'; // La explosión continúa
    };

    // Procesar celda central
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

     // Marcar las celdas como peligrosas temporalmente y registrar la explosión
     const explosionData = { cells: explosionCells, timer: EXPLOSION_DURATION, visuals: explosionVisuals };
     explosions.push(explosionData);
     explosionCells.forEach(cell => {
         grid[cell.r][cell.c] = CELL_EXPLOSION; // Marcar como peligrosa
     });


    updateUI();
}

function updateExplosions(deltaTime) {
     for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.timer -= deltaTime;

        if (exp.timer <= 0) {
            // Limpiar visualización y estado lógico de la explosión
             exp.visuals.forEach(v => scene.remove(v));
             exp.cells.forEach(cell => {
                 // Solo limpiar si sigue siendo una celda de explosión (podría haber una bomba nueva)
                 if (grid[cell.r][cell.c] === CELL_EXPLOSION) {
                     grid[cell.r][cell.c] = CELL_EMPTY;
                 }
             });
            explosions.splice(i, 1);
        } else {
            // Hacer que la opacidad disminuya (opcional)
            const opacity = Math.max(0, exp.timer / EXPLOSION_DURATION);
             exp.visuals.forEach(v => {
                 if (v.material.opacity !== undefined) v.material.opacity = opacity * 0.8; // *0.8 para no ser totalmente opaco al inicio
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
        grid[r][c] = CELL_EMPTY; // Ahora es una celda vacía

        // Posibilidad de dejar un power-up
        if (Math.random() < POWERUP_CHANCE) {
            spawnPowerup(r, c);
        }
    }
}

function spawnPowerup(r, c) {
    const powerupTypeRoll = Math.random();
    let type;
    let material;
    let geometry = new THREE.BoxGeometry(CELL_SIZE * 0.6, CELL_SIZE * 0.6, CELL_SIZE * 0.6); // Más pequeño

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

     // Evitar spawn si ya hay algo (otra bomba, explosión, jugador?)
    if (grid[r][c] !== CELL_EMPTY) return;


    console.log(`Spawn powerup tipo ${type} en ${r}, ${c}`);

    const powerupMesh = new THREE.Mesh(geometry, material);
    powerupMesh.position.copy(gridToWorld(r, c));
    powerupMesh.position.y = -CELL_SIZE / 2 + CELL_SIZE * 0.3; // A nivel del suelo
    powerupMesh.castShadow = true; // Los powerups también arrojan sombra
    scene.add(powerupMesh);

    const cellKey = `${r}_${c}`;
    powerups[cellKey] = { mesh: powerupMesh, type: type };
    grid[r][c] = type; // Marcar la celda con el tipo de powerup
}

function checkPowerupPickup(player) {
    const r = player.gridPos.r;
    const c = player.gridPos.c;
    const cellKey = `${r}_${c}`;

    if (powerups[cellKey]) {
        const powerup = powerups[cellKey];
        console.log(`Jugador ${player.index + 1} recoge powerup tipo ${powerup.type}`);

        // Aplicar efecto
        switch (powerup.type) {
            case CELL_POWERUP_BOMB:
                player.bombCapacity++;
                break;
            case CELL_POWERUP_RANGE:
                player.bombRange++;
                break;
            case CELL_POWERUP_SPEED:
                player.speedMultiplier += 0.25; // Aumentar velocidad
                break;
        }

        removePowerup(r, c); // Quitar el powerup del juego
        updateUI();
    }
}

function removePowerup(r, c) {
     const cellKey = `${r}_${c}`;
     if (powerups[cellKey]) {
        scene.remove(powerups[cellKey].mesh);
        delete powerups[cellKey];
        if(grid[r][c] >= CELL_POWERUP_BOMB && grid[r][c] <= CELL_POWERUP_SPEED) {
            grid[r][c] = CELL_EMPTY; // Marcar celda como vacía de nuevo
        }
     }
}


function checkCollisions() {
    players.forEach(player => {
        if (!player.alive) return;

        const r = player.gridPos.r;
        const c = player.gridPos.c;

        // Colisión con Explosión
        if (grid[r][c] === CELL_EXPLOSION) {
            console.log(`Jugador ${player.index + 1} alcanzado por explosión!`);
            killPlayer(player);
        }
    });
}

function killPlayer(player) {
    if (!player.alive) return; // Ya está muerto
    player.alive = false;
    scene.remove(player.mesh); // O hacer una animación de muerte
    console.log(`Jugador ${player.index + 1} ha muerto.`);
    // Podríamos añadir un pequeño retraso antes de comprobar la victoria
}

function checkWinCondition() {
    const alivePlayers = players.filter(p => p.alive);

    if (alivePlayers.length <= 1 && gameRunning) { // <= 1 para cubrir el caso de empate (0 vivos)
        gameRunning = false;
        clock.stop();
        let message = "";
        if (alivePlayers.length === 1) {
            message = `¡Jugador ${alivePlayers[0].index + 1} Gana!`;
        } else {
            message = "¡Empate!";
        }
        console.log("Game Over:", message);
        ui.messageText.textContent = message;
        ui.startButton.textContent = "Jugar de Nuevo"; // Cambiar texto botón
        ui.messageOverlay.style.display = 'flex';
        // Al hacer clic en "Jugar de Nuevo", ahora llamará a startGame, que idealmente llamaría a resetGame()
         ui.startButton.onclick = resetGame; // ¡¡IMPORTANTE: Que el botón reinicie!!

    }
}

// --- Utilidades ---

function gridToWorld(r, c) {
    // Centra el tablero en el origen (0,0,0)
    const worldX = (c - (GRID_SIZE - 1) / 2) * CELL_SIZE;
    const worldZ = (r - (GRID_SIZE - 1) / 2) * CELL_SIZE;
    const worldY = 0; // Altura base de los objetos en el centro de la celda
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
        return false;
    }
    // Comprobar tipo de celda
    const cellType = grid[r][c];
    if (cellType === CELL_INDESTRUCTIBLE || cellType === CELL_DESTRUCTIBLE) {
        return false;
    }
    // Comprobar si hay una bomba (los jugadores NO pueden atravesar bombas)
    if (cellType === CELL_BOMB) {
         // Permitir salir de la celda donde acabas de poner la bomba
         const bombInCell = bombs.find(b => b.gridPos.r === r && b.gridPos.c === c);
         if (bombInCell && bombInCell.owner === player && bombInCell.gridPos.r === player.gridPos.r && bombInCell.gridPos.c === player.gridPos.c) {
             return true; // Puedes salir de tu propia bomba recién puesta
         }
        return false;
    }

    // Comprobar colisión con otros jugadores (simple)
    // for (const otherPlayer of players) {
    //     if (otherPlayer !== player && otherPlayer.alive && otherPlayer.gridPos.r === r && otherPlayer.gridPos.c === c) {
    //         return false; // No puede entrar si otro jugador está ahí
    //     }
    // }


    return true; // Celda vacía, powerup o explosión (se puede pasar, pero morirás si es explosión)
}

function updateUI() {
    if (players[0]) {
        ui.p1Bombs.textContent = players[0].bombCapacity - players[0].bombsActive;
        ui.p1BombCapacity.textContent = players[0].bombCapacity;
        ui.p1Range.textContent = players[0].bombRange;
        ui.p1Speed.textContent = players[0].speedMultiplier.toFixed(1); // Mostrar 1 decimal
    }
     if (players[1]) {
        ui.p2Bombs.textContent = players[1].bombCapacity - players[1].bombsActive;
        ui.p2BombCapacity.textContent = players[1].bombCapacity;
        ui.p2Range.textContent = players[1].bombRange;
        ui.p2Speed.textContent = players[1].speedMultiplier.toFixed(1);
    }
}

// --- Manejadores de Eventos ---

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    cameras.forEach(cam => {
        cam.aspect = (width / 2) / height; // Aspect ratio para media pantalla
        cam.updateProjectionMatrix();
    });

    renderer.setSize(width, height);
}

function onKeyDown(event) {
    keysPressed[event.key.toLowerCase()] = true;
     // Prevenir scroll con flechas/espacio si el juego está activo
     if (gameRunning && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(event.key.toLowerCase())) {
         event.preventDefault();
     }
}

function onKeyUp(event) {
    keysPressed[event.key.toLowerCase()] = false;
}

function updateCameraPositions() {
     const cameraOffset = new THREE.Vector3(0, CELL_SIZE * 5, CELL_SIZE * 3); // Offset detrás y arriba
     const lookAtOffset = new THREE.Vector3(0, -CELL_SIZE * 2, -CELL_SIZE * 4); // Mirar un poco hacia abajo y adelante

    for (let i = 0; i < players.length; i++) {
        if (players[i]?.mesh) {
            const playerPos = players[i].mesh.position;
            const desiredCamPos = playerPos.clone().add(cameraOffset);
            const desiredLookAt = playerPos.clone().add(lookAtOffset);

            // Suavizar movimiento de cámara (LERP)
            cameras[i].position.lerp(desiredCamPos, 0.1); // Ajusta 0.1 para más/menos suavizado
            cameras[i].lookAt(cameras[i].position.clone().lerp(desiredLookAt, 0.1)); // Suavizar también el punto de mira
             // cameras[i].lookAt(playerPos); // Opción sin suavizado de lookAt
        }
    }
}


// --- Iniciar Todo ---
init();