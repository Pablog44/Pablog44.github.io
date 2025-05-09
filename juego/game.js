import * as THREE from 'three';

// --- Constants & Config ---
const GRID_SIZE_X = 20; // Width
const GRID_SIZE_Z = 15; // Depth (Height on screen)
const CELL_SIZE = 5;
const UNIT_HEIGHT_OFFSET = CELL_SIZE / 2; // To place base of unit on cell "floor"

// Unit Types
const UNIT_TYPES = {
    ARCHER: 'Archer',
    SWORDSMAN: 'Swordsman',
    HORSEMAN: 'Horseman'
};

const UNIT_STATS = {
    [UNIT_TYPES.ARCHER]:    { move: 4, attackRange: 7, attackDie: [1, 2], color: 0x00ff00, size: {r: 0.3, h: 0.8} }, // Green
    [UNIT_TYPES.SWORDSMAN]: { move: 3, attackRange: 2, attackDie: [1, 4], color: 0x0000ff, size: {r: 0.35, h: 1.0} }, // Blue
    [UNIT_TYPES.HORSEMAN]:  { move: 7, attackRange: 3, attackDie: [1, 3], color: 0xffff00, size: {r: 0.4, h: 1.2} }  // Yellow
};

const MAX_ACTIONS_PER_TURN = 3;

// Game States
const GAME_STATE = {
    START_MENU: 'START_MENU',
    SELECT_UNIT: 'SELECT_UNIT',
    UNIT_SELECTED: 'UNIT_SELECTED', // Unit selected, can move or attack
    PERFORMING_ACTION: 'PERFORMING_ACTION', // Prevents input during brief "animations"
    GAME_OVER: 'GAME_OVER'
};

// --- Global Variables ---
let scene, renderer, cameras = [];
let players = [{ id: 0, units: [], color: 0xff6666 }, { id: 1, units: [], color: 0x6666ff }]; // P1 Reddish, P2 Bluish team colors
let grid = []; // Logical grid for unit positions
let floorMesh;
let clock = new THREE.Clock();
let gameRunning = false;
let currentGameState = GAME_STATE.START_MENU;
let currentPlayerIndex = 0;
let actionsTakenThisTurn = 0; // Number of units activated this turn
let selectedUnit = null;
let highlightMeshes = { move: [], attack: [] };
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// UI Elements
const ui = {
    p1Info: document.getElementById('player1-info'),
    p2Info: document.getElementById('player2-info'),
    p1Status: document.getElementById('p1-status'),
    p2Status: document.getElementById('p2-status'),
    p1UnitsLeft: document.getElementById('p1-units-left'),
    p2UnitsLeft: document.getElementById('p2-units-left'),
    p1ActionsLeft: document.getElementById('p1-actions-left'),
    p2ActionsLeft: document.getElementById('p2-actions-left'),
    messageOverlay: document.getElementById('message-overlay'),
    messageText: document.getElementById('message-text'),
    startButton: document.getElementById('start-button'),
    currentPlayerTurn: document.getElementById('current-player-turn'),
    currentActionMessage: document.getElementById('current-action-message'),
    diceRollResult: document.getElementById('dice-roll-result'),
    endTurnButton: document.getElementById('end-turn-button'),
};

// --- Initialization ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x303045);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.autoClear = false;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // Cameras
    for (let i = 0; i < 2; i++) {
        const camera = new THREE.PerspectiveCamera(50, (window.innerWidth / 2) / window.innerHeight, 0.1, 2000);
        // Position cameras to look down at their respective sides of the board
        const xPos = (GRID_SIZE_X * CELL_SIZE) * (i === 0 ? -0.35 : 0.35); // P1 left, P2 right
        const zPos = (GRID_SIZE_Z * CELL_SIZE) * 0.2; // Slightly towards their own side from center
        camera.position.set(xPos, GRID_SIZE_Z * CELL_SIZE * 1.2, zPos + (i === 0 ? CELL_SIZE * 5 : -CELL_SIZE*5) );
        camera.lookAt(xPos, 0, zPos);
        cameras.push(camera);
    }
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    createLevelGeometry();
    setupInitialUnits();

    ui.startButton.onclick = startGame;
    ui.endTurnButton.onclick = () => {
        if (gameRunning && currentGameState !== GAME_STATE.PERFORMING_ACTION) {
            switchTurn();
        }
    };

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('click', onMouseClick);
    
    updateUI();
    animate();
}

