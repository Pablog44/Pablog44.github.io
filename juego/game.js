import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Constants & Config ---
const GRID_SIZE_X = 10;
const GRID_SIZE_Z = 16;
const CELL_SIZE = 4;
// UNIT_BASE_SCALE y UNIT_HEIGHT_SCALE ahora son menos relevantes si todos usan GLB,
// pero se mantienen para el fallback a primitivas.
const UNIT_BASE_SCALE = 0.6;
const UNIT_HEIGHT_SCALE = 0.8;

const UNIT_TYPES = {
    ARCHER: 'Archer',
    SWORDSMAN: 'Swordsman',
    HORSEMAN: 'Horseman'
};

const UNIT_STATS = {
    [UNIT_TYPES.ARCHER]:    { move: 4, attackRange: 7, attackDie: [1, 2], geom: 'cylinder', size: {r: 0.3, h: 1.0}, modelScaleFactor: 1.8 /* AJUSTA ESTO */ },
    [UNIT_TYPES.SWORDSMAN]: { move: 3, attackRange: 2, attackDie: [1, 4], geom: 'capsule',  size: {r: 0.35, h: 0.6}, modelScaleFactor: 2.0 /* AJUSTA ESTO */ },
    [UNIT_TYPES.HORSEMAN]:  { move: 7, attackRange: 3, attackDie: [1, 3], geom: 'capsule',  size: {r: 0.4, h: 0.8}, modelScaleFactor: 2.2 /* AJUSTA ESTO */ }
};
const UNITS_PER_TYPE = 5;
const MAX_UNIT_ACTIVATIONS_PER_TURN = 3;

const TEXTURES = {
    floor_cell_p1: 'textures/floor_p1.png',
    floor_cell_p2: 'textures/floor_p2.png',
    unit_archer_p1: 'textures/archer_red.png',
    unit_swordsman_p1: 'textures/swordsman_red.png',
    unit_horseman_p1: 'textures/horseman_red.png',
    unit_archer_p2: 'textures/archer_blue.png',
    unit_swordsman_p2: 'textures/swordsman_blue.png',
    unit_horseman_p2: 'textures/horseman_blue.png',
    highlight_move: 'textures/highlight_move.png',
    highlight_attack: 'textures/highlight_attack.png'
};

// --- Rutas a los modelos GLB ---
// Asegúrate de que estos archivos existen en tu carpeta 'models'
// y que los nombres coincidan.
const MODEL_PATHS = {
    [UNIT_TYPES.ARCHER]: {
        p1: 'models/archer_red.glb',
        p2: 'models/archer_blue.glb'
    },
    [UNIT_TYPES.SWORDSMAN]: {
        p1: 'models/swordsman_red.glb',
        p2: 'models/swordsman_blue.glb'
    },
    [UNIT_TYPES.HORSEMAN]: {
        p1: 'models/horseman_red.glb',
        p2: 'models/horseman_blue.glb'
    }
};

const GAME_STATE = {
    START_MENU: 'START_MENU',
    PLAYER_TURN_START: 'PLAYER_TURN_START',
    SELECT_UNIT_FOR_ACTIVATION: 'SELECT_UNIT_FOR_ACTIVATION',
    UNIT_ACTION_PENDING: 'UNIT_ACTION_PENDING',
    PERFORMING_ACTION: 'PERFORMING_ACTION',
    GAME_OVER: 'GAME_OVER'
};

// --- Global Variables ---
let scene, renderer, camera, controls;
let players = [
    { id: 0, units: [], name: "Jugador 1", color: 0xcc3333, texturePrefix: 'p1' },
    { id: 1, units: [], name: "Jugador 2", color: 0x3333cc, texturePrefix: 'p2' }
];
let grid = [];
let floorCells = {};
let materials = {};
let textureLoader = new THREE.TextureLoader();
let gltfLoader = new GLTFLoader();
let loadedModels = {}; // Almacenará modelos GLB cargados
let clock = new THREE.Clock();

let gameRunning = false;
let currentGameState = GAME_STATE.START_MENU;
let currentPlayerIndex = 0;
let unitActivationsThisTurn = 0;
let selectedUnitForAction = null;

let highlightMeshes = { move: [], attack: [] };
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let ctrlKeyPressed = false;

