import * as THREE from 'three';

// --- Variables Globales ---
let scene, camera, renderer, clock;
let player, playerSpeed = 5, playerRunSpeed = 10, playerRotationSpeed = 2;
let vehicles = [];
let pedestrians = [];
let currentVehicle = null;
let ambientLight, sunLight;
let dayDuration = 120; // segundos para un ciclo día-noche completo
let timeOfDay = 0; // 0 (amanecer) a 1 (amanecer siguiente día)

const inputState = {
    forward: 0, backward: 0, left: 0, right: 0,
    action: false, shoot: false, run: false
};

const crosshair = document.getElementById('crosshair');
const gameCanvas = document.getElementById('gameCanvas');
const mobileControlsContainer = document.getElementById('mobileControls'); // For mobile controls

// --- Configuración Inicial ---
function init() {
    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

    // Reloj
    clock = new THREE.Clock();

    // Cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Luces
    ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(50, 80, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    scene.add(sunLight);
    scene.add(sunLight.target);

    createWorld();
    createPlayer();
    createVehicles(5);
    createPedestrians(15);
    setupInputHandlers();
    setupMobileControls(); // New function for mobile

    animate();
}

// --- Creación de Elementos del Juego ---
function createWorld() {
    // Suelo
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x777777, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // "Edificios" (Cubos)
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    for (let i = 0; i < 30; i++) {
        const w = Math.random() * 10 + 5;
        const h = Math.random() * 40 + 10;
        const d = Math.random() * 10 + 5;
        const buildingGeo = new THREE.BoxGeometry(w, h, d);
        const building = new THREE.Mesh(buildingGeo, buildingMat);
        building.castShadow = true;
        building.receiveShadow = true;
        building.position.set(
            (Math.random() - 0.5) * 400,
            h / 2,
            (Math.random() - 0.5) * 400
        );
        if (building.position.length() < 30) {
            building.position.x += Math.sign(building.position.x || 1) * 30;
            building.position.z += Math.sign(building.position.z || 1) * 30;
        }
        scene.add(building);
    }
}

function createPlayer() {
    const playerGeo = new THREE.CapsuleGeometry(0.4, 0.8, 8, 16);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    player = new THREE.Mesh(playerGeo, playerMat);
    player.castShadow = true;
    player.position.y = 0.8; // Height of capsule center
    scene.add(player);
}

function createVehicles(count) {
    const carColors = [0xff0000, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff, 0x888888];
    // FIX: Corrected car geometry: width, height, LENGTH.
    // Length (depth/Z-axis) should be the longest dimension for forward movement.
    const carGeo = new THREE.BoxGeometry(2.2, 1.8, 4);
    for (let i = 0; i < count; i++) {
        const carMat = new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length] });
        const vehicle = new THREE.Mesh(carGeo, carMat);
        vehicle.castShadow = true;
        vehicle.receiveShadow = true;
        vehicle.position.set(
            (Math.random() - 0.5) * 80 + 10,
            0.9, // Half of car height
            (Math.random() - 0.5) * 80 + 10
        );
        vehicle.userData = { id: `car_${i}`, speed: 0, steering: 0 };
        vehicles.push(vehicle);
        scene.add(vehicle);
    }
}

function createPedestrians(count) {
    const pedGeo = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8); // Slightly more human-like
    for (let i = 0; i < count; i++) {
        const pedMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) });
        const pedestrian = new THREE.Mesh(pedGeo, pedMat);
        pedestrian.castShadow = true;
        pedestrian.position.set(
            (Math.random() - 0.5) * 150,
            0.8, // Half of capsule height
            (Math.random() - 0.5) * 150
        );
        pedestrian.userData = {
            id: `ped_${i}`,
            health: 100,
            targetPosition: new THREE.Vector3().copy(pedestrian.position),
            isFleeing: false
        };
        pedestrians.push(pedestrian);
        scene.add(pedestrian);
    }
}