function createLevelGeometry() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(GRID_SIZE_X * CELL_SIZE, GRID_SIZE_Z * CELL_SIZE);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x606075, side: THREE.DoubleSide });
    floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(GRID_SIZE_X * CELL_SIZE, GRID_SIZE_X, 0xffffff, 0xffffff);
    gridHelper.position.y = 0.01; // Slightly above floor
    const gridHelperZ = new THREE.GridHelper(GRID_SIZE_Z * CELL_SIZE, GRID_SIZE_Z, 0xffffff, 0xffffff);
    gridHelperZ.position.y = 0.01;
    gridHelperZ.rotation.x = Math.PI/2;

    // Custom grid lines to match cells
    const material = new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.3 });
    for (let i = 0; i <= GRID_SIZE_Z; i++) {
        const points = [];
        points.push(new THREE.Vector3(-GRID_SIZE_X * CELL_SIZE / 2, 0.02, i * CELL_SIZE - GRID_SIZE_Z * CELL_SIZE / 2));
        points.push(new THREE.Vector3(GRID_SIZE_X * CELL_SIZE / 2, 0.02, i * CELL_SIZE - GRID_SIZE_Z * CELL_SIZE / 2));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
    }
    for (let i = 0; i <= GRID_SIZE_X; i++) {
        const points = [];
        points.push(new THREE.Vector3(i * CELL_SIZE - GRID_SIZE_X * CELL_SIZE / 2, 0.02, -GRID_SIZE_Z * CELL_SIZE / 2));
        points.push(new THREE.Vector3(i * CELL_SIZE - GRID_SIZE_X * CELL_SIZE / 2, 0.02, GRID_SIZE_Z * CELL_SIZE / 2));
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        scene.add(line);
    }

    // Initialize logical grid
    grid = Array(GRID_SIZE_Z).fill(null).map(() => Array(GRID_SIZE_X).fill(null));
}

function setupInitialUnits() {
    let unitIdCounter = 0;
    const unitTypesToPlace = [
        ...Array(5).fill(UNIT_TYPES.ARCHER),
        ...Array(5).fill(UNIT_TYPES.SWORDSMAN),
        ...Array(5).fill(UNIT_TYPES.HORSEMAN)
    ];

    [0, 1].forEach(playerIdx => {
        players[playerIdx].units = [];
        let unitsPlaced = 0;
        // Player 0: Top rows, Player 1: Bottom rows
        const startZ = (playerIdx === 0) ? 1 : GRID_SIZE_Z - 4; // P0 starts near z=1,2,3 P1 near GRID_SIZE_Z-2,-3,-4
        
        for (let zOffset = 0; zOffset < 3; zOffset++) { // Spread over 3 rows
            for (let x = Math.floor(GRID_SIZE_X / 2) - 2; x < Math.floor(GRID_SIZE_X / 2) + 3; x++) { // 5 units per row near center
                if (unitsPlaced < unitTypesToPlace.length) {
                    const type = unitTypesToPlace[unitsPlaced];
                    const gridPos = { x: x, z: startZ + zOffset };
                    if(grid[gridPos.z]?.[gridPos.x] === null) { // Check if cell is valid and empty
                         createUnit(playerIdx, type, gridPos, unitIdCounter++);
                         unitsPlaced++;
                    } else { // Try next available X if center is full for some reason
                        for(let altX = 0; altX < GRID_SIZE_X; altX++) {
                            if(grid[gridPos.z]?.[altX] === null) {
                                gridPos.x = altX;
                                createUnit(playerIdx, type, gridPos, unitIdCounter++);
                                unitsPlaced++;
                                break;
                            }
                        }
                    }
                }
            }
        }
    });
}

