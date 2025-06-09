import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'; // NUEVO

// --- Variables Globales ---
let scene, camera, renderer, clock;
let player, playerSpeed = 5, playerRunSpeed = 10, playerRotationSpeed = 2;
let vehicles = [];
let pedestrians = [];
let bloodPuddles = []; // NUEVO
let currentVehicle = null;
let ambientLight, sunLight;
let dayDuration = 120;
let timeOfDay = 0;

let pointerLockControls; // NUEVO
let isFreelooking = false; // NUEVO

const inputState = {
    forward: 0, backward: 0, left: 0, right: 0,
    action: false, shoot: false, run: false,
    freelook: false // NUEVO
};

const crosshair = document.getElementById('crosshair');
const gameCanvas = document.getElementById('gameCanvas');
const mobileControlsContainer = document.getElementById('mobileControls');

// --- Configuración Inicial ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Camera position will be set by controls or chase cam logic

    renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    sunLight.position.set(50, 80, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    // ... (shadow camera bounds)
    scene.add(sunLight);
    scene.add(sunLight.target);

    createWorld();
    createPlayer();
    createVehicles(5);
    createPedestrians(15);

    // Pointer Lock Controls (NUEVO)
    pointerLockControls = new PointerLockControls(camera, renderer.domElement);
    pointerLockControls.addEventListener('lock', () => {
        isFreelooking = true;
        crosshair.style.display = 'block'; // Ensure crosshair is visible
        if (document.getElementById('info')) document.getElementById('info').style.display = 'none'; // Hide info on lock
    });
    pointerLockControls.addEventListener('unlock', () => {
        isFreelooking = false;
        // crosshair display will be handled by main loop based on currentVehicle
        if (document.getElementById('info')) document.getElementById('info').style.display = 'block';
    });
    scene.add(pointerLockControls.getObject()); // Add camera to scene via controls

    setupInputHandlers();
    setupMobileControls();

    animate();
}

// --- Creación de Elementos del Juego ---
function createWorld() {
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x777777, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

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
    const playerGeo = new THREE.CapsuleGeometry(0.4, 0.8, 8, 16); // Total height approx 0.8 + 0.4*2 = 1.6
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    player = new THREE.Mesh(playerGeo, playerMat);
    player.castShadow = true;
    player.position.y = 0.4 + 0.8 / 2; // Bottom of capsule at y=0, center is radius + height/2
    scene.add(player);
}

function createVehicles(count) {
    const carColors = [0xff0000, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff, 0x888888];
    const carGeo = new THREE.BoxGeometry(2.2, 1.8, 4); // width, height, length
    for (let i = 0; i < count; i++) {
        const carMat = new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length] });
        const vehicle = new THREE.Mesh(carGeo, carMat);
        vehicle.castShadow = true;
        vehicle.receiveShadow = true;
        vehicle.position.set(
            (Math.random() - 0.5) * 80 + 10,
            carGeo.parameters.height / 2, // Center car on ground
            (Math.random() - 0.5) * 80 + 10
        );
        vehicle.userData = { id: `car_${i}`, speed: 0, steering: 0 };
        vehicles.push(vehicle);
        scene.add(vehicle);
    }
}