const ui = {
    p1Info: document.getElementById('player1-info'),
    p2Info: document.getElementById('player2-info'),
    p1Status: document.getElementById('p1-status'),
    p2Status: document.getElementById('p2-status'),
    p1UnitsLeft: document.getElementById('p1-units-left'),
    p2UnitsLeft: document.getElementById('p2-units-left'),
    p1ActionsLeft: document.getElementById('p1-actions-left'),
    p2ActionsLeft: document.getElementById('p2-actions-left'),
    p1SelectedUnitInfo: document.getElementById('p1-selected-unit-info'),
    p2SelectedUnitInfo: document.getElementById('p2-selected-unit-info'),
    messageOverlay: document.getElementById('message-overlay'),
    messageText: document.getElementById('message-text'),
    startButton: document.getElementById('start-button'),
    currentPlayerTurn: document.getElementById('current-player-turn'),
    currentActionMessage: document.getElementById('current-action-message'),
    diceRollResult: document.getElementById('dice-roll-result'),
    endTurnButton: document.getElementById('end-turn-button'),
    endUnitActionButton: document.getElementById('end-unit-action-button'),
};

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x151020);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false;
    document.getElementById('game-container').appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 2000);
    const worldCenterX = 0;
    const worldCenterZ = 0;
    camera.position.set(
        worldCenterX,
        GRID_SIZE_Z * CELL_SIZE * 0.8,
        worldCenterZ + GRID_SIZE_Z * CELL_SIZE * 0.7
    );
    camera.lookAt(worldCenterX, 0, worldCenterZ);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false;
    controls.minDistance = CELL_SIZE * 3;
    controls.maxDistance = GRID_SIZE_Z * CELL_SIZE * 2;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(worldCenterX, 0, worldCenterZ);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(CELL_SIZE * 5, CELL_SIZE * 10, CELL_SIZE * 3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = CELL_SIZE * 25;
    directionalLight.shadow.camera.left = -GRID_SIZE_X * CELL_SIZE * 1.0;
    directionalLight.shadow.camera.right = GRID_SIZE_X * CELL_SIZE * 1.0;
    directionalLight.shadow.camera.top = GRID_SIZE_Z * CELL_SIZE * 1.0;
    directionalLight.shadow.camera.bottom = -GRID_SIZE_Z * CELL_SIZE * 1.0;
    scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0xaaaaee, 0x333355, 0.5);
    scene.add(hemisphereLight);

    loadAssets(() => {
        createBoard();
        setupInitialUnits();
        ui.startButton.onclick = startGame;
        ui.endTurnButton.onclick = () => {
            if (gameRunning && currentGameState !== GAME_STATE.PERFORMING_ACTION) handleEndTurn();
        };
        ui.endUnitActionButton.onclick = () => {
            if (gameRunning && selectedUnitForAction && currentGameState === GAME_STATE.UNIT_ACTION_PENDING) finalizeSelectedUnitAction();
        };
        
        window.addEventListener('resize', onWindowResize);
        document.addEventListener('click', onMouseClick);
        
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Control') {
                ctrlKeyPressed = true;
                controls.enabled = true;
            }
        });
        document.addEventListener('keyup', (event) => {
            if (event.key === 'Control') {
                ctrlKeyPressed = false;
                controls.enabled = false;
            }
        });
        renderer.domElement.addEventListener('contextmenu', (event) => {
            if (ctrlKeyPressed) {
                event.preventDefault();
            }
        });

        updateUI();
        animate();
    });
}