// --- Lógica de Entradas ---
function setupInputHandlers() {
    document.addEventListener('keydown', (event) => {
        switch (event.key.toLowerCase()) {
            case 'w': inputState.forward = 1; break;
            case 's': inputState.backward = 1; break;
            case 'a': inputState.left = 1; break;
            case 'd': inputState.right = 1; break;
            case 'f': inputState.action = true; break;
            case 'shift': inputState.run = true; break;
        }
    });
    document.addEventListener('keyup', (event) => {
        switch (event.key.toLowerCase()) {
            case 'w': inputState.forward = 0; break;
            case 's': inputState.backward = 0; break;
            case 'a': inputState.left = 0; break;
            case 'd': inputState.right = 0; break;
            case 'f': inputState.action = false; break; // Important to reset here for keyup
            case 'shift': inputState.run = false; break;
        }
    });
    document.addEventListener('mousedown', (event) => {
        if (event.button === 0) inputState.shoot = true;
    });
    document.addEventListener('mouseup', (event) => {
        if (event.button === 0) inputState.shoot = false;
    });
}

function setupMobileControls() {
    const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (!isTouchDevice || !mobileControlsContainer) return;

    mobileControlsContainer.style.display = 'flex'; // Show controls

    const controlsMap = {
        'mc-forward': 'forward',
        'mc-backward': 'backward',
        'mc-left': 'left',
        'mc-right': 'right',
        'mc-action': 'action',
        'mc-run': 'run',
        'mc-shoot': 'shoot'
    };

    for (const id in controlsMap) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                inputState[controlsMap[id]] = true;
                if (id === 'mc-action') { // For action, it's a one-shot
                    // The action flag will be consumed in update loop
                }
            }, { passive: false });

            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                // For continuous actions like movement/run/shoot, reset on touchend.
                // Action 'f' is different, it's a press, not hold.
                // But since action is reset after use, this is okay.
                if (controlsMap[id] !== 'action') { // Action is reset after use
                     inputState[controlsMap[id]] = false;
                }
                // For action button, we want it to behave like a key press
                // Setting it to true on touchstart is enough, it will be reset in main loop
            }, { passive: false });
        }
    }
}


// --- Lógica de Juego (Actualizaciones) ---
function updatePlayer(deltaTime) {
    if (!player || currentVehicle) return;

    const currentSpeed = inputState.run ? playerRunSpeed : playerSpeed;
    let moveDirection = new THREE.Vector3();
    let isMoving = false;

    if (inputState.forward) { moveDirection.z -= 1; isMoving = true; }
    if (inputState.backward) { moveDirection.z += 1; isMoving = true; }
    if (inputState.left) player.rotation.y += playerRotationSpeed * deltaTime;
    if (inputState.right) player.rotation.y -= playerRotationSpeed * deltaTime;

    if (isMoving) {
        moveDirection.normalize().applyQuaternion(player.quaternion);
        player.position.addScaledVector(moveDirection, currentSpeed * deltaTime);
    }

    scene.children.forEach(obj => {
        if (obj.geometry instanceof THREE.BoxGeometry && obj !== player && !(obj.geometry instanceof THREE.PlaneGeometry)) {
            const playerBox = new THREE.Box3().setFromObject(player);
            const buildingBox = new THREE.Box3().setFromObject(obj);
            if (playerBox.intersectsBox(buildingBox)) {
                 player.position.addScaledVector(moveDirection, -currentSpeed * deltaTime * 1.1);
            }
        }
    });

    if (inputState.action) {
        // Moved toggleVehicleEntry call here for player-initiated action
        toggleVehicleEntry();
        inputState.action = false; // Consume the action
    }

    if (inputState.shoot) {
        shoot();
        inputState.shoot = false; // Consume the shoot action
    }
}