function createPedestrians(count) {
    const pedGeo = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8); // Total height approx 1.0 + 0.3*2 = 1.6
    for (let i = 0; i < count; i++) {
        const pedMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) });
        const pedestrian = new THREE.Mesh(pedGeo, pedMat);
        pedestrian.castShadow = true;
        pedestrian.position.set(
            (Math.random() - 0.5) * 150,
            0.3 + 1.0 / 2, // Bottom of capsule at y=0
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

// NUEVO: Crear Charco de Sangre
function createBloodPuddle(position) {
    const bloodGeo = new THREE.CircleGeometry(0.5 + Math.random() * 0.4, 16);
    const bloodMat = new THREE.MeshStandardMaterial({
        color: 0x880000,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
        roughness: 0.6,
        metalness: 0.2
    });
    // Offset for z-fighting
    bloodMat.polygonOffset = true;
    bloodMat.polygonOffsetFactor = -1.0;
    bloodMat.polygonOffsetUnits = -4.0;

    const puddle = new THREE.Mesh(bloodGeo, bloodMat);
    puddle.position.set(position.x, 0.01, position.z); // Slightly above ground
    puddle.rotation.x = -Math.PI / 2; // Lay flat
    puddle.receiveShadow = true; // Optional: if puddles should receive shadows
    scene.add(puddle);
    bloodPuddles.push(puddle);

    // Optional: Fade out and remove puddle after some time
    setTimeout(() => {
        // Simple removal, could be a fade animation
        scene.remove(puddle);
        puddle.geometry.dispose();
        puddle.material.dispose();
        bloodPuddles = bloodPuddles.filter(p => p !== puddle);
    }, 20000); // Remove after 20 seconds
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
            case 'control': // NUEVO - Specifically ControlLeft for typical FPS
                 if (event.code === 'ControlLeft' && !currentVehicle && player.visible) {
                    pointerLockControls.lock();
                 }
                 break;
        }
    });
    document.addEventListener('keyup', (event) => {
        switch (event.key.toLowerCase()) {
            case 'w': inputState.forward = 0; break;
            case 's': inputState.backward = 0; break;
            case 'a': inputState.left = 0; break;
            case 'd': inputState.right = 0; break;
            case 'f': inputState.action = false; break;
            case 'shift': inputState.run = false; break;
            // No keyup for control needed as PointerLockControls handles its state
        }
    });
    document.addEventListener('mousedown', (event) => {
        if (event.button === 0) { // Left click
            if (!isFreelooking && !currentVehicle) { // If not freelooking, try to lock
                pointerLockControls.lock();
            }
            inputState.shoot = true;
        }
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
        'mc-forward': 'forward', 'mc-backward': 'backward', 'mc-left': 'left',
        'mc-right': 'right', 'mc-action': 'action', 'mc-run': 'run', 'mc-shoot': 'shoot'
    };

    for (const id in controlsMap) {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                inputState[controlsMap[id]] = true;
            }, { passive: false });
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (controlsMap[id] !== 'action') {
                    inputState[controlsMap[id]] = false;
                }
            }, { passive: false });
        }
    }
}