function loadAssets(callback) {
    let textureKeys = Object.keys(TEXTURES);
    let modelsToLoad = [];

    // Construir lista de modelos a cargar y sus claves
    for (const unitType in MODEL_PATHS) {
        for (const playerPrefix in MODEL_PATHS[unitType]) {
            const modelKey = `${unitType.toUpperCase()}_${playerPrefix.toUpperCase()}`;
            modelsToLoad.push({ key: modelKey, path: MODEL_PATHS[unitType][playerPrefix] });
        }
    }

    let assetsLoadedCount = 0;
    const totalAssetsToLoad = textureKeys.length + modelsToLoad.length;

    function checkAllAssetsLoaded() {
        if (assetsLoadedCount === totalAssetsToLoad) {
            console.log("All assets (textures and models) processed.");
            if (callback) callback();
        }
    }

    function assetLoadedLog(assetKey, type = "texture") {
        console.log(`${type} loaded: ${assetKey}`);
        assetsLoadedCount++;
        checkAllAssetsLoaded();
    }

    function assetErrorLog(url, assetKey, type = "texture") {
        console.warn(`Failed to load ${type}: ${url}. Using fallback for ${assetKey}.`);
        if (type === "texture") {
            let fallbackColor = 0x888888;
            if (assetKey.includes('floor_cell_p1')) fallbackColor = players[0].color;
            else if (assetKey.includes('floor_cell_p2')) fallbackColor = players[1].color;
            else if (assetKey.includes('unit_') && assetKey.includes('_p1')) fallbackColor = players[0].color;
            else if (assetKey.includes('unit_') && assetKey.includes('_p2')) fallbackColor = players[1].color;
            else if (assetKey.includes('highlight_move')) fallbackColor = 0x00ccff;
            else if (assetKey.includes('highlight_attack')) fallbackColor = 0xff3300;
            
            if (assetKey.includes('highlight')) {
                materials[assetKey] = new THREE.MeshBasicMaterial({ color: fallbackColor, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
            } else {
                materials[assetKey] = new THREE.MeshStandardMaterial({ color: fallbackColor, metalness: 0.1, roughness: 0.9 });
            }
        } else if (type === "model") {
            console.error(`Model ${assetKey} (${url}) failed to load. Unit creation will use placeholder geometry for this type.`);
            // No se almacena nada en loadedModels[assetKey] para que createUnit use el fallback.
        }
        assetsLoadedCount++;
        checkAllAssetsLoaded();
    }

    if (totalAssetsToLoad === 0 && !Object.keys(TEXTURES).includes('selected_unit_indicator')) { // Ajuste para asegurar que siempre haya al menos el indicador
        console.warn("No assets (textures or models) defined beyond indicator. Using default colors/placeholders.");
        // ... (código de fallback de materiales si es necesario, pero las texturas de unidad ya tienen fallback)
        if (callback) callback();
        return;
    }
    
    // Cargar texturas
    textureKeys.forEach(key => {
        const path = TEXTURES[key];
        const isHighlight = key.includes('highlight');
        textureLoader.load(
            path,
            (texture) => {
                if (isHighlight) {
                    materials[key] = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
                } else {
                    materials[key] = new THREE.MeshStandardMaterial({ map: texture, metalness: 0.2, roughness: 0.8 });
                }
                assetLoadedLog(key, "texture");
            },
            undefined,
            (err) => {
                assetErrorLog(path, key, "texture");
            }
        );
    });
    // Material para el indicador de selección
    materials.selected_unit_indicator = new THREE.MeshBasicMaterial({color: 0xf0e68c, transparent: true, opacity: 0.7, side: THREE.DoubleSide});


    // Cargar modelos GLB
    modelsToLoad.forEach(modelInfo => {
        gltfLoader.load(
            modelInfo.path,
            (gltf) => {
                loadedModels[modelInfo.key] = gltf;
                assetLoadedLog(modelInfo.key, "model");
            },
            undefined, 
            (error) => {
                assetErrorLog(modelInfo.path, modelInfo.key, "model");
            }
        );
    });

    // Si no hay texturas ni modelos (improbable pero por si acaso), llama al callback directamente.
    if (totalAssetsToLoad === 0) {
         setTimeout(checkAllAssetsLoaded, 100); // Pequeño delay por si acaso
    }
}


function createBoard() {
    grid = Array(GRID_SIZE_Z).fill(null).map(() => Array(GRID_SIZE_X).fill(null));
    floorCells = {};
    const cellGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
    for (let r = 0; r < GRID_SIZE_Z; r++) {
        for (let c = 0; c < GRID_SIZE_X; c++) {
            let materialKey = (r < Math.floor(GRID_SIZE_Z / 2)) ? 'floor_cell_p1' : 'floor_cell_p2';
            const cellMaterial = materials[materialKey] || new THREE.MeshStandardMaterial({ color: (r < GRID_SIZE_Z / 2 ? players[0].color : players[1].color), metalness:0.1, roughness:0.9});
            const cellMesh = new THREE.Mesh(cellGeometry, cellMaterial);
            const worldPos = gridToWorld(c, r);
            cellMesh.position.copy(worldPos);
            cellMesh.position.y = -CELL_SIZE / 2;
            cellMesh.receiveShadow = true;
            scene.add(cellMesh);
            floorCells[`${c}_${r}`] = cellMesh;
            cellMesh.userData = { type: 'floor_cell', gridX: c, gridZ: r };
        }
    }
}

function setupInitialUnits() {
    let unitIdCounter = 0;
    const unitTypesCycle = [UNIT_TYPES.ARCHER, UNIT_TYPES.SWORDSMAN, UNIT_TYPES.HORSEMAN];
    players.forEach((player, playerIdx) => {
        player.units = [];
        let unitsToPlaceTotal = UNITS_PER_TYPE * 3;
        const startRow = (playerIdx === 0) ? 1 : GRID_SIZE_Z - 2;
        const rowDirection = (playerIdx === 0) ? 1 : -1;
        let unitsPlacedCount = 0;
        for (let zRowOffset = 0; zRowOffset < 3; zRowOffset++) {
            const currentZ = startRow + (zRowOffset * rowDirection);
            if (currentZ < 0 || currentZ >= GRID_SIZE_Z) continue;
            let startX = Math.max(1, Math.floor((GRID_SIZE_X - UNITS_PER_TYPE) / 2));
            for (let xColOffset = 0; xColOffset < UNITS_PER_TYPE; xColOffset++) {
                if (unitsPlacedCount >= unitsToPlaceTotal) break;
                const currentX = startX + xColOffset;
                if (currentX >= GRID_SIZE_X -1 || currentX < 1 ) continue;
                const type = unitTypesCycle[unitsPlacedCount % 3]; // Cicla entre los 3 tipos
                if (grid[currentZ][currentX] === null) {
                    createUnit(playerIdx, type, { x: currentX, z: currentZ }, unitIdCounter++);
                    unitsPlacedCount++;
                }
            }
            if (unitsPlacedCount >= unitsToPlaceTotal) break;
        }
    });
}

function createUnit(playerIdx, type, gridPos, id) {
    const stats = UNIT_STATS[type];
    const player = players[playerIdx];
    let mesh;
    let usedGLB = false;

    const modelKey = `${type.toUpperCase()}_${player.texturePrefix.toUpperCase()}`;
    const gltfData = loadedModels[modelKey];

    if (gltfData) {
        usedGLB = true;
        mesh = gltfData.scene.clone();

        const modelScale = stats.modelScaleFactor || 1.0;
        mesh.scale.set(modelScale, modelScale, modelScale);
        
        mesh.userData = { unitId: id, owner: playerIdx, type: 'unit' }; // Crucial: userData en el objeto raíz del modelo

        mesh.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Intentar aplicar textura 2D del juego al modelo GLB
                const textureKeyForUnit = `unit_${type.toLowerCase()}_${player.texturePrefix}`;
                const unitSpecificMaterial = materials[textureKeyForUnit];

                if (unitSpecificMaterial && unitSpecificMaterial.map) {
                    // Clona el material base del GLB para no modificar el original y aplica el mapa.
                    // Esto es un intento; puede que necesites ajustar el material original del GLB
                    // o asegurarte de que es un MeshStandardMaterial.
                    let newMaterial = child.material.clone();
                    newMaterial.map = unitSpecificMaterial.map;
                    newMaterial.color = new THREE.Color(0xffffff); // Reset color para que la textura se vea pura
                    newMaterial.metalness = unitSpecificMaterial.metalness !== undefined ? unitSpecificMaterial.metalness : 0.2;
                    newMaterial.roughness = unitSpecificMaterial.roughness !== undefined ? unitSpecificMaterial.roughness : 0.8;
                    // Conserva otras propiedades del material original si es necesario
                    child.material = newMaterial;
                } else if (unitSpecificMaterial) { // Si no hay mapa (textura no cargada) pero sí material de fallback (color)
                    child.material = unitSpecificMaterial.clone();
                }
                // Si unitSpecificMaterial no existe, el GLB usará sus propios materiales (si los tiene) o un gris por defecto.
            }
        });
    } else {
        // Fallback a geometría primitiva si el modelo GLB no está disponible
        console.warn(`GLB model for ${modelKey} not found. Using placeholder geometry for unit ID ${id}.`);
        let geometry;
        const unitWidth = CELL_SIZE * UNIT_BASE_SCALE * stats.size.r * 2;
        const unitHeight = CELL_SIZE * UNIT_HEIGHT_SCALE * stats.size.h;
        if (stats.geom === 'cylinder') {
            geometry = new THREE.CylinderGeometry(unitWidth / 2, unitWidth / 2, unitHeight, 16);
        } else { // capsule
            geometry = new THREE.CapsuleGeometry(unitWidth / 2, unitHeight - unitWidth, 12, 24);
        }
        
        // Usar el color del jugador como material de fallback
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: player.color, metalness:0.2, roughness:0.7 });
        mesh = new THREE.Mesh(geometry, fallbackMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { unitId: id, owner: playerIdx, type: 'unit' };
    }

    const worldPos = gridToWorld(gridPos.x, gridPos.z);
    mesh.position.copy(worldPos);

    if (usedGLB) {
        mesh.position.y = 0; // Asume que el pivote del GLB está en su base. Ajusta si es necesario.
        // Ejemplo de ajuste si el pivote está en el centro:
        // const box = new THREE.Box3().setFromObject(mesh);
        // const size = box.getSize(new THREE.Vector3());
        // mesh.position.y = size.y / 2; (o -box.min.y si min.y es negativo y pivote es 0)
    } else {
        // Posicionamiento para primitivas
        const unitHeight = CELL_SIZE * UNIT_HEIGHT_SCALE * stats.size.h;
        mesh.position.y = unitHeight / 2;
    }

    const unit = {
        id: id, owner: playerIdx, type: type, stats: stats, gridPos: { ...gridPos },
        mesh: mesh, alive: true, hasBeenActivatedThisTurn: false,
        hasMovedThisActivation: false, hasAttackedThisActivation: false, selectedIndicator: null,
        isGLB: usedGLB // Para referencia futura si es necesario
    };
    
    player.units.push(unit);
    grid[gridPos.z][gridPos.x] = unit;
    scene.add(mesh);
    return unit;
}