function createUnit(playerIdx, type, gridPos, id) {
    const stats = UNIT_STATS[type];
    let geometry;
    // Simple geometries: Archer (tall cylinder), Swordsman (capsule), Horseman (wider/longer capsule or box)
    if (type === UNIT_TYPES.ARCHER) {
        geometry = new THREE.CylinderGeometry(stats.size.r * CELL_SIZE, stats.size.r * CELL_SIZE, stats.size.h * CELL_SIZE, 16);
    } else if (type === UNIT_TYPES.SWORDSMAN) {
        geometry = new THREE.CapsuleGeometry(stats.size.r * CELL_SIZE, stats.size.h * CELL_SIZE * 0.7, 8, 16);
    } else { // Horseman
        geometry = new THREE.CapsuleGeometry(stats.size.r * CELL_SIZE, stats.size.h * CELL_SIZE, 8, 16);
        // Could also use a BoxGeometry for horsemen for more distinction
        // geometry = new THREE.BoxGeometry(stats.size.r * CELL_SIZE * 2, stats.size.h * CELL_SIZE, stats.size.r * CELL_SIZE * 1.2);
    }
    
    const material = new THREE.MeshStandardMaterial({ color: stats.color, emissive: players[playerIdx].color, emissiveIntensity: 0.3 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.copy(gridToWorld(gridPos));
    mesh.position.y = stats.size.h * CELL_SIZE / 2; // Adjust base to floor
    if (type === UNIT_TYPES.ARCHER) mesh.position.y = stats.size.h * CELL_SIZE / 2;


    const unit = {
        id: id,
        owner: playerIdx,
        type: type,
        stats: stats,
        gridPos: { ...gridPos },
        mesh: mesh,
        alive: true,
        movedThisAction: false, // Has moved in the current selected unit's action
        attackedThisAction: false, // Has attacked in the current selected unit's action
        activatedThisTurn: false, // Has this unit been one of the 3 activated units this turn?
    };
    mesh.userData = { unitId: id, owner: playerIdx, type: 'unit' }; // Link mesh back to unit data

    players[playerIdx].units.push(unit);
    grid[gridPos.z][gridPos.x] = unit;
    scene.add(mesh);
    return unit;
}

function startGame() {
    ui.messageOverlay.style.display = 'none';
    gameRunning = true;
    currentGameState = GAME_STATE.SELECT_UNIT;
    currentPlayerIndex = 0; // Player 1 starts
    actionsTakenThisTurn = 0;
    resetUnitTurnStatus();
    updateUI();
    clock.start();
}

function resetGame() { // Called if implementing a play again feature
    console.log("Resetting game (not fully implemented, needs to clear units etc)");
    // Clear units from scene and players array
    players.forEach(p => {
        p.units.forEach(u => {
            if (u.mesh) scene.remove(u.mesh);
        });
        p.units = [];
    });
    grid = Array(GRID_SIZE_Z).fill(null).map(() => Array(GRID_SIZE_X).fill(null));
    clearHighlights();
    selectedUnit = null;
    
    setupInitialUnits(); // Re-create units
    startGame(); // Start new game
}


// --- Game Loop & Logic ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // Game logic updates primarily driven by events (clicks)

    renderer.clear(); // Clear entire buffer

    const width = window.innerWidth;
    const height = window.innerHeight;
    const halfWidth = width / 2;

    // Render Player 1 (Left)
    renderer.setViewport(0, 0, halfWidth, height);
    renderer.setScissor(0, 0, halfWidth, height);
    renderer.setScissorTest(true);
    if (cameras[0]) renderer.render(scene, cameras[0]);

    // Render Player 2 (Right)
    renderer.setViewport(halfWidth, 0, halfWidth, height);
    renderer.setScissor(halfWidth, 0, halfWidth, height);
    // renderer.setScissorTest(true); // Already true
    if (cameras[1]) renderer.render(scene, cameras[1]);
}

function onMouseClick(event) {
    if (!gameRunning || currentGameState === GAME_STATE.PERFORMING_ACTION || currentGameState === GAME_STATE.GAME_OVER) return;

    // Determine which player's screen was clicked
    const screenHalf = (event.clientX < window.innerWidth / 2) ? 0 : 1;
    if (screenHalf !== currentPlayerIndex) {
        console.log("Clicked on non-active player's screen.");
        return; // Click on wrong screen
    }

    mouse.x = (event.clientX / (window.innerWidth / 2)) * 2 - 1; // Normalize for half screen
    if (screenHalf === 1) mouse.x = ((event.clientX - window.innerWidth / 2) / (window.innerWidth / 2)) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, cameras[currentPlayerIndex]);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let clickedGridPos = null;
    let clickedOnUnit = null;

    for (const intersect of intersects) {
        if (intersect.object === floorMesh) {
            clickedGridPos = worldToGrid(intersect.point);
            break; 
        }
        if (intersect.object.userData && intersect.object.userData.type === 'unit') {
            clickedOnUnit = players[intersect.object.userData.owner].units.find(u => u.id === intersect.object.userData.unitId && u.alive);
            if (clickedOnUnit) {
                clickedGridPos = clickedOnUnit.gridPos; // Get grid pos from unit
            }
            break;
        }
    }
    if (!clickedGridPos && clickedOnUnit) clickedGridPos = clickedOnUnit.gridPos; // Fallback if only unit was hit

    if (!clickedGridPos) return; // Clicked outside playable area

    // --- State Machine for Click ---
    if (currentGameState === GAME_STATE.SELECT_UNIT) {
        if (clickedOnUnit && clickedOnUnit.owner === currentPlayerIndex && !clickedOnUnit.activatedThisTurn) {
            selectUnitAction(clickedOnUnit);
        }
    } else if (currentGameState === GAME_STATE.UNIT_SELECTED) {
        if (!selectedUnit) return; // Should not happen

        // Option 1: Clicked on an enemy unit to attack
        if (clickedOnUnit && clickedOnUnit.owner !== currentPlayerIndex && clickedOnUnit.alive) {
            if (isCellInHighlights(clickedGridPos, highlightMeshes.attack) && !selectedUnit.attackedThisAction) {
                performAttackAction(selectedUnit, clickedOnUnit);
            } else {
                 ui.currentActionMessage.textContent = "Enemigo fuera de rango o ya atacaste.";
            }
        }
        // Option 2: Clicked on a valid move cell
        else if (isCellInHighlights(clickedGridPos, highlightMeshes.move) && !clickedOnUnit && !selectedUnit.movedThisAction) {
             performMoveAction(selectedUnit, clickedGridPos);
        }
        // Option 3: Clicked selected unit again (or empty space) to deselect or end action
        else if (clickedOnUnit === selectedUnit || !clickedOnUnit) {
             if (selectedUnit.movedThisAction || selectedUnit.attackedThisAction) {
                // Unit has performed at least one sub-action, finalize its activation for this turn group
                finalizeUnitActivation();
             } else {
                // Unit has done nothing, deselect it
                deselectUnitAction();
             }
        }
    }
    updateUI();
}