// --- Lógica de Juego (Actualizaciones) ---
function updatePlayer(deltaTime) {
    if (!player || currentVehicle || !player.visible) return;

    const currentSpeed = inputState.run ? playerRunSpeed : playerSpeed;
    const moveDirection = new THREE.Vector3(); // Player's local movement intent
    let isMoving = false;

    // Player Rotation (Yaw) - always controlled by A/D or mouse if freelooking
    if (!isFreelooking) { // A/D rotates player body if not in PointerLock mode
        if (inputState.left) player.rotation.y += playerRotationSpeed * deltaTime;
        if (inputState.right) player.rotation.y -= playerRotationSpeed * deltaTime;
    } else { // In freelook, A/D could be strafe, or mouse controls camera + body yaw
        // For simplicity, let PointerLockControls handle camera object's yaw,
        // and we copy it to player model. Pitch is camera only.
        player.rotation.y = pointerLockControls.getObject().rotation.y;
    }

    // Player Movement (Forward/Backward)
    if (inputState.forward) { moveDirection.z = -1; isMoving = true; }
    if (inputState.backward) { moveDirection.z = 1; isMoving = true; }
    // Strafing if freelooking
    if (isFreelooking) {
        if (inputState.left) { moveDirection.x = -1; isMoving = true; }
        if (inputState.right) { moveDirection.x = 1; isMoving = true; }
    }


    if (isMoving) {
        const worldMoveDirection = moveDirection.clone().normalize().applyQuaternion(player.quaternion);
        player.position.addScaledVector(worldMoveDirection, currentSpeed * deltaTime);
    }

    // Player-Building Collision (MEJORADO)
    player.updateMatrixWorld(); // Ensure matrix is up-to-date
    const playerBox = new THREE.Box3().setFromObject(player);

    scene.children.forEach(obj => {
        if (obj.geometry instanceof THREE.BoxGeometry && obj !== player && !(obj.geometry instanceof THREE.PlaneGeometry)) {
            obj.updateMatrixWorld(); // Ensure building matrix is up-to-date
            const buildingBox = new THREE.Box3().setFromObject(obj);

            if (playerBox.intersectsBox(buildingBox)) {
                // Calculate penetration vector (MTV - Minimum Translation Vector)
                // This is a simplified AABB resolution.
                const centerA = new THREE.Vector3(); playerBox.getCenter(centerA);
                const centerB = new THREE.Vector3(); buildingBox.getCenter(centerB);
                const sizeA = new THREE.Vector3(); playerBox.getSize(sizeA);
                const sizeB = new THREE.Vector3(); buildingBox.getSize(sizeB);

                const overlapX = (sizeA.x / 2 + sizeB.x / 2) - Math.abs(centerA.x - centerB.x);
                const overlapZ = (sizeA.z / 2 + sizeB.z / 2) - Math.abs(centerA.z - centerB.z);

                if (overlapX > 0 && overlapZ > 0) { // Ensure there is an overlap
                    if (overlapX < overlapZ) {
                        player.position.x += (centerA.x < centerB.x ? -overlapX : overlapX);
                    } else {
                        player.position.z += (centerA.z < centerB.z ? -overlapZ : overlapZ);
                    }
                    player.updateMatrixWorld(); // Update after position change
                    playerBox.setFromObject(player); // Re-calculate playerBox for next collision
                }
            }
        }
    });


    if (inputState.action) {
        toggleVehicleEntry();
        inputState.action = false;
    }

    if (inputState.shoot) {
        shoot();
        inputState.shoot = false;
    }
}


function updateVehicleControls(deltaTime) {
    if (!currentVehicle) return;

    const driveSpeed = 15;
    const turnSpeed = playerRotationSpeed * 0.7;

    if (inputState.left) currentVehicle.rotation.y += turnSpeed * deltaTime;
    if (inputState.right) currentVehicle.rotation.y -= turnSpeed * deltaTime;

    let actualSpeed = 0;
    if (inputState.forward) actualSpeed = driveSpeed;
    if (inputState.backward) actualSpeed = -driveSpeed / 2;

    if (actualSpeed !== 0) {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(currentVehicle.quaternion);
        currentVehicle.position.addScaledVector(forward, actualSpeed * deltaTime);
    }
    
    if (inputState.action) {
        toggleVehicleEntry();
        inputState.action = false;
    }

    // Vehicle-Pedestrian Collision
    const vehicleBox = new THREE.Box3().setFromObject(currentVehicle); // Create once per frame
    pedestrians.forEach(ped => {
        if (ped.userData.health > 0 && ped.visible) {
            const pedBox = new THREE.Box3().setFromObject(ped);
            if (vehicleBox.intersectsBox(pedBox)) {
                console.log(`Peatón ${ped.userData.id} atropellado!`);
                ped.userData.health = 0;
                ped.rotation.x = Math.PI / 2; // Fall over
                ped.position.y = ped.geometry.parameters.radius; // On the ground
                createBloodPuddle(ped.position); // NUEVO
            }
        }
    });
}