function startGame() {
    players.forEach(p => {
        p.units.forEach(u => { 
            if (u.mesh) scene.remove(u.mesh); 
            if(u.selectedIndicator) scene.remove(u.selectedIndicator); 
        });
        p.units = [];
    });
    grid = Array(GRID_SIZE_Z).fill(null).map(() => Array(GRID_SIZE_X).fill(null));
    clearHighlights();
    selectedUnitForAction = null;
    unitActivationsThisTurn = 0;
    currentPlayerIndex = 0;
    setupInitialUnits();
    ui.messageOverlay.style.display = 'none';
    gameRunning = true;
    if (!clock.running) clock.start(); else clock.getDelta();
    changeGameState(GAME_STATE.PLAYER_TURN_START);
}

function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (controls.enabled) {
        controls.update(deltaTime);
    }

    if (selectedUnitForAction && selectedUnitForAction.selectedIndicator) {
        const unitMeshPos = selectedUnitForAction.mesh.position;
        selectedUnitForAction.selectedIndicator.position.set(unitMeshPos.x, 0.1, unitMeshPos.z); // Un poco por encima del suelo
        selectedUnitForAction.selectedIndicator.visible = true;
    }
    
    renderer.clear();
    renderer.render(scene, camera);
}

function onMouseClick(event) {
    if (ctrlKeyPressed) return; 

    if (!gameRunning || currentGameState === GAME_STATE.PERFORMING_ACTION || currentGameState === GAME_STATE.GAME_OVER) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let clickedGridPos = null;
    let clickedOnUnitObject = null;

    for (const intersect of intersects) {
        let objectWithUserData = intersect.object;
        while (objectWithUserData && !objectWithUserData.userData.type) {
            objectWithUserData = objectWithUserData.parent;
        }
        if (objectWithUserData && objectWithUserData.userData) {
            const objUserData = objectWithUserData.userData;
            if (objUserData.type === 'unit') {
                clickedOnUnitObject = players[objUserData.owner].units.find(u => u.id === objUserData.unitId && u.alive);
                if (clickedOnUnitObject) clickedGridPos = clickedOnUnitObject.gridPos;
                break; 
            }
            if (objUserData.type === 'floor_cell') {
                clickedGridPos = { x: objUserData.gridX, z: objUserData.gridZ };
                break; 
            }
            if (objUserData.type === 'move_highlight' || objUserData.type === 'attack_highlight') {
                clickedGridPos = { x: objUserData.x, z: objUserData.z };
                // No rompemos aquí para priorizar unidades sobre highlights si están superpuestos.
            }
        }
    }
    
    if (!clickedGridPos) return; 

    if (currentGameState === GAME_STATE.SELECT_UNIT_FOR_ACTIVATION) {
        if (clickedOnUnitObject && clickedOnUnitObject.owner === currentPlayerIndex && !clickedOnUnitObject.hasBeenActivatedThisTurn) {
            selectUnitForActivation(clickedOnUnitObject);
        }
    } else if (currentGameState === GAME_STATE.UNIT_ACTION_PENDING && selectedUnitForAction) {
        if (clickedOnUnitObject && clickedOnUnitObject.owner !== currentPlayerIndex && clickedOnUnitObject.alive) { // Clic en unidad enemiga
            if (isCellInHighlights(clickedGridPos, highlightMeshes.attack) && !selectedUnitForAction.hasAttackedThisActivation) {
                performAttackAction(selectedUnitForAction, clickedOnUnitObject);
            }
        }
        else if (isCellInHighlights(clickedGridPos, highlightMeshes.move) && !selectedUnitForAction.hasMovedThisActivation) { // Clic en highlight de movimiento
            if (grid[clickedGridPos.z][clickedGridPos.x] === null) { // Celda vacía
                 performMoveAction(selectedUnitForAction, clickedGridPos);
            } else {
                ui.currentActionMessage.textContent = "La celda de destino está ocupada.";
            }
        }
    }
    updateUI();
}