function selectUnitAction(unit) {
    if (selectedUnit) deselectUnitAction(); // Deselect previous if any

    selectedUnit = unit;
    selectedUnit.mesh.material.emissive.setHex(0xffaa00); // Highlight selected
    selectedUnit.mesh.material.emissiveIntensity = 0.7;
    currentGameState = GAME_STATE.UNIT_SELECTED;
    ui.currentActionMessage.textContent = `Mueve o ataca con ${unit.type}. (Ya movido: ${unit.movedThisAction}, Ya atacado: ${unit.attackedThisAction})`;
    showPossibleMoves(unit);
    showAttackableTargets(unit);
}

function deselectUnitAction() {
    if (selectedUnit) {
        // Reset emissive to player color
        selectedUnit.mesh.material.emissive.setHex(players[selectedUnit.owner].color);
        selectedUnit.mesh.material.emissiveIntensity = 0.3; 
        selectedUnit = null;
    }
    clearHighlights();
    currentGameState = GAME_STATE.SELECT_UNIT;
    ui.currentActionMessage.textContent = "Selecciona una unidad para activar.";
    if (actionsTakenThisTurn >= MAX_ACTIONS_PER_TURN) {
        ui.currentActionMessage.textContent = "No más activaciones. Termina tu turno.";
    }
}

function performMoveAction(unit, targetGridPos) {
    grid[unit.gridPos.z][unit.gridPos.x] = null;
    unit.gridPos.x = targetGridPos.x;
    unit.gridPos.z = targetGridPos.z;
    grid[unit.gridPos.z][unit.gridPos.x] = unit;
    unit.mesh.position.copy(gridToWorld(targetGridPos));
    unit.mesh.position.y = unit.stats.size.h * CELL_SIZE / 2; // ensure correct height
    if (unit.type === UNIT_TYPES.ARCHER) unit.mesh.position.y = unit.stats.size.h * CELL_SIZE / 2;

    unit.movedThisAction = true;
    ui.currentActionMessage.textContent = `${unit.type} movido. Puedes atacar o finalizar acción.`;
    
    clearHighlights(); // Clear old move highlights
    showAttackableTargets(unit); // Show new attack options
    // Keep move highlights for already moved units might be complex, for now, move is one-shot
    
    if (unit.attackedThisAction) { // If already attacked, this action is done
        finalizeUnitActivation();
    }
}