function toggleVehicleEntry() {
    if (currentVehicle) { // Exiting vehicle
        player.visible = true; // Make player visible before finding exit spot

        const carWidth = currentVehicle.geometry.parameters.width;
        const carLength = currentVehicle.geometry.parameters.depth; // BoxGeometry depth is Z

        // Try exiting from different sides of the car
        const potentialExitLocalOffsets = [
            new THREE.Vector3(carWidth / 2 + 0.6, 0, 0),    // Right side
            new THREE.Vector3(-carWidth / 2 - 0.6, 0, 0),   // Left side
            new THREE.Vector3(0, 0, carLength / 2 + 0.6),   // Back
            new THREE.Vector3(0, 0, -carLength / 2 - 0.6),  // Front (less ideal)
        ];

        let foundClearSpot = false;
        for (const localOffset of potentialExitLocalOffsets) {
            const exitOffset = localOffset.clone().applyQuaternion(currentVehicle.quaternion);
            player.position.copy(currentVehicle.position).add(exitOffset);
            player.position.y = player.geometry.parameters.radius + player.geometry.parameters.height / 2; // Correct player height
            player.rotation.copy(currentVehicle.rotation); // Match car's orientation

            player.updateMatrixWorld();
            const playerExitBox = new THREE.Box3().setFromObject(player);
            let isColliding = false;

            // Check collision with buildings
            for (const child of scene.children) {
                if (child.geometry instanceof THREE.BoxGeometry && child !== currentVehicle && !(child.geometry instanceof THREE.PlaneGeometry)) {
                    const buildingBox = new THREE.Box3().setFromObject(child);
                    if (playerExitBox.intersectsBox(buildingBox)) {
                        isColliding = true;
                        break;
                    }
                }
            }
            // Check collision with the car itself (important!)
            const carBox = new THREE.Box3().setFromObject(currentVehicle);
            if (playerExitBox.intersectsBox(carBox)) {
                isColliding = true;
            }


            if (!isColliding) {
                foundClearSpot = true;
                break; // Found a clear spot
            }
        }

        if (!foundClearSpot) {
            // Default to first offset if all fail (might still be stuck, but better than nothing)
            console.warn("Could not find a clear exit spot for player. Player might be stuck.");
            const exitOffset = potentialExitLocalOffsets[0].clone().applyQuaternion(currentVehicle.quaternion);
            player.position.copy(currentVehicle.position).add(exitOffset);
            player.position.y = player.geometry.parameters.radius + player.geometry.parameters.height / 2;
        }

        currentVehicle = null;
        // crosshair display handled by main loop
        if (isFreelooking) pointerLockControls.unlock(); // Exit freelook when exiting car
        
    } else { // Entering vehicle
        let closestCar = null;
        let minDistance = 3.5;

        vehicles.forEach(vehicle => {
            if (!vehicle.visible) return;
            const distance = player.position.distanceTo(vehicle.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestCar = vehicle;
            }
        });

        if (closestCar) {
            currentVehicle = closestCar;
            player.visible = false;
            if (isFreelooking) {
                pointerLockControls.unlock(); // Ensure pointer is unlocked when entering car
            }
            // crosshair display handled by main loop
        }
    }
}