function changeGameState(newState) {
    currentGameState = newState;
    // console.log("Game state changed to: ", newState);
    switch (newState) {
        case GAME_STATE.PLAYER_TURN_START:
            clearHighlights();
            if (selectedUnitForAction) {
                setUnitSelectionVisual(selectedUnitForAction, false);
                selectedUnitForAction = null;
            }
            unitActivationsThisTurn = 0;
            players[currentPlayerIndex].units.forEach(u => {
                u.hasBeenActivatedThisTurn = false; 
                u.hasMovedThisActivation = false; 
                u.hasAttackedThisActivation = false;
                 if (u.selectedIndicator) u.selectedIndicator.visible = false;
            });
            changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION);
            break;
        case GAME_STATE.SELECT_UNIT_FOR_ACTIVATION:
            ui.endUnitActionButton.style.display = 'none';
            ui.currentActionMessage.textContent = (unitActivationsThisTurn >= MAX_UNIT_ACTIVATIONS_PER_TURN) ?
                "Todas las activaciones usadas. Termina tu turno." :
                `Selecciona unidad (${MAX_UNIT_ACTIVATIONS_PER_TURN - unitActivationsThisTurn} restantes).`;
            break;
        case GAME_STATE.UNIT_ACTION_PENDING:
            if (!selectedUnitForAction) { 
                console.warn("UNIT_ACTION_PENDING sin selectedUnitForAction. Volviendo a SELECT_UNIT_FOR_ACTIVATION.");
                changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION); 
                return; 
            }
            ui.currentActionMessage.textContent = `Mueve o Ataca con ${selectedUnitForAction.type}.`;
            ui.endUnitActionButton.style.display = 'inline-block';
            showPossibleMoves(selectedUnitForAction);
            showAttackableTargets(selectedUnitForAction);
            break;
        case GAME_STATE.GAME_OVER:
            gameRunning = false; 
            break;
    }
    updateUI();
}

function setUnitSelectionVisual(unit, isSelected) {
    if (!unit) return;
    if (isSelected) {
        if (!unit.selectedIndicator) {
            const indicatorGeo = new THREE.RingGeometry(CELL_SIZE * 0.45, CELL_SIZE * 0.55, 32);
            unit.selectedIndicator = new THREE.Mesh(indicatorGeo, materials.selected_unit_indicator);
            unit.selectedIndicator.rotation.x = -Math.PI / 2;
            scene.add(unit.selectedIndicator);
        }
        // Posicionamiento del indicador ya se hace en animate()
    } else {
        if (unit.selectedIndicator) unit.selectedIndicator.visible = false;
    }
}

function selectUnitForActivation(unit) {
    if (selectedUnitForAction && selectedUnitForAction.selectedIndicator) {
       selectedUnitForAction.selectedIndicator.visible = false;
    }
    selectedUnitForAction = unit;
    setUnitSelectionVisual(unit, true);
    selectedUnitForAction.hasMovedThisActivation = false;
    selectedUnitForAction.hasAttackedThisActivation = false;
    changeGameState(GAME_STATE.UNIT_ACTION_PENDING);
}

function finalizeSelectedUnitAction() {
    if (!selectedUnitForAction) return;
    selectedUnitForAction.hasBeenActivatedThisTurn = true;
    setUnitSelectionVisual(selectedUnitForAction, false);
    selectedUnitForAction = null;
    unitActivationsThisTurn++;
    clearHighlights();
    if (unitActivationsThisTurn >= MAX_UNIT_ACTIVATIONS_PER_TURN) {
         ui.currentActionMessage.textContent = "Todas las activaciones usadas. Termina tu turno.";
         // Podrías forzar SELECT_UNIT_FOR_ACTIVATION para que se actualice el mensaje, 
         // o simplemente manejarlo en la UI.
         changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION); 
    } else {
        changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION); 
    }
}

function performMoveAction(unit, targetGridPos) {
    if (unit.hasMovedThisActivation || grid[targetGridPos.z][targetGridPos.x] !== null) return;
    
    grid[unit.gridPos.z][unit.gridPos.x] = null;
    unit.gridPos = { ...targetGridPos };
    grid[unit.gridPos.z][unit.gridPos.x] = unit;

    const worldPos = gridToWorld(targetGridPos.x, targetGridPos.z);
    unit.mesh.position.x = worldPos.x;
    unit.mesh.position.z = worldPos.z;

    if (unit.isGLB) {
        unit.mesh.position.y = 0; // Asumiendo pivote en la base para GLB
    } else {
        const unitHeightPrimitive = CELL_SIZE * UNIT_HEIGHT_SCALE * unit.stats.size.h;
        unit.mesh.position.y = unitHeightPrimitive / 2;
    }
    
    unit.hasMovedThisActivation = true;
    clearHighlights();
    showPossibleMoves(unit);
    showAttackableTargets(unit);
    ui.currentActionMessage.textContent = `${unit.type} movido. Puedes atacar o finalizar.`;
    updateUI();
}

function performAttackAction(attacker, defender) {
    if (attacker.hasAttackedThisActivation) return;
    changeGameState(GAME_STATE.PERFORMING_ACTION);
    ui.diceRollResult.textContent = "...";

    // Estimar la altura para la línea de ataque.
    // Esto es aproximado y podría necesitar ajustes según tus modelos.
    let attackerCenterY = attacker.mesh.position.y;
    if (attacker.isGLB) {
        // Para GLB, podríamos intentar obtener su altura de su bounding box
        // o usar una fracción de su escala si todos los modelos son proporcionales.
        // Aquí uso una estimación basada en la escala, asumiendo que modelScaleFactor
        // da una altura total aproximada igual a CELL_SIZE o similar.
        attackerCenterY += (attacker.mesh.scale.y * UNIT_HEIGHT_SCALE * CELL_SIZE * 0.25); // Mitad de una altura "típica"
    } else {
        attackerCenterY += (CELL_SIZE * UNIT_HEIGHT_SCALE * attacker.stats.size.h * 0.25); // Un poco por encima del centro de la primitiva
    }

    let defenderCenterY = defender.mesh.position.y;
    if (defender.isGLB) {
        defenderCenterY += (defender.mesh.scale.y * UNIT_HEIGHT_SCALE * CELL_SIZE * 0.25);
    } else {
        defenderCenterY += (CELL_SIZE * UNIT_HEIGHT_SCALE * defender.stats.size.h * 0.25);
    }

    const startPos = attacker.mesh.position.clone();
    startPos.y = attackerCenterY;
    
    const endPos = defender.mesh.position.clone();
    endPos.y = defenderCenterY;

    const points = [startPos, endPos];
    const attackLineMaterial = new THREE.LineBasicMaterial({ color: 0xff2222, linewidth: 3});
    const attackLineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const attackLine = new THREE.Line(attackLineGeometry, attackLineMaterial);
    scene.add(attackLine);

    setTimeout(() => {
        scene.remove(attackLine);
        const diceRoll = Math.floor(Math.random() * 6) + 1;
        const [minRoll, maxRoll] = attacker.stats.attackDie;
        let message = `${players[attacker.owner].name}'s ${attacker.type} ataca ${players[defender.owner].name}'s ${defender.type}. Tira ${diceRoll}. `;
        if (diceRoll >= minRoll && diceRoll <= maxRoll) {
            message += `¡IMPACTO! Unidad enemiga destruida.`;
            killUnit(defender);
        } else {
            message += "¡FALLO!";
        }
        ui.diceRollResult.textContent = message;
        attacker.hasAttackedThisActivation = true;
        
        // Si la unidad atacante sigue viva y seleccionada
        if (attacker.alive && selectedUnitForAction === attacker) {
            clearHighlights();
            showPossibleMoves(attacker); 
            showAttackableTargets(attacker);
            changeGameState(GAME_STATE.UNIT_ACTION_PENDING); 
        } else if (!attacker.alive && selectedUnitForAction === attacker) { // Si la unidad atacante murió (ej. contraataque futuro)
             selectedUnitForAction = null;
             clearHighlights();
             changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION);
        } else { // La unidad atacante está viva pero ya no es la seleccionada (no debería pasar aquí)
            changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION); 
        }
        
        updateUI();
        checkWinCondition();
    }, 700);
}

function killUnit(unit) {
    unit.alive = false;
    if (unit.mesh) scene.remove(unit.mesh);
    if (unit.selectedIndicator) {
        scene.remove(unit.selectedIndicator);
        unit.selectedIndicator = null;
    }
    if(grid[unit.gridPos.z]?.[unit.gridPos.x] === unit) {
        grid[unit.gridPos.z][unit.gridPos.x] = null;
    }

    if (selectedUnitForAction === unit) { // Si la unidad que muere era la activa
        selectedUnitForAction = null;
        clearHighlights();
        // Si la unidad activa muere, no se pueden realizar más acciones con ella.
        // Volver a la selección de unidad, no finalizar la acción (ya que no hay acción que finalizar).
        // Esto también evita que se cuente una activación si la unidad muere antes de hacer algo.
        // Sin embargo, si la unidad muere *después* de atacar, la activación ya contó.
        // El estado ya debería cambiar en performAttackAction.
        // Si la unidad muere por otra razón mientras está activa (ej. trampa futura),
        // esto la deselecciona y permite al jugador seleccionar otra.
        if (currentGameState === GAME_STATE.UNIT_ACTION_PENDING || currentGameState === GAME_STATE.PERFORMING_ACTION) {
             changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION);
        }
    }
}

function handleEndTurn() {
    if (selectedUnitForAction) { 
        finalizeSelectedUnitAction(); // Finaliza la acción de la unidad actual si hay una
    }
    currentPlayerIndex = (currentPlayerIndex + 1) % 2;
    changeGameState(GAME_STATE.PLAYER_TURN_START);
    ui.diceRollResult.textContent = "";
    checkWinCondition();
}

function checkWinCondition() { 
    if (!gameRunning && currentGameState !== GAME_STATE.START_MENU && currentGameState !== GAME_STATE.GAME_OVER) return;
    
    const p0AliveUnits = players[0].units.filter(u => u.alive).length;
    const p1AliveUnits = players[1].units.filter(u => u.alive).length;

    if ((p0AliveUnits === 0 || p1AliveUnits === 0) && gameRunning) { // Solo si el juego estaba corriendo
        gameRunning = false; // Detener el juego aquí
        let winnerMessage = (p0AliveUnits === 0 && p1AliveUnits === 0) ? "¡EMPATE! Todos aniquilados." :
                            (p1AliveUnits === 0) ? `¡${players[0].name.toUpperCase()} GANA!` :
                            `¡${players[1].name.toUpperCase()} GANA!`;
        ui.messageText.textContent = winnerMessage;
        ui.startButton.textContent = "Jugar de Nuevo";
        ui.messageOverlay.style.display = 'flex';
        changeGameState(GAME_STATE.GAME_OVER); // Cambiar estado a GAME_OVER
    }
}

function showPossibleMoves(unit) {
    clearHighlights('move');
    if (unit.hasMovedThisActivation) return; // No mostrar si ya movió
    const moves = []; 
    const { x, z } = unit.gridPos;
    const maxMove = unit.stats.move;
    
    let queue = [{x:x, z:z, dist:0}];
    let visited = new Set([`${x}_${z}`]);

    while(queue.length > 0){
        let curr = queue.shift();
        // Solo añadir a 'moves' si es una celda alcanzable y vacía (dist > 0)
        if(curr.dist > 0 && grid[curr.z]?.[curr.x] === null) {
             moves.push({x: curr.x, z: curr.z});
        }

        if(curr.dist < maxMove){
            const neighbors = [
                {x: curr.x + 1, z: curr.z}, {x: curr.x - 1, z: curr.z},
                {x: curr.x, z: curr.z + 1}, {x: curr.x, z: curr.z - 1}
            ];
            for(const n of neighbors){
                if(n.x >= 0 && n.x < GRID_SIZE_X && n.z >= 0 && n.z < GRID_SIZE_Z && // Dentro del tablero
                   !visited.has(`${n.x}_${n.z}`) && // No visitado
                   grid[n.z][n.x] === null) { // Celda vacía
                    visited.add(`${n.x}_${n.z}`);
                    queue.push({x:n.x, z:n.z, dist: curr.dist + 1});
                }
            }
        }
    }

    const highlightGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9);
    const hlMat = materials.highlight_move || new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.5, side:THREE.DoubleSide });
    moves.forEach(pos => {
        const hlMesh = new THREE.Mesh(highlightGeo, hlMat);
        const worldPos = gridToWorld(pos.x, pos.z);
        hlMesh.position.set(worldPos.x, 0.02, worldPos.z); // Ligeramente sobre el suelo
        hlMesh.rotation.x = -Math.PI / 2;
        hlMesh.userData = { ...pos, type: 'move_highlight' };
        scene.add(hlMesh);
        highlightMeshes.move.push(hlMesh);
    });
}

function showAttackableTargets(unit) {
    clearHighlights('attack');
    if (unit.hasAttackedThisActivation) return; // No mostrar si ya atacó
    const targets = [];
    const { x, z } = unit.gridPos;
    const range = unit.stats.attackRange;

    for (let r = 0; r < GRID_SIZE_Z; r++) {
        for (let c = 0; c < GRID_SIZE_X; c++) {
            const dist = Math.abs(x - c) + Math.abs(z - r); // Distancia Manhattan
            if (dist > 0 && dist <= range) { // Dentro del rango y no la propia celda
                const targetUnit = grid[r][c];
                if (targetUnit && targetUnit.owner !== unit.owner && targetUnit.alive) { // Unidad enemiga viva
                    targets.push({ x: c, z: r });
                }
            }
        }
    }

    const highlightGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9);
    const hlMat = materials.highlight_attack || new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.5, side:THREE.DoubleSide });
    targets.forEach(pos => {
        const hlMesh = new THREE.Mesh(highlightGeo, hlMat);
        const worldPos = gridToWorld(pos.x, pos.z);
        hlMesh.position.set(worldPos.x, 0.03, worldPos.z); // Ligeramente sobre el highlight de movimiento
        hlMesh.rotation.x = -Math.PI / 2;
        hlMesh.userData = { ...pos, type: 'attack_highlight' };
        scene.add(hlMesh);
        highlightMeshes.attack.push(hlMesh);
    });
}

function clearHighlights(type = null) {
    if (type === 'move' || type === null) {
        highlightMeshes.move.forEach(m => scene.remove(m));
        highlightMeshes.move = [];
    }
    if (type === 'attack' || type === null) {
        highlightMeshes.attack.forEach(m => scene.remove(m));
        highlightMeshes.attack = [];
    }
}

function isCellInHighlights(gridPos, highlightArray) { 
    return highlightArray.some(hl => hl.userData.x === gridPos.x && hl.userData.z === gridPos.z);
}

function updateUI() {
    const pData = [ui.p1Info, ui.p2Info];
    const pStatus = [ui.p1Status, ui.p2Status];
    const pUnitsLeft = [ui.p1UnitsLeft, ui.p2UnitsLeft];
    const pActionsLeft = [ui.p1ActionsLeft, ui.p2ActionsLeft];
    const pSelectedUnitInfo = [ui.p1SelectedUnitInfo, ui.p2SelectedUnitInfo];
    players.forEach((player, idx) => {
        const aliveCount = player.units.filter(u => u.alive).length;
        pUnitsLeft[idx].textContent = aliveCount;
        if (currentPlayerIndex === idx && gameRunning) {
            pData[idx].classList.add('active-player');
            pActionsLeft[idx].textContent = MAX_UNIT_ACTIVATIONS_PER_TURN - unitActivationsThisTurn;
            if (currentGameState === GAME_STATE.SELECT_UNIT_FOR_ACTIVATION) {
                pStatus[idx].textContent = (unitActivationsThisTurn >= MAX_UNIT_ACTIVATIONS_PER_TURN) ? "Sin activaciones" : "Selecciona unidad";
            } else if (currentGameState === GAME_STATE.UNIT_ACTION_PENDING && selectedUnitForAction?.owner === idx) {
                pStatus[idx].textContent = `Activando ${selectedUnitForAction.type}`;
            } else if (currentGameState === GAME_STATE.PERFORMING_ACTION && selectedUnitForAction?.owner === idx) {
                pStatus[idx].textContent = "Realizando acción...";
            }
             else {
                pStatus[idx].textContent = "Procesando..."; // Estado intermedio o desconocido
            }
            if (selectedUnitForAction?.owner === idx) {
                let info = `Unidad: ${selectedUnitForAction.type}<br>`;
                info += `Movido: ${selectedUnitForAction.hasMovedThisActivation ? 'Sí' : 'No'} | `;
                info += `Atacado: ${selectedUnitForAction.hasAttackedThisActivation ? 'Sí' : 'No'}`;
                pSelectedUnitInfo[idx].innerHTML = info;
            } else {
                pSelectedUnitInfo[idx].innerHTML = "Unidad: -";
            }
        } else {
            pData[idx].classList.remove('active-player');
            pActionsLeft[idx].textContent = "-";
            pStatus[idx].textContent = gameRunning ? "Esperando..." : (currentGameState === GAME_STATE.GAME_OVER ? "Fin de partida" : "En Menú");
            pSelectedUnitInfo[idx].innerHTML = "Unidad: -";
        }
    });
    if (gameRunning) {
        ui.currentPlayerTurn.textContent = `Turno de ${players[currentPlayerIndex].name}`;
        ui.endTurnButton.style.display = (currentGameState !== GAME_STATE.PERFORMING_ACTION) ? 'inline-block' : 'none';
        ui.endUnitActionButton.style.display = (currentGameState === GAME_STATE.UNIT_ACTION_PENDING && selectedUnitForAction) ? 'inline-block' : 'none';
    } else {
        ui.currentPlayerTurn.textContent = (currentGameState === GAME_STATE.GAME_OVER && ui.messageText.textContent) ? "" : "Tactics3D Grid";
        ui.currentActionMessage.textContent = (currentGameState === GAME_STATE.GAME_OVER && ui.messageText.textContent) ? "" : "Presiona Iniciar";
        ui.endTurnButton.style.display = 'none';
        ui.endUnitActionButton.style.display = 'none';
    }
 }

function gridToWorld(col, row) {
    const worldX = (col - (GRID_SIZE_X - 1) / 2) * CELL_SIZE;
    const worldZ = (row - (GRID_SIZE_Z - 1) / 2) * CELL_SIZE;
    return new THREE.Vector3(worldX, 0, worldZ);
}

function worldToGrid(worldPos) {
    const c = Math.round(worldPos.x / CELL_SIZE + (GRID_SIZE_X - 1) / 2);
    const r = Math.round(worldPos.z / CELL_SIZE + (GRID_SIZE_Z - 1) / 2);
    return {
        x: Math.max(0, Math.min(GRID_SIZE_X - 1, c)),
        z: Math.max(0, Math.min(GRID_SIZE_Z - 1, r)),
    };
}

function onWindowResize() { 
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

init();