function performAttackAction(attacker, defender) {
    currentGameState = GAME_STATE.PERFORMING_ACTION; // Block input during "animation"
    ui.diceRollResult.textContent = "";

    // Simple line "animation"
    const points = [attacker.mesh.position.clone(), defender.mesh.position.clone()];
    const attackLineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 3 });
    const attackLineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const attackLine = new THREE.Line(attackLineGeometry, attackLineMaterial);
    scene.add(attackLine);

    setTimeout(() => { // Simulate attack delay and show result
        scene.remove(attackLine);
        const diceRoll = Math.floor(Math.random() * 6) + 1;
        const [minRoll, maxRoll] = attacker.stats.attackDie;
        let message = `Atacando ${defender.type} con ${attacker.type}. `;
        message += `Jugador ${attacker.owner + 1} lanza un ${diceRoll}. `;

        if (diceRoll >= minRoll && diceRoll <= maxRoll) {
            message += `¡Impacto! ${defender.type} enemigo destruido.`;
            killUnit(defender);
        } else {
            message += "¡Falló!";
        }
        ui.diceRollResult.textContent = message;
        attacker.attackedThisAction = true;
        
        currentGameState = GAME_STATE.UNIT_SELECTED; // Return to selected state
         if (attacker.movedThisAction) { // If already moved, this action is done
            finalizeUnitActivation();
        } else {
            // If not moved, can still move. Clear attack highlights as attack is done.
            clearHighlights();
            showPossibleMoves(attacker); // Show moves again
            ui.currentActionMessage.textContent = `${attacker.type} atacó. Puedes mover o finalizar acción.`;
        }
        updateUI(); // Update unit counts
        checkWinCondition();
    }, 750); // 0.75 second "attack animation"
}

function finalizeUnitActivation() {
    if (!selectedUnit) return;
    
    selectedUnit.activatedThisTurn = true;
    // Reset sub-action flags for next activation if any (though typically unit activates once)
    selectedUnit.movedThisAction = false; 
    selectedUnit.attackedThisAction = false;

    // Reset emissive to player color but keep it slightly different if activated
    selectedUnit.mesh.material.emissive.setHex(players[selectedUnit.owner].color);
    selectedUnit.mesh.material.emissiveIntensity = 0.1; // Dimmer to show it acted

    selectedUnit = null; // Deselect
    actionsTakenThisTurn++;
    
    clearHighlights();

    if (actionsTakenThisTurn >= MAX_ACTIONS_PER_TURN) {
        currentGameState = GAME_STATE.SELECT_UNIT; // Technically no more selections possible
        ui.currentActionMessage.textContent = "Todas las activaciones usadas. Termina tu turno.";
    } else {
        currentGameState = GAME_STATE.SELECT_UNIT;
        ui.currentActionMessage.textContent = "Selecciona otra unidad para activar.";
    }
    updateUI();
}


function killUnit(unit) {
    unit.alive = false;
    scene.remove(unit.mesh);
    grid[unit.gridPos.z][unit.gridPos.x] = null;
    // Optional: remove from players[unit.owner].units array or just filter by alive status
}

function switchTurn() {
    if (selectedUnit) { // If a unit is selected but action not "confirmed", confirm it.
        finalizeUnitActivation(); // This will increment actionsTakenThisTurn
    }
    clearHighlights();
    deselectUnitAction(); // Ensure no unit is selected

    currentPlayerIndex = (currentPlayerIndex + 1) % 2;
    actionsTakenThisTurn = 0;
    resetUnitTurnStatus(); // Reset 'activatedThisTurn' for all units
    
    currentGameState = GAME_STATE.SELECT_UNIT;
    ui.diceRollResult.textContent = "";
    updateUI();
    checkWinCondition();
}

function resetUnitTurnStatus() {
    players.forEach(player => {
        player.units.forEach(unit => {
            unit.activatedThisTurn = false;
            unit.movedThisAction = false;
            unit.attackedThisAction = false;
            if (unit.alive && unit.mesh) { // Reset visual state for next turn
                 unit.mesh.material.emissive.setHex(players[unit.owner].color);
                 unit.mesh.material.emissiveIntensity = 0.3;
            }
        });
    });
}

function checkWinCondition() {
    const p0AliveUnits = players[0].units.filter(u => u.alive).length;
    const p1AliveUnits = players[1].units.filter(u => u.alive).length;

    if (p0AliveUnits === 0 || p1AliveUnits === 0) {
        gameRunning = false;
        currentGameState = GAME_STATE.GAME_OVER;
        let winnerMessage;
        if (p0AliveUnits === 0 && p1AliveUnits === 0) { // Should be rare
            winnerMessage = "¡Empate! ¡Ambos jugadores aniquilados!";
        } else if (p1AliveUnits === 0) {
            winnerMessage = "¡Jugador 1 Gana!";
        } else {
            winnerMessage = "¡Jugador 2 Gana!";
        }
        ui.messageText.textContent = winnerMessage;
        ui.startButton.textContent = "Jugar de Nuevo";
        ui.startButton.onclick = () => { // Basic reset
            players.forEach(p => p.units.forEach(u => {if(u.mesh) scene.remove(u.mesh)}));
            grid = Array(GRID_SIZE_Z).fill(null).map(() => Array(GRID_SIZE_X).fill(null));
            setupInitialUnits();
            startGame();
        };
        ui.messageOverlay.style.display = 'flex';
    }
}

// --- Highlighting ---
function showPossibleMoves(unit) {
    clearHighlights('move');
    if (unit.movedThisAction) return; // Cannot move again in this sub-action

    const moves = [];
    const { x, z } = unit.gridPos;
    const maxMove = unit.stats.move;

    // BFS-like approach for reachable cells (respecting unit collision)
    let queue = [{x:x, z:z, dist:0}];
    let visited = new Set();
    visited.add(`${x}_${z}`);

    while(queue.length > 0){
        let curr = queue.shift();

        if(curr.dist > 0) moves.push({x: curr.x, z: curr.z}); // Don't add starting cell

        if(curr.dist < maxMove){
            const neighbors = [
                {x: curr.x + 1, z: curr.z}, {x: curr.x - 1, z: curr.z},
                {x: curr.x, z: curr.z + 1}, {x: curr.x, z: curr.z - 1}
            ];
            for(const n of neighbors){
                if(n.x >= 0 && n.x < GRID_SIZE_X && n.z >= 0 && n.z < GRID_SIZE_Z &&
                   !visited.has(`${n.x}_${n.z}`) && grid[n.z][n.x] === null) { // Check empty
                    visited.add(`${n.x}_${n.z}`);
                    queue.push({x:n.x, z:n.z, dist: curr.dist + 1});
                }
            }
        }
    }
    
    moves.forEach(pos => {
        const highlightGeo = new THREE.PlaneGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9);
        const highlightMat = new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.4, side:THREE.DoubleSide });
        const hlMesh = new THREE.Mesh(highlightGeo, highlightMat);
        hlMesh.position.copy(gridToWorld(pos));
        hlMesh.position.y = 0.05; // Slightly above ground
        hlMesh.rotation.x = -Math.PI / 2;
        hlMesh.userData = { ...pos }; // Store grid pos
        scene.add(hlMesh);
        highlightMeshes.move.push(hlMesh);
    });
}

function showAttackableTargets(unit) {
    clearHighlights('attack');
    if (unit.attackedThisAction) return; // Cannot attack again

    const targets = [];
    const { x, z } = unit.gridPos;
    const range = unit.stats.attackRange;

    for (let r = 0; r < GRID_SIZE_Z; r++) {
        for (let c = 0; c < GRID_SIZE_X; c++) {
            const dist = Math.abs(x - c) + Math.abs(z - r); // Manhattan distance
            if (dist > 0 && dist <= range) {
                const targetUnit = grid[r][c];
                if (targetUnit && targetUnit.owner !== unit.owner && targetUnit.alive) {
                    targets.push({ x: c, z: r });
                }
            }
        }
    }

    targets.forEach(pos => {
        const highlightGeo = new THREE.BoxGeometry(CELL_SIZE * 0.95, CELL_SIZE*0.2, CELL_SIZE * 0.95);
        const highlightMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.5 });
        const hlMesh = new THREE.Mesh(highlightGeo, highlightMat);
        hlMesh.position.copy(gridToWorld(pos));
        hlMesh.position.y = 0.1; // Slightly above ground
        hlMesh.userData = { ...pos };
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


// --- UI Update ---
function updateUI() {
    // Player 1 Info
    const p0Alive = players[0].units.filter(u => u.alive).length;
    ui.p1UnitsLeft.textContent = p0Alive;
    ui.p1ActionsLeft.textContent = (currentPlayerIndex === 0) ? MAX_ACTIONS_PER_TURN - actionsTakenThisTurn : '-';
    ui.p1Status.textContent = (currentPlayerIndex === 0) ? 
        (currentGameState === GAME_STATE.SELECT_UNIT ? "Selecciona unidad" : 
         (currentGameState === GAME_STATE.UNIT_SELECTED && selectedUnit ? `Mueve/Ataca ${selectedUnit.type}` : "Procesando...")) 
        : "Esperando turno...";
    ui.p1Info.classList.toggle('active-player', currentPlayerIndex === 0 && gameRunning);


    // Player 2 Info
    const p1Alive = players[1].units.filter(u => u.alive).length;
    ui.p2UnitsLeft.textContent = p1Alive;
    ui.p2ActionsLeft.textContent = (currentPlayerIndex === 1) ? MAX_ACTIONS_PER_TURN - actionsTakenThisTurn : '-';
    ui.p2Status.textContent = (currentPlayerIndex === 1) ? 
        (currentGameState === GAME_STATE.SELECT_UNIT ? "Selecciona unidad" : 
         (currentGameState === GAME_STATE.UNIT_SELECTED && selectedUnit ? `Mueve/Ataca ${selectedUnit.type}` : "Procesando...")) 
        : "Esperando turno...";
    ui.p2Info.classList.toggle('active-player', currentPlayerIndex === 1 && gameRunning);

    // Turn Info
    if (gameRunning) {
        ui.currentPlayerTurn.textContent = `Turno del Jugador ${currentPlayerIndex + 1}`;
        if (currentGameState === GAME_STATE.SELECT_UNIT) {
             ui.currentActionMessage.textContent = actionsTakenThisTurn >= MAX_ACTIONS_PER_TURN ? "No más activaciones. Termina tu turno." : "Selecciona una unidad para activar.";
        } else if (currentGameState === GAME_STATE.UNIT_SELECTED && selectedUnit) {
            let moveStatus = selectedUnit.movedThisAction ? "Movido" : "No movido";
            let attackStatus = selectedUnit.attackedThisAction ? "Atacado" : "No atacado";
            ui.currentActionMessage.textContent = `Unidad: ${selectedUnit.type} (${moveStatus}, ${attackStatus}). Elige acción.`;
        }
    } else if (currentGameState === GAME_STATE.START_MENU) {
        ui.currentPlayerTurn.textContent = "Tactics3D";
    }
    // diceRollResult is updated directly in performAttackAction
}


// --- Utilities ---
function gridToWorld(gridPos) {
    // Center of the grid is (0,0,0) in world space
    const worldX = (gridPos.x - (GRID_SIZE_X - 1) / 2) * CELL_SIZE + CELL_SIZE / 2; // Center of cell
    const worldZ = (gridPos.z - (GRID_SIZE_Z - 1) / 2) * CELL_SIZE + CELL_SIZE / 2; // Center of cell
    return new THREE.Vector3(worldX - (CELL_SIZE * GRID_SIZE_X / 2) + (GRID_SIZE_X % 2 === 0 ? 0 : CELL_SIZE/2) , 0, worldZ - (CELL_SIZE * GRID_SIZE_Z / 2) + (GRID_SIZE_Z % 2 === 0 ? 0 : CELL_SIZE/2) );
}
function worldToGrid(worldPos) {
    const gridX = Math.floor((worldPos.x + (GRID_SIZE_X * CELL_SIZE / 2)) / CELL_SIZE);
    const gridZ = Math.floor((worldPos.z + (GRID_SIZE_Z * CELL_SIZE / 2)) / CELL_SIZE);
    return { x: gridX, z: gridZ };
}

// --- Event Handlers ---
function onWindowResize() {
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