function shoot() {
    if (!player || currentVehicle || !player.visible) return;

    const raycaster = new THREE.Raycaster();
    const shootOrigin = new THREE.Vector3();
    const shootDirection = new THREE.Vector3();

    // Shoot from camera's perspective
    camera.getWorldPosition(shootOrigin);
    camera.getWorldDirection(shootDirection);

    raycaster.set(shootOrigin, shootDirection);

    const livingPedestrians = pedestrians.filter(p => p.userData.health > 0 && p.visible);
    const intersects = raycaster.intersectObjects(livingPedestrians, false); // false for non-recursive

    if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        const hitPedestrian = pedestrians.find(p => p === hitObject);
        if (hitPedestrian) {
            console.log(`Peatón ${hitPedestrian.userData.id} disparado! Distancia: ${intersects[0].distance.toFixed(2)}`);
            hitPedestrian.userData.health -= 50;
            if (hitPedestrian.userData.health <= 0) {
                console.log(`Peatón ${hitPedestrian.userData.id} eliminado.`);
                hitPedestrian.rotation.x = Math.PI / 2;
                hitPedestrian.position.y = hitPedestrian.geometry.parameters.radius; // On the ground
                createBloodPuddle(hitPedestrian.position); // NUEVO
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
        if (!ped.visible) return;
        if (ped.userData.health <= 0) {
            if (ped.rotation.x !== Math.PI / 2) { // Ensure they are fallen if "dead" but not yet processed
                 ped.rotation.x = Math.PI / 2;
                 ped.position.y = ped.geometry.parameters.radius; // On the ground
            }
            return;
        }

        const pedSpeed = ped.userData.isFleeing ? 4 : 1.5;
        const playerDistance = player.visible ? player.position.distanceTo(ped.position) : Infinity;

        // Flee if player shooting nearby
        if (!ped.userData.isFleeing && player.visible && !currentVehicle && playerDistance < 20 && inputState.shoot) {
             ped.userData.isFleeing = true;
             const fleeDirection = new THREE.Vector3().subVectors(ped.position, player.position).normalize();
             ped.userData.targetPosition.addVectors(ped.position, fleeDirection.multiplyScalar(Math.random() * 20 + 10));
        }

        // Flee from fast approaching player-controlled vehicles
        if (!ped.userData.isFleeing && currentVehicle) {
            const vehicleDistance = currentVehicle.position.distanceTo(ped.position);
            const vehicleVelocity = new THREE.Vector3(0,0,-1).applyQuaternion(currentVehicle.quaternion);
            const dirToPed = new THREE.Vector3().subVectors(ped.position, currentVehicle.position).normalize();
            const closingSpeedFactor = vehicleVelocity.dot(dirToPed);

            if (vehicleDistance < 15 && closingSpeedFactor > 0.5 ) {
                ped.userData.isFleeing = true;
                const fleeDirection = new THREE.Vector3().subVectors(ped.position, currentVehicle.position).normalize();
                ped.userData.targetPosition.addVectors(ped.position, fleeDirection.multiplyScalar(Math.random() * 15 + 10));
            }
        }

        // Pathfinding logic
        if (ped.userData.isFleeing) {
            if (ped.position.distanceTo(ped.userData.targetPosition) < 2 || Math.random() < 0.01) {
                 const sourceOfDanger = currentVehicle ? currentVehicle.position : (player.visible ? player.position : ped.position);
                 const fleeDirection = new THREE.Vector3().subVectors(ped.position, sourceOfDanger).normalize();
                 if (fleeDirection.lengthSq() < 0.001) fleeDirection.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
                 ped.userData.targetPosition.addVectors(ped.position, fleeDirection.multiplyScalar(Math.random() * 20 + 10));
            }
        } else { // Wandering
            if (ped.position.distanceTo(ped.userData.targetPosition) < 1 || Math.random() < 0.01) {
                ped.userData.targetPosition.set(
                    (Math.random() - 0.5) * 200,
                    ped.position.y, // Keep current Y (already set at creation)
                    (Math.random() - 0.5) * 200
                );
            }
        }

        const moveDirection = new THREE.Vector3().subVectors(ped.userData.targetPosition, ped.position);
        moveDirection.y = 0; // Don't move up/down
        if (moveDirection.lengthSq() > 0.001) { // Avoid normalizing zero vector
            moveDirection.normalize();
            ped.position.addScaledVector(moveDirection, pedSpeed * deltaTime);
            // Keep ped upright while looking
            const lookAtPos = new THREE.Vector3(ped.userData.targetPosition.x, ped.position.y, ped.userData.targetPosition.z);
            ped.lookAt(lookAtPos);
        }

        // Pedestrian-Building Collision
        const pedBox = new THREE.Box3().setFromObject(ped);
        scene.children.forEach(obj => {
             if (obj.geometry instanceof THREE.BoxGeometry && obj !== ped && !(obj.geometry instanceof THREE.PlaneGeometry)) {
                const buildingBox = new THREE.Box3().setFromObject(obj);
                if (pedBox.intersectsBox(buildingBox)) {
                    // Simplified push out for peds
                    const centerPed = new THREE.Vector3(); pedBox.getCenter(centerPed);
                    const centerBuild = new THREE.Vector3(); buildingBox.getCenter(centerBuild);
                    const pushDirection = centerPed.sub(centerBuild).normalize();
                    pushDirection.y = 0; // Don't push up/down
                    ped.position.addScaledVector(pushDirection, pedSpeed * deltaTime * 0.5); // Move slightly away
                    // Adjust target to be away from building
                    ped.userData.targetPosition.addScaledVector(pushDirection, 5);
                }
            }
        });
    });
}


function updateCamera(deltaTime) {
    if (isFreelooking && player.visible && !currentVehicle) {
        // PointerLockControls handles camera rotation. We just need to position camera at player's head.
        // Player's capsule bottom is at Y=0. Center is at Y = radius + height/2. Top is Y = radius*2 + height.
        // For CapsuleGeometry(0.4, 0.8), radius=0.4, height=0.8.
        // Player mesh center: player.position.y = 0.4 + 0.8/2 = 0.8.
        // Player total height: 0.8 (cyl) + 0.4*2 (caps) = 1.6.
        // Eye level around 1.4-1.5 from ground if player origin is at feet.
        // If player.position is capsule center, then eye height is player.position.y + a bit.
        const eyeHeightOffset = 0.6; // Relative to player's capsule center
        camera.position.set(
            player.position.x,
            player.position.y + eyeHeightOffset,
            player.position.z
        );
        // Player model's yaw should match camera's yaw from PointerLockControls
        player.rotation.y = pointerLockControls.getObject().rotation.y;

    } else if (currentVehicle) {
        const cameraLookAtOffset = new THREE.Vector3(0, 1.0, 0); // Look slightly above car center
        const offset = new THREE.Vector3(0, 4, 8);
        const cameraPosition = offset.applyMatrix4(currentVehicle.matrixWorld);
        camera.position.lerp(cameraPosition, 0.1);
        const lookAtPosition = new THREE.Vector3().copy(currentVehicle.position).add(cameraLookAtOffset);
        camera.lookAt(lookAtPosition);
    } else if (player && player.visible) { // Standard third-person chase cam
        const cameraLookAtOffset = new THREE.Vector3(0, 1.0, 0); // Look at player's upper body
        const offset = new THREE.Vector3(0, 2.5, 4.5);
        const cameraTargetPosition = new THREE.Vector3();
        player.getWorldPosition(cameraTargetPosition); // Get player's world position

        const cameraOffset = offset.clone().applyQuaternion(player.quaternion);
        const cameraPosition = cameraTargetPosition.clone().add(cameraOffset);

        camera.position.lerp(cameraPosition, 0.1);
        const lookAtPosition = cameraTargetPosition.clone().add(cameraLookAtOffset);
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
    const sunIntensityFactor = Math.max(0, Math.sin(angle - Math.PI / 2) + 0.1); // Keep some light at night

    sunLight.intensity = 0.8 * sunIntensityFactor + 0.1; // Ensure sun doesn't go completely dark
    ambientLight.intensity = 0.15 + 0.25 * sunIntensityFactor;

    scene.background.lerpColors(nightSkyColor, daySkyColor, sunIntensityFactor);
    scene.fog.color.lerpColors(nightFogColor, dayFogColor, sunIntensityFactor);
}

// --- Bucle Principal de Animación ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = Math.min(0.05, clock.getDelta()); // Cap delta time to prevent large jumps

    if (currentVehicle) {
        updateVehicleControls(deltaTime);
        crosshair.style.display = 'none';
        if(isFreelooking) pointerLockControls.unlock(); // Ensure freelook is off in vehicle
    } else if (player.visible) {
        updatePlayer(deltaTime);
        // Crosshair display for player on foot
        crosshair.style.display = (isFreelooking || inputState.shoot) ? 'block' : 'block'; // Always show if on foot and not in menu
    } else {
        crosshair.style.display = 'none'; // E.g. if player is not visible for some reason
    }


    updatePedestrians(deltaTime);
    updateCamera(deltaTime); // Camera updates AFTER player/vehicle to use their new positions
    updateDayNightCycle(deltaTime);

    renderer.render(scene, camera);
}

// --- Eventos y Arranque ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Prevent context menu on right click if pointer is locked
gameCanvas.addEventListener('contextmenu', (event) => {
    if (pointerLockControls.isLocked) {
        event.preventDefault();
    }
});


init();