function updateVehicleControls(deltaTime) {
    if (!currentVehicle) return;

    const driveSpeed = 15; // Base speed, deltaTime applied later
    const turnSpeed = playerRotationSpeed * 0.7;

    if (inputState.left) currentVehicle.rotation.y += turnSpeed * deltaTime;
    if (inputState.right) currentVehicle.rotation.y -= turnSpeed * deltaTime;

    let actualSpeed = 0;
    if (inputState.forward) actualSpeed = driveSpeed;
    if (inputState.backward) actualSpeed = -driveSpeed / 2; // Slower reverse

    if (actualSpeed !== 0) {
        // Correct forward vector based on vehicle's quaternion
        const forward = new THREE.Vector3(0, 0, -1); // Local forward is -Z for Box
        forward.applyQuaternion(currentVehicle.quaternion);
        currentVehicle.position.addScaledVector(forward, actualSpeed * deltaTime);
    }
    
    // Check for action to exit vehicle
    if (inputState.action) {
        toggleVehicleEntry(); // This will handle player repositioning
        inputState.action = false; // Consume the action
    }


    pedestrians.forEach(ped => {
        if (ped.userData.health > 0 && currentVehicle.position.distanceTo(ped.position) < 3) { // Adjusted collision radius
            console.log(`Peatón ${ped.userData.id} atropellado!`);
            ped.userData.health = 0;
            // Make them fall over or ragdoll instead of just disappearing
            ped.rotation.x = Math.PI / 2;
            ped.position.y = 0.2; // On the ground
            // Could add: setTimeout(() => ped.visible = false, 5000);
        }
    });
}

function toggleVehicleEntry() {
    if (currentVehicle) {
        // Exiting vehicle
        const exitOffset = new THREE.Vector3(1.5, 0, 0); // Offset to the car's local right side
        exitOffset.applyQuaternion(currentVehicle.quaternion); // Rotate offset by car's rotation

        player.position.copy(currentVehicle.position).add(exitOffset);
        player.position.y = 0.8; // Ensure player is at correct height
        player.rotation.copy(currentVehicle.rotation); // Match car's orientation initially
        player.visible = true;
        currentVehicle = null;
        crosshair.style.display = 'block';
    } else {
        // Entering vehicle
        let closestCar = null;
        let minDistance = 3.5;

        vehicles.forEach(vehicle => {
            if (!vehicle.visible) return; // Assuming cars can be destroyed/hidden
            const distance = player.position.distanceTo(vehicle.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestCar = vehicle;
            }
        });

        if (closestCar) {
            currentVehicle = closestCar;
            player.visible = false;
            crosshair.style.display = 'none';
            // Player's logical position is now the car's; no need to move player mesh
        }
    }
}

function shoot() {
    if (!player || currentVehicle || !player.visible) return;

    const raycaster = new THREE.Raycaster();
    const shootOrigin = new THREE.Vector3();
    const shootDirection = new THREE.Vector3();

    camera.getWorldPosition(shootOrigin); // Shoot from camera
    camera.getWorldDirection(shootDirection);

    raycaster.set(shootOrigin, shootDirection);

    const livingPedestrians = pedestrians.filter(p => p.userData.health > 0 && p.visible);
    const intersects = raycaster.intersectObjects(livingPedestrians);

    if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        // Find the pedestrian object from our array to access userData
        const hitPedestrian = pedestrians.find(p => p === hitObject);
        if (hitPedestrian) {
            console.log(`Peatón ${hitPedestrian.userData.id} disparado! Distancia: ${intersects[0].distance.toFixed(2)}`);
            hitPedestrian.userData.health -= 50;
            if (hitPedestrian.userData.health <= 0) {
                console.log(`Peatón ${hitPedestrian.userData.id} eliminado.`);
                hitPedestrian.rotation.x = Math.PI / 2; // Fall over
                hitPedestrian.position.y = 0.2;
                // setTimeout(() => hitPedestrian.visible = false, 5000); // Optional: remove after time
            } else {
                hitPedestrian.userData.isFleeing = true;
                const fleeDir = new THREE.Vector3().subVectors(hitPedestrian.position, player.position).normalize();
                hitPedestrian.userData.targetPosition.addVectors(hitPedestrian.position, fleeDir.multiplyScalar(30));
            }
        }
    }
}

function updatePedestrians(deltaTime) {
    pedestrians.forEach(ped => {
        if (ped.userData.health <= 0) { // Keep them on ground if "dead"
            if (ped.visible && ped.rotation.x !== Math.PI / 2) { // if not already "down"
                 ped.rotation.x = Math.PI / 2;
                 ped.position.y = 0.2;
            }
            return;
        }
        if(!ped.visible) return;


        const pedSpeed = ped.userData.isFleeing ? 4 : 1.5;
        const playerDistance = player.position.distanceTo(ped.position);

        // Pedestrians flee if player is shooting nearby (even if not at them)
        if (!ped.userData.isFleeing && !currentVehicle && player.visible && playerDistance < 20 && inputState.shoot) {
             ped.userData.isFleeing = true;
             // Set a flee target away from player
             const fleeDirection = new THREE.Vector3().subVectors(ped.position, player.position).normalize();
             ped.userData.targetPosition.addVectors(ped.position, fleeDirection.multiplyScalar(Math.random() * 20 + 10));
        }

        // Pedestrians flee from fast approaching player-controlled vehicles
        if (!ped.userData.isFleeing && currentVehicle) {
            const vehicleDistance = currentVehicle.position.distanceTo(ped.position);
            // Check if vehicle is moving towards pedestrian (simplified)
            const vehicleVelocity = new THREE.Vector3(0,0,-1).applyQuaternion(currentVehicle.quaternion); // Current direction
            const dirToPed = new THREE.Vector3().subVectors(ped.position, currentVehicle.position).normalize();
            const closingSpeedFactor = vehicleVelocity.dot(dirToPed); // Positive if moving towards

            if (vehicleDistance < 15 && closingSpeedFactor > 0.5 ) { // Vehicle is somewhat close and heading towards ped
                ped.userData.isFleeing = true;
                const fleeDirection = new THREE.Vector3().subVectors(ped.position, currentVehicle.position).normalize();
                ped.userData.targetPosition.addVectors(ped.position, fleeDirection.multiplyScalar(Math.random() * 15 + 10));
            }
        }


        if (ped.userData.isFleeing) {
            if (ped.position.distanceTo(ped.userData.targetPosition) < 2 || Math.random() < 0.01) {
                 const sourceOfDanger = currentVehicle ? currentVehicle.position : (player.visible ? player.position : ped.position); // if player not visible, don't use player pos
                 const fleeDirection = new THREE.Vector3().subVectors(ped.position, sourceOfDanger).normalize();
                 // if fleeDirection is zero (e.g. sourceOfDanger is ped.position), pick random
                 if (fleeDirection.lengthSq() < 0.01) {
                    fleeDirection.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
                 }
                 ped.userData.targetPosition.addVectors(ped.position, fleeDirection.multiplyScalar(Math.random() * 20 + 10));
            }
        } else { // Wandering
            if (ped.position.distanceTo(ped.userData.targetPosition) < 1 || Math.random() < 0.01) {
                ped.userData.targetPosition.set(
                    (Math.random() - 0.5) * 200,
                    0.8, // Pedestrian height
                    (Math.random() - 0.5) * 200
                );
            }
        }

        const moveDirection = new THREE.Vector3().subVectors(ped.userData.targetPosition, ped.position);
        moveDirection.y = 0; // Don't move up/down
        moveDirection.normalize();

        ped.position.addScaledVector(moveDirection, pedSpeed * deltaTime);
        if (moveDirection.lengthSq() > 0.01) { // Only look if actually moving
            // Keep ped upright while looking
            const lookAtPos = new THREE.Vector3(ped.userData.targetPosition.x, ped.position.y, ped.userData.targetPosition.z);
            ped.lookAt(lookAtPos);
        }

        scene.children.forEach(obj => {
             if (obj.geometry instanceof THREE.BoxGeometry && obj !== ped && !(obj.geometry instanceof THREE.PlaneGeometry)) {
                const pedBox = new THREE.Box3().setFromObject(ped);
                const buildingBox = new THREE.Box3().setFromObject(obj);
                if (pedBox.intersectsBox(buildingBox)) {
                    // Simple avoidance: try to move perpendicular to collision building
                    const avoidanceDir = new THREE.Vector3(moveDirection.z, 0, -moveDirection.x).normalize(); // Perpendicular
                    ped.position.addScaledVector(avoidanceDir, pedSpeed * deltaTime * 0.5); // Move slightly
                    ped.userData.targetPosition.addScaledVector(avoidanceDir, 5); // Adjust target
                }
            }
        });
    });
}


function updateCamera(deltaTime) {
    const cameraLookAtOffset = new THREE.Vector3(0, 1.5, 0);

    if (currentVehicle) {
        const offset = new THREE.Vector3(0, 4, 8); // Slightly adjusted for better view
        const cameraPosition = offset.applyMatrix4(currentVehicle.matrixWorld);
        camera.position.lerp(cameraPosition, 0.1);
        const lookAtPosition = new THREE.Vector3().copy(currentVehicle.position).add(cameraLookAtOffset);
        camera.lookAt(lookAtPosition);
    } else if (player && player.visible) {
        const offset = new THREE.Vector3(0, 2.5, 4.5); // Adjusted for player
        const cameraTargetPosition = new THREE.Vector3();
        player.getWorldPosition(cameraTargetPosition);

        const cameraOffset = offset.clone().applyQuaternion(player.quaternion);
        const cameraPosition = cameraTargetPosition.clone().add(cameraOffset);

        camera.position.lerp(cameraPosition, 0.1);
        const lookAtPosition = cameraTargetPosition.clone().add(cameraLookAtOffset); // Look at player's center mass
        camera.lookAt(lookAtPosition);
    }
}

function updateDayNightCycle(deltaTime) {
    timeOfDay += deltaTime / dayDuration;
    timeOfDay %= 1;

    const angle = timeOfDay * Math.PI * 2;

    sunLight.position.x = 50 * Math.cos(angle - Math.PI / 2);
    sunLight.position.y = 80 * Math.sin(angle - Math.PI / 2);
    sunLight.target.position.set(0, 0, 0);

    const daySkyColor = new THREE.Color(0x87CEEB);
    const nightSkyColor = new THREE.Color(0x000022);
    const dayFogColor = new THREE.Color(0x87CEEB);
    const nightFogColor = new THREE.Color(0x000022);

    const sunIntensityFactor = Math.max(0, Math.sin(angle - Math.PI / 2));

    sunLight.intensity = 1.0 * sunIntensityFactor;
    ambientLight.intensity = 0.2 + 0.3 * sunIntensityFactor;

    scene.background.lerpColors(nightSkyColor, daySkyColor, sunIntensityFactor);
    scene.fog.color.lerpColors(nightFogColor, dayFogColor, sunIntensityFactor);
}

// --- Bucle Principal de Animación ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // Player/Vehicle updates first to handle input
    if (currentVehicle) {
        updateVehicleControls(deltaTime);
        crosshair.style.display = 'none';
    } else {
        updatePlayer(deltaTime); // updatePlayer now also handles toggleVehicleEntry for entering
        crosshair.style.display = 'block';
    }

    updatePedestrians(deltaTime);
    updateCamera(deltaTime);
    updateDayNightCycle(deltaTime);

    renderer.render(scene, camera);
}

// --- Eventos y Arranque ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();