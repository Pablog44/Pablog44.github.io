import * as THREE from 'three';

// --- Constants & Config ---
const GRID_SIZE_X = 10; // Columns - Fewer columns for more focused strategy
const GRID_SIZE_Z = 16; // Rows (depth)
const CELL_SIZE = 4;    // Size of each grid cell (like Bomberman block base)
const UNIT_BASE_SCALE = 0.6; // How much of CELL_SIZE units occupy horizontally
const UNIT_HEIGHT_SCALE = 0.8; // Vertical scale relative to CELL_SIZE

// Unit Types
const UNIT_TYPES = {
    ARCHER: 'Archer',
    SWORDSMAN: 'Swordsman',
    HORSEMAN: 'Horseman'
};

const UNIT_STATS = { // Sizes are relative to (CELL_SIZE * UNIT_BASE_SCALE) for radius/width and (CELL_SIZE * UNIT_HEIGHT_SCALE) for height
    [UNIT_TYPES.ARCHER]:    { move: 4, attackRange: 7, attackDie: [1, 2], geom: 'cylinder', size: {r: 0.3, h: 1.0} },
    [UNIT_TYPES.SWORDSMAN]: { move: 3, attackRange: 2, attackDie: [1, 4], geom: 'capsule',  size: {r: 0.35, h: 0.9} },
    [UNIT_TYPES.HORSEMAN]:  { move: 7, attackRange: 3, attackDie: [1, 3], geom: 'capsule',  size: {r: 0.4, h: 1.1} } // Horsemen could be wider capsules or boxes
};
const UNITS_PER_TYPE = 5;
const MAX_UNIT_ACTIVATIONS_PER_TURN = 3;

// Textures (Paths - CREATE A 'textures' FOLDER AND PUT YOUR IMAGES THERE)
// Recommend 128x128 or 256x256px textures
const TEXTURES = {
    floor_cell_p1: 'textures/floor_p1.png',     // e.g., red_bricks.png or similar
    floor_cell_p2: 'textures/floor_p2.png',     // e.g., blue_stone.png or similar
    unit_archer_p1: 'textures/archer_red.png',
    unit_swordsman_p1: 'textures/swordsman_red.png',
    unit_horseman_p1: 'textures/horseman_red.png',
    unit_archer_p2: 'textures/archer_blue.png',
    unit_swordsman_p2: 'textures/swordsman_blue.png',
    unit_horseman_p2: 'textures/horseman_blue.png',
    highlight_move: 'textures/highlight_move.png', // Optional: a glowing grid texture
    highlight_attack: 'textures/highlight_attack.png' // Optional: a red target texture
};

// Game States (same as before)
const GAME_STATE = {
    START_MENU: 'START_MENU',
    PLAYER_TURN_START: 'PLAYER_TURN_START',
    SELECT_UNIT_FOR_ACTIVATION: 'SELECT_UNIT_FOR_ACTIVATION',
    UNIT_ACTION_PENDING: 'UNIT_ACTION_PENDING',
    PERFORMING_ACTION: 'PERFORMING_ACTION',
    GAME_OVER: 'GAME_OVER'
};

// --- Global Variables --- (mostly same as before)
let scene, renderer, cameras = [];
let players = [
    { id: 0, units: [], name: "Jugador 1", color: 0xcc3333, texturePrefix: 'p1' },
    { id: 1, units: [], name: "Jugador 2", color: 0x3333cc, texturePrefix: 'p2' }
];
let grid = [];
let floorCells = {}; // "x_z": floorCellMesh
let materials = {};
let textureLoader = new THREE.TextureLoader();
let clock = new THREE.Clock();

let gameRunning = false;
let currentGameState = GAME_STATE.START_MENU;
let currentPlayerIndex = 0;
let unitActivationsThisTurn = 0;
let selectedUnitForAction = null;

let highlightMeshes = { move: [], attack: [] };
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
// UI Elements (same as before)
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
    scene.background = new THREE.Color(0x151020); // Darker background

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Cameras - Adjusted for Bomberman-like perspective
    for (let i = 0; i < 2; i++) {
        const camera = new THREE.PerspectiveCamera(60, (window.innerWidth / 2) / window.innerHeight, 0.1, 1000);
        const worldCenterX = 0; // Centered board
        const worldCenterZ = 0;

        camera.position.set(
            worldCenterX + (i === 0 ? -CELL_SIZE * 2.5 : CELL_SIZE * 2.5), // Sideways offset
            GRID_SIZE_Z * CELL_SIZE * 0.55,  // Height - lower than before for more angle
            worldCenterZ + GRID_SIZE_Z * CELL_SIZE * 0.3 // Start viewing from slightly "behind" center Z
        );
        camera.lookAt(
            worldCenterX + (i === 0 ? CELL_SIZE * 1.5 : -CELL_SIZE * 1.5), // Look towards opponent side
            -CELL_SIZE *1.5, // Look down onto the board
            worldCenterZ - GRID_SIZE_Z * CELL_SIZE * 0.1 // Look slightly towards the 'front' of board from camera POV
        );
        cameras.push(camera);
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Slightly less ambient
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); // Main directional
    directionalLight.position.set(CELL_SIZE * 5, CELL_SIZE * 10, CELL_SIZE * 3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = CELL_SIZE * 25;
    directionalLight.shadow.camera.left = -GRID_SIZE_X * CELL_SIZE * 0.7;
    directionalLight.shadow.camera.right = GRID_SIZE_X * CELL_SIZE * 0.7;
    directionalLight.shadow.camera.top = GRID_SIZE_Z * CELL_SIZE * 0.7;
    directionalLight.shadow.camera.bottom = -GRID_SIZE_Z * CELL_SIZE * 0.7;
    scene.add(directionalLight);
    // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera); scene.add(shadowHelper);

    // Hemisphere Light for softer fill
    const hemisphereLight = new THREE.HemisphereLight(0xaaaaee, 0x333355, 0.5);
    scene.add(hemisphereLight);

    loadMaterials(() => {
        createBoard(); // Create 3D grid cells
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
        updateUI();
        animate();
    });
}

function loadMaterials(callback) {
    let textureKeys = Object.keys(TEXTURES);
    let loadedCount = 0;
    const totalToLoad = textureKeys.length;

    function checkAllLoaded() {
        if (loadedCount === totalToLoad) {
            console.log("All textures processed.");
            if (callback) callback();
        }
    }

    function textureLoaded(textureKey) {
        console.log(`Texture loaded: ${textureKey}`);
        loadedCount++;
        checkAllLoaded();
    }
    function textureError(url, textureKey) {
        console.warn(`Failed to load texture: ${url}. Using fallback for ${textureKey}.`);
        // Assign a fallback colored material directly if load fails
        let fallbackColor = 0x888888; // Generic grey
        if (textureKey.includes('p1')) fallbackColor = players[0].color;
        else if (textureKey.includes('p2')) fallbackColor = players[1].color;
        else if (textureKey.includes('highlight_move')) fallbackColor = 0x00ccff;
        else if (textureKey.includes('highlight_attack')) fallbackColor = 0xff3300;
        
        materials[textureKey] = new THREE.MeshStandardMaterial({ 
            color: fallbackColor,
            metalness: 0.1, 
            roughness: 0.9 
        });
        if (textureKey.includes('highlight')) { // Highlights are often basic materials
            materials[textureKey] = new THREE.MeshBasicMaterial({
                color: fallbackColor,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
        }
        loadedCount++; // Count as processed
        checkAllLoaded();
    }

    if (totalToLoad === 0) {
        console.warn("No textures defined in TEXTURES. Using default colors.");
        // Create basic colored materials for everything
        materials.floor_cell_p1 = new THREE.MeshStandardMaterial({ color: players[0].color, metalness: 0.1, roughness: 0.9 });
        materials.floor_cell_p2 = new THREE.MeshStandardMaterial({ color: players[1].color, metalness: 0.1, roughness: 0.9 });
        // Units will use player.color if specific textures fail
        Object.values(UNIT_TYPES).forEach(type => {
            materials[`unit_${type.toLowerCase()}_p1`] = new THREE.MeshStandardMaterial({ color: players[0].color });
            materials[`unit_${type.toLowerCase()}_p2`] = new THREE.MeshStandardMaterial({ color: players[1].color });
        });
        materials.highlight_move = new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        materials.highlight_attack = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        if (callback) callback();
        return;
    }

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
                textureLoaded(key);
            },
            undefined, // onProgress callback (optional)
            (err) => { // onError callback
                textureError(path, key);
            }
        );
    });

    // Default for selected unit indicator (non-textured)
    materials.selected_unit_indicator = new THREE.MeshBasicMaterial({color: 0xf0e68c, transparent: true, opacity: 0.7, side: THREE.DoubleSide});
}


function createBoard() {
    grid = Array(GRID_SIZE_Z).fill(null).map(() => Array(GRID_SIZE_X).fill(null));
    floorCells = {};

    const cellGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);

    for (let r = 0; r < GRID_SIZE_Z; r++) {
        for (let c = 0; c < GRID_SIZE_X; c++) {
            let materialKey;
            // Player 1's half (e.g., Z < GRID_SIZE_Z / 2)
            if (r < Math.floor(GRID_SIZE_Z / 2)) {
                materialKey = 'floor_cell_p1';
            } else { // Player 2's half
                materialKey = 'floor_cell_p2';
            }
            
            const cellMaterial = materials[materialKey] ? materials[materialKey] : 
                                 new THREE.MeshStandardMaterial({ color: (r < GRID_SIZE_Z / 2 ? players[0].color : players[1].color), metalness:0.1, roughness:0.9});

            const cellMesh = new THREE.Mesh(cellGeometry, cellMaterial);
            const worldPos = gridToWorld(c, r); // Get center of cell at y=0
            cellMesh.position.copy(worldPos);
            cellMesh.position.y = -CELL_SIZE / 2; // Offset down so top surface is at y=0
            
            cellMesh.receiveShadow = true;
            // cellMesh.castShadow = true; // Floor blocks usually don't need to cast shadows
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
        player.units = []; // Clear previous units if any (for restart)
        let unitsToPlaceTotal = UNITS_PER_TYPE * 3; // 15 units
        
        // Player 0: Start from Z=0, Player 1: Start from Z=GRID_SIZE_Z-1
        const startRow = (playerIdx === 0) ? 1 : GRID_SIZE_Z - 2; // Leave row 0 and last row as buffer/border
        const rowDirection = (playerIdx === 0) ? 1 : -1;
        
        let unitsPlacedCount = 0;
        for (let zRowOffset = 0; zRowOffset < 3; zRowOffset++) { // Deploy in 3 rows
            const currentZ = startRow + (zRowOffset * rowDirection);
            if (currentZ < 0 || currentZ >= GRID_SIZE_Z) continue;

            // Spread units across X, e.g. from X=1 to X=GRID_SIZE_X-2
            // Try to center 5 units per row
            let startX = Math.max(1, Math.floor((GRID_SIZE_X - UNITS_PER_TYPE) / 2));
            
            for (let xColOffset = 0; xColOffset < UNITS_PER_TYPE; xColOffset++) {
                if (unitsPlacedCount >= unitsToPlaceTotal) break;
                
                const currentX = startX + xColOffset;
                if (currentX >= GRID_SIZE_X -1 || currentX < 1 ) continue; // Ensure within bounds (not on edge columns 0 and max)

                const type = unitTypesCycle[unitsPlacedCount % 3];

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
    let geometry;
    
    const unitWidth = CELL_SIZE * UNIT_BASE_SCALE * stats.size.r * 2; // For cylinder/capsule radius
    const unitHeight = CELL_SIZE * UNIT_HEIGHT_SCALE * stats.size.h;

    if (stats.geom === 'cylinder') {
        geometry = new THREE.CylinderGeometry(unitWidth / 2, unitWidth / 2, unitHeight, 16);
    } else { // capsule (Swordsman, Horseman)
        geometry = new THREE.CapsuleGeometry(unitWidth / 2, unitHeight - unitWidth, 8, 16); // Capsule length is total height minus sphere caps
    }
    
    const textureKey = `unit_${type.toLowerCase()}_${player.texturePrefix}`;
    let unitMaterial = materials[textureKey];
    if (!unitMaterial || !unitMaterial.map) { // Fallback if texture or map is missing for this specific unit
        console.warn(`Texture or map missing for ${textureKey}, using player color.`);
        unitMaterial = new THREE.MeshStandardMaterial({ color: player.color, metalness:0.2, roughness:0.7 });
    } else {
        unitMaterial = unitMaterial.clone(); // Clone if using a shared textured material
    }


    const mesh = new THREE.Mesh(geometry, unitMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    const worldPos = gridToWorld(gridPos.x, gridPos.z); // Center of cell at y=0
    mesh.position.copy(worldPos);
    mesh.position.y = unitHeight / 2; // Bottom of unit at y=0

    const unit = {
        id: id,
        owner: playerIdx,
        type: type,
        stats: stats,
        gridPos: { ...gridPos },
        mesh: mesh,
        alive: true,
        hasBeenActivatedThisTurn: false,
        hasMovedThisActivation: false,
        hasAttackedThisActivation: false,
        selectedIndicator: null
    };
    mesh.userData = { unitId: id, owner: playerIdx, type: 'unit' };

    player.units.push(unit);
    grid[gridPos.z][gridPos.x] = unit;
    scene.add(mesh);
    return unit;
}

function startGame() {
    // Full Reset
    players.forEach(p => {
        p.units.forEach(u => { 
            if (u.mesh) scene.remove(u.mesh); 
            if(u.selectedIndicator) scene.remove(u.selectedIndicator); 
        });
        p.units = [];
    });
    grid = Array(GRID_SIZE_Z).fill(null).map(() => Array(GRID_SIZE_X).fill(null)); // Reset logical grid
    clearHighlights(); // Clear any visual highlights
    
    // Object.values(floorCells).forEach(cell => scene.remove(cell)); //Optionally remove and recreate board if textures could change (not in this setup)
    // floorCells = {};
    // createBoard(); // If board needs full reset

    selectedUnitForAction = null;
    unitActivationsThisTurn = 0;
    currentPlayerIndex = 0; // Player 1 starts

    // Re-populate units
    setupInitialUnits();

    ui.messageOverlay.style.display = 'none';
    gameRunning = true;
    if (!clock.running) clock.start();
    else clock.getDelta(); // Reset delta if restarting mid-game

    changeGameState(GAME_STATE.PLAYER_TURN_START);
}


// --- Game Loop & Logic --- (Largely same as before, key interaction points below)
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (selectedUnitForAction && selectedUnitForAction.selectedIndicator) {
        const unitMeshPos = selectedUnitForAction.mesh.position;
        selectedUnitForAction.selectedIndicator.position.set(unitMeshPos.x, 0.1, unitMeshPos.z); // Keep on floor
        selectedUnitForAction.selectedIndicator.visible = true; // Ensure it's visible
    }
    
    renderer.clear();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const halfWidth = width / 2;

    renderer.setViewport(0, 0, halfWidth, height);
    renderer.setScissor(0, 0, halfWidth, height);
    renderer.setScissorTest(true);
    if (cameras[0]) renderer.render(scene, cameras[0]);

    renderer.setViewport(halfWidth, 0, halfWidth, height);
    renderer.setScissor(halfWidth, 0, halfWidth, height);
    if (cameras[1]) renderer.render(scene, cameras[1]);
}

function onMouseClick(event) {
    if (!gameRunning || currentGameState === GAME_STATE.PERFORMING_ACTION || currentGameState === GAME_STATE.GAME_OVER) return;

    const screenHalf = (event.clientX < window.innerWidth / 2) ? 0 : 1;
    if (screenHalf !== currentPlayerIndex) return; 

    mouse.x = (event.clientX / (window.innerWidth / 2)) * 2 - 1;
    if (screenHalf === 1) mouse.x = ((event.clientX - window.innerWidth / 2) / (window.innerWidth / 2)) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, cameras[currentPlayerIndex]);
    const intersects = raycaster.intersectObjects(scene.children, true); // True for recursive

    let clickedGridPos = null;
    let clickedOnUnitObject = null;
    let clickedOnFloorCellUserData = null;

    for (const intersect of intersects) {
        const objUserData = intersect.object.userData;
        if (objUserData) {
            if (objUserData.type === 'unit') {
                clickedOnUnitObject = players[objUserData.owner].units.find(u => u.id === objUserData.unitId && u.alive);
                if (clickedOnUnitObject) clickedGridPos = clickedOnUnitObject.gridPos;
                break; 
            }
            if (objUserData.type === 'floor_cell') {
                clickedGridPos = { x: objUserData.gridX, z: objUserData.gridZ };
                clickedOnFloorCellUserData = objUserData;
                break;
            }
             // Check for highlight meshes if they are interactable, e.g., for direct click confirmation
            if (objUserData.type === 'move_highlight' || objUserData.type === 'attack_highlight') {
                clickedGridPos = { x: objUserData.x, z: objUserData.z }; // Highlights store grid pos
                // No need to break, unit/floor takes precedence if under highlight
            }
        }
    }
    
    if (!clickedGridPos) return; 

    if (currentGameState === GAME_STATE.SELECT_UNIT_FOR_ACTIVATION) {
        if (clickedOnUnitObject && clickedOnUnitObject.owner === currentPlayerIndex && !clickedOnUnitObject.hasBeenActivatedThisTurn) {
            selectUnitForActivation(clickedOnUnitObject);
        }
    } else if (currentGameState === GAME_STATE.UNIT_ACTION_PENDING && selectedUnitForAction) {
        if (clickedOnUnitObject && clickedOnUnitObject.owner !== currentPlayerIndex && clickedOnUnitObject.alive) { // Clicked enemy
            if (isCellInHighlights(clickedGridPos, highlightMeshes.attack) && !selectedUnitForAction.hasAttackedThisActivation) {
                performAttackAction(selectedUnitForAction, clickedOnUnitObject);
            }
        }
        // Clicked on floor or own unit (which is not an enemy)
        else if (isCellInHighlights(clickedGridPos, highlightMeshes.move) && !selectedUnitForAction.hasMovedThisActivation) {
            // Ensure the target cell for movement is actually empty (grid[z][x] === null)
            if (grid[clickedGridPos.z][clickedGridPos.x] === null) {
                 performMoveAction(selectedUnitForAction, clickedGridPos);
            } else {
                ui.currentActionMessage.textContent = "La celda de destino está ocupada.";
            }
        }
    }
    updateUI();
}

function changeGameState(newState) {
    // console.log(`GS: ${currentGameState} -> ${newState}`);
    currentGameState = newState;

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
                 if (u.selectedIndicator) u.selectedIndicator.visible = false; // Hide all indicators
            });
            changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION);
            break;

        case GAME_STATE.SELECT_UNIT_FOR_ACTIVATION:
            ui.endUnitActionButton.style.display = 'none';
            if (unitActivationsThisTurn >= MAX_UNIT_ACTIVATIONS_PER_TURN) {
                ui.currentActionMessage.textContent = "Todas las activaciones usadas. Termina tu turno.";
            } else {
                ui.currentActionMessage.textContent = `Selecciona unidad (${MAX_UNIT_ACTIVATIONS_PER_TURN - unitActivationsThisTurn} restantes).`;
            }
            break;

        case GAME_STATE.UNIT_ACTION_PENDING:
            if (!selectedUnitForAction) {
                changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION); return;
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
        if (!unit.selectedIndicator) { // Create if doesn't exist
            const indicatorGeo = new THREE.RingGeometry(CELL_SIZE * 0.45, CELL_SIZE * 0.55, 32);
            unit.selectedIndicator = new THREE.Mesh(indicatorGeo, materials.selected_unit_indicator);
            unit.selectedIndicator.rotation.x = -Math.PI / 2;
            scene.add(unit.selectedIndicator);
        }
        // Position and show are handled in animate loop for selected unit
    } else { // Deselect
        if (unit.selectedIndicator) {
            unit.selectedIndicator.visible = false;
        }
    }
}


function selectUnitForActivation(unit) {
    if (selectedUnitForAction && selectedUnitForAction.selectedIndicator) { // Deselect previous
       selectedUnitForAction.selectedIndicator.visible = false;
    }

    selectedUnitForAction = unit;
    setUnitSelectionVisual(unit, true); // Will make its indicator visible in animate
    
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
        changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION); 
    } else {
        changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION); 
    }
}

function performMoveAction(unit, targetGridPos) {
    if (unit.hasMovedThisActivation || grid[targetGridPos.z][targetGridPos.x] !== null) return;

    grid[unit.gridPos.z][unit.gridPos.x] = null;
    unit.gridPos = { ...targetGridPos }; // Update logical position
    grid[unit.gridPos.z][unit.gridPos.x] = unit;
    
    const worldPos = gridToWorld(targetGridPos.x, targetGridPos.z);
    const unitHeight = CELL_SIZE * UNIT_HEIGHT_SCALE * unit.stats.size.h;
    unit.mesh.position.set(worldPos.x, unitHeight / 2, worldPos.z);

    unit.hasMovedThisActivation = true;
    clearHighlights(); // Clear old highlights
    showPossibleMoves(unit); // Will show nothing new if it just moved
    showAttackableTargets(unit); // Update attack options from new position
    ui.currentActionMessage.textContent = `${unit.type} movido. Puedes atacar o finalizar.`;
    updateUI();
}

function performAttackAction(attacker, defender) {
    if (attacker.hasAttackedThisActivation) return;

    changeGameState(GAME_STATE.PERFORMING_ACTION);
    ui.diceRollResult.textContent = "...";

    const startPos = attacker.mesh.position.clone();
    const endPos = defender.mesh.position.clone();
    startPos.y += (CELL_SIZE * UNIT_HEIGHT_SCALE * attacker.stats.size.h) * 0.1; // slightly above unit center
    endPos.y += (CELL_SIZE * UNIT_HEIGHT_SCALE * defender.stats.size.h) * 0.1;

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
        
        clearHighlights();
        showPossibleMoves(attacker); 
        showAttackableTargets(attacker);         
        changeGameState(GAME_STATE.UNIT_ACTION_PENDING); 
        updateUI();
        checkWinCondition();
    }, 700); // Attack animation duration
}

function killUnit(unit) {
    unit.alive = false;
    if (unit.mesh) scene.remove(unit.mesh);
    if (unit.selectedIndicator) { // Also remove its selection ring
        scene.remove(unit.selectedIndicator);
        unit.selectedIndicator = null;
    }
    if(grid[unit.gridPos.z]?.[unit.gridPos.x] === unit) { // Ensure it's this unit
        grid[unit.gridPos.z][unit.gridPos.x] = null;
    }
    
    if (selectedUnitForAction === unit) {
        selectedUnitForAction = null; // Clear selection if the active unit dies
        // If an active unit dies, its action is over. Move to next selection or end turn.
        changeGameState(GAME_STATE.SELECT_UNIT_FOR_ACTIVATION); 
    }
}

function handleEndTurn() {
    if (selectedUnitForAction) { 
        finalizeSelectedUnitAction();
    }
    currentPlayerIndex = (currentPlayerIndex + 1) % 2;
    changeGameState(GAME_STATE.PLAYER_TURN_START);
    ui.diceRollResult.textContent = "";
    checkWinCondition();
}

function checkWinCondition() { /* Same as before */ 
    if (!gameRunning && currentGameState !== GAME_STATE.START_MENU && currentGameState !== GAME_STATE.GAME_OVER) return;

    const p0AliveUnits = players[0].units.filter(u => u.alive).length;
    const p1AliveUnits = players[1].units.filter(u => u.alive).length;

    if ((p0AliveUnits === 0 || p1AliveUnits === 0) && gameRunning) { // Only trigger if game was running
        gameRunning = false; // Stop further game logic updates
        let winnerMessage;
        if (p0AliveUnits === 0 && p1AliveUnits === 0) {
            winnerMessage = "¡EMPATE! Todos aniquilados.";
        } else if (p1AliveUnits === 0) {
            winnerMessage = `¡${players[0].name.toUpperCase()} GANA!`;
        } else {
            winnerMessage = `¡${players[1].name.toUpperCase()} GANA!`;
        }
        ui.messageText.textContent = winnerMessage;
        ui.startButton.textContent = "Jugar de Nuevo";
        ui.messageOverlay.style.display = 'flex';
        changeGameState(GAME_STATE.GAME_OVER);
    }
}

// --- Highlighting ---
function showPossibleMoves(unit) { /* Mostly same logic, ensure use of textured/colored highlights */
    clearHighlights('move');
    if (unit.hasMovedThisActivation) return;
    const moves = []; /* BFS logic same as before */
    const { x, z } = unit.gridPos;
    const maxMove = unit.stats.move;
    let queue = [{x:x, z:z, dist:0}];
    let visited = new Set([`${x}_${z}`]);

    while(queue.length > 0){
        let curr = queue.shift();
        if(curr.dist > 0 && grid[curr.z]?.[curr.x] === null) moves.push({x: curr.x, z: curr.z});
        if(curr.dist < maxMove){
            const neighbors = [
                {x: curr.x + 1, z: curr.z}, {x: curr.x - 1, z: curr.z},
                {x: curr.x, z: curr.z + 1}, {x: curr.x, z: curr.z - 1}
            ];
            for(const n of neighbors){
                if(n.x >= 0 && n.x < GRID_SIZE_X && n.z >= 0 && n.z < GRID_SIZE_Z &&
                   !visited.has(`${n.x}_${n.z}`) && grid[n.z][n.x] === null) { 
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
        hlMesh.position.set(worldPos.x, 0.02, worldPos.z); // Slightly above floor cells
        hlMesh.rotation.x = -Math.PI / 2;
        hlMesh.userData = { ...pos, type: 'move_highlight' };
        scene.add(hlMesh);
        highlightMeshes.move.push(hlMesh);
    });
}

function showAttackableTargets(unit) { /* Mostly same logic, ensure use of textured/colored highlights */
    clearHighlights('attack');
    if (unit.hasAttackedThisActivation) return;
    const targets = []; /* Range check logic same as before */
    const { x, z } = unit.gridPos;
    const range = unit.stats.attackRange;
    for (let r = 0; r < GRID_SIZE_Z; r++) {
        for (let c = 0; c < GRID_SIZE_X; c++) {
            const dist = Math.abs(x - c) + Math.abs(z - r);
            if (dist > 0 && dist <= range) {
                const targetUnit = grid[r][c];
                if (targetUnit && targetUnit.owner !== unit.owner && targetUnit.alive) {
                    targets.push({ x: c, z: r });
                }
            }
        }
    }

    const highlightGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9); // Flat plane for attack too
    const hlMat = materials.highlight_attack || new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.5, side:THREE.DoubleSide });

    targets.forEach(pos => {
        const hlMesh = new THREE.Mesh(highlightGeo, hlMat);
        const worldPos = gridToWorld(pos.x, pos.z);
        hlMesh.position.set(worldPos.x, 0.03, worldPos.z); // Slightly higher than move highlight
        hlMesh.rotation.x = -Math.PI / 2;
        hlMesh.userData = { ...pos, type: 'attack_highlight' };
        scene.add(hlMesh);
        highlightMeshes.attack.push(hlMesh);
    });
}

function clearHighlights(type = null) { /* Same as before */
    if (type === 'move' || type === null) {
        highlightMeshes.move.forEach(m => scene.remove(m));
        highlightMeshes.move = [];
    }
    if (type === 'attack' || type === null) {
        highlightMeshes.attack.forEach(m => scene.remove(m));
        highlightMeshes.attack = [];
    }
}
function isCellInHighlights(gridPos, highlightArray) { /* Same as before */ 
    return highlightArray.some(hl => hl.userData.x === gridPos.x && hl.userData.z === gridPos.z);
}

// --- UI Update ---
function updateUI() { /* Same as before, check element IDs */
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
            } else {
                pStatus[idx].textContent = "Procesando...";
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
        ui.endTurnButton.style.display = 'inline-block';
        ui.endUnitActionButton.style.display = (currentGameState === GAME_STATE.UNIT_ACTION_PENDING && selectedUnitForAction) ? 'inline-block' : 'none';
    } else {
        ui.currentPlayerTurn.textContent = (currentGameState === GAME_STATE.GAME_OVER && ui.messageText.textContent) ? "" : "Tactics3D Grid";
        ui.currentActionMessage.textContent = (currentGameState === GAME_STATE.GAME_OVER && ui.messageText.textContent) ? "" : "Presiona Iniciar";
        ui.endTurnButton.style.display = 'none';
        ui.endUnitActionButton.style.display = 'none';
    }
 }


// --- Utilities ---
function gridToWorld(col, row) { // c = x, r = z
    // This places (0,0) of grid at world (0,0)
    const worldX = (col - (GRID_SIZE_X - 1) / 2) * CELL_SIZE;
    const worldZ = (row - (GRID_SIZE_Z - 1) / 2) * CELL_SIZE;
    return new THREE.Vector3(worldX, 0, worldZ); // Y=0 is the top surface of floor cells
}

// worldToGrid is mainly for mouse picking if not hitting a specific object with userData
function worldToGrid(worldPos) {
    const c = Math.round(worldPos.x / CELL_SIZE + (GRID_SIZE_X - 1) / 2);
    const r = Math.round(worldPos.z / CELL_SIZE + (GRID_SIZE_Z - 1) / 2);
    return {
        x: Math.max(0, Math.min(GRID_SIZE_X - 1, c)),
        z: Math.max(0, Math.min(GRID_SIZE_Z - 1, r)),
    };
}

// --- Event Handlers ---
function onWindowResize() { /* Same as before */ 
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    cameras.forEach(cam => {
        cam.aspect = (width / 2) / height;
        cam.updateProjectionMatrix();
    });
}

// --- Start ---
init();