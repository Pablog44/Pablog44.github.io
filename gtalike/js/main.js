import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- Variables Globales ---
let scene, camera, renderer, clock;
let player, playerSpeed = 5, playerRunSpeed = 10, playerRotationSpeed = 2;
let vehicles = [];
let pedestrians = [];
let bloodPuddles = [];
let currentVehicle = null;
let ambientLight, sunLight;
let dayDuration = 120; // Duración del día en segundos
let timeOfDay = 0;
let pointerLockControls;
let isFreelooking = false;
let isTouchDevice = false;

const inputState = {
    forward: 0, backward: 0, left: 0, right: 0,
    action: false, shoot: false, run: false
};

// --- Variables para Joystick de Apuntado (Móvil) ---
const aimJoystick = {
    active: false,
    area: document.getElementById('aim-joystick-area'),
    knob: document.getElementById('aim-joystick-knob'),
    center: new THREE.Vector2(),
    current: new THREE.Vector2(),
    delta: new THREE.Vector2(),
    touchId: -1,
    sensitivity: 0.002
};
let cameraPitch = 0;
const MAX_PITCH = Math.PI / 2 - 0.1;
const MIN_PITCH = -Math.PI / 2 + 0.1;


const crosshair = document.getElementById('crosshair');
const gameCanvas = document.getElementById('gameCanvas');
const mobileControlsContainer = document.getElementById('mobileControls');

// --- Configuración Inicial ---
function init() {
    isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    clock = new THREE.Clock();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

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
    scene.add(sunLight);
    scene.add(sunLight.target);

    createWorld();
    createPlayer();
    createVehicles(5);
    createPedestrians(15);

    // Pointer Lock Controls (solo para escritorio)
    if (!isTouchDevice) {
        setupPointerLock();
    }
    
    setupInputHandlers();
    setupMobileControls();

    animate();
}

function setupPointerLock() {
    pointerLockControls = new PointerLockControls(camera, renderer.domElement);
    pointerLockControls.addEventListener('lock', () => {
        isFreelooking = true;
        crosshair.style.display = 'block';
        if (document.getElementById('info')) document.getElementById('info').style.display = 'none';
    });
    pointerLockControls.addEventListener('unlock', () => {
        isFreelooking = false;
        crosshair.style.display = 'none';
        if (document.getElementById('info')) document.getElementById('info').style.display = 'block';
    });
    scene.add(pointerLockControls.getObject());
}


// --- Creación de Elementos del Juego (sin cambios) ---
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
    player = new THREE.Group();
    const bodyRadius = 0.4;
    const bodyHeight = 0.8;
    const headRadius = 0.25;

    const bodyGeo = new THREE.CapsuleGeometry(bodyRadius, bodyHeight, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.userData.type = 'body';
    player.add(body);

    const headGeo = new THREE.SphereGeometry(headRadius, 16, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.y = (bodyHeight / 2) + headRadius * 0.8;
    head.userData.type = 'head';
    player.add(head);

    player.position.y = bodyRadius + bodyHeight / 2;
    scene.add(player);
}
function createVehicles(count) {
    const carColors = [0xff0000, 0x0000ff, 0xffff00, 0x00ffff, 0xff00ff, 0x888888];
    const carGeo = new THREE.BoxGeometry(2.2, 1.8, 4);
    for (let i = 0; i < count; i++) {
        const carMat = new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length] });
        const vehicle = new THREE.Mesh(carGeo, carMat);
        vehicle.castShadow = true;
        vehicle.receiveShadow = true;
        vehicle.position.set(
            (Math.random() - 0.5) * 80 + 10,
            carGeo.parameters.height / 2,
            (Math.random() - 0.5) * 80 + 10
        );
        vehicle.userData = { id: `car_${i}`, speed: 0, steering: 0 };
        vehicles.push(vehicle);
        scene.add(vehicle);
    }
}
function createPedestrians(count) {
    const bodyRadius = 0.3;
    const bodyHeight = 1.0;
    const headRadius = 0.2;
    const bodyGeo = new THREE.CapsuleGeometry(bodyRadius, bodyHeight, 4, 8);
    const headGeo = new THREE.SphereGeometry(headRadius, 12, 8);

    for (let i = 0; i < count; i++) {
        const pedestrian = new THREE.Group();

        const bodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        body.userData.type = 'body';
        body.userData.parentGroup = pedestrian; // Reference to parent group
        pedestrian.add(body);

        const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeo, headMat);
        head.castShadow = true;
        head.position.y = (bodyHeight / 2) + headRadius * 0.8;
        head.userData.type = 'head';
        head.userData.parentGroup = pedestrian; // Reference to parent group
        pedestrian.add(head);

        pedestrian.position.set(
            (Math.random() - 0.5) * 150,
            bodyRadius + bodyHeight / 2,
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
    bloodMat.polygonOffset = true;
    bloodMat.polygonOffsetFactor = -1.0;
    bloodMat.polygonOffsetUnits = -4.0;

    const puddle = new THREE.Mesh(bloodGeo, bloodMat);
    puddle.position.set(position.x, 0.01, position.z);
    puddle.rotation.x = -Math.PI / 2;
    puddle.receiveShadow = true;
    scene.add(puddle);
    bloodPuddles.push(puddle);

    setTimeout(() => {
        scene.remove(puddle);
        puddle.geometry.dispose();
        puddle.material.dispose();
        bloodPuddles = bloodPuddles.filter(p => p !== puddle);
    }, 20000);
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
            case 'f': inputState.action = false; break;
            case 'shift': inputState.run = false; break;
        }
    });

    document.addEventListener('mousedown', (event) => {
        if (currentVehicle || !player.visible) return;
        
        switch (event.button) {
            case 0: inputState.shoot = true; break;
            case 2:
                if (pointerLockControls.isLocked) pointerLockControls.unlock();
                else pointerLockControls.lock();
                break;
        }
    });

    document.addEventListener('mouseup', (event) => {
        if (event.button === 0) inputState.shoot = false;
    });
}

function setupMobileControls() {
    if (!isTouchDevice || !mobileControlsContainer) return;
    mobileControlsContainer.style.display = 'block';

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
    
    // Botón de pantalla completa
    const fullscreenButton = document.getElementById('mc-fullscreen');
    if (fullscreenButton) {
        fullscreenButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    // Joystick de apuntado
    const joystickArea = aimJoystick.area;
    joystickArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (aimJoystick.touchId === -1) { // Capturar solo el primer toque
            const touch = e.changedTouches[0];
            aimJoystick.touchId = touch.identifier;
            aimJoystick.active = true;
            aimJoystick.center.set(touch.clientX, touch.clientY);
            aimJoystick.current.copy(aimJoystick.center);
            crosshair.style.display = 'block';
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (aimJoystick.active) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === aimJoystick.touchId) {
                    e.preventDefault();
                    aimJoystick.current.set(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
                    break;
                }
            }
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        if (aimJoystick.active) {
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === aimJoystick.touchId) {
                    e.preventDefault();
                    aimJoystick.active = false;
                    aimJoystick.touchId = -1;
                    aimJoystick.knob.style.transform = `translate(-50%, -50%)`;
                    crosshair.style.display = 'none';
                    break;
                }
            }
        }
    }, { passive: false });
}

// --- Lógica de Juego (Actualizaciones) ---
function updatePlayer(deltaTime) {
    if (!player || currentVehicle || !player.visible) return;

    const currentSpeed = inputState.run ? playerRunSpeed : playerSpeed;
    const moveDirection = new THREE.Vector3();
    let isMoving = false;

    // Movimiento (Móvil y Escritorio)
    if (inputState.forward) { moveDirection.z = -1; isMoving = true; }
    if (inputState.backward) { moveDirection.z = 1; isMoving = true; }
    
    // En móvil, izquierda/derecha es strafing. En escritorio sin apuntar, es rotación.
    if (inputState.left) { moveDirection.x = -1; isMoving = true; }
    if (inputState.right) { moveDirection.x = 1; isMoving = true; }

    // Rotación y movimiento
    if (isTouchDevice) {
        // Rotación con Joystick
        if (aimJoystick.active) {
            aimJoystick.delta.subVectors(aimJoystick.current, aimJoystick.center);
            
            player.rotation.y -= aimJoystick.delta.x * aimJoystick.sensitivity;
            cameraPitch -= aimJoystick.delta.y * aimJoystick.sensitivity;
            cameraPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, cameraPitch));
            
            // Actualizar la posición visual del knob
            const knobX = Math.max(-40, Math.min(40, aimJoystick.delta.x));
            const knobY = Math.max(-40, Math.min(40, aimJoystick.delta.y));
            aimJoystick.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

            // Reiniciar el centro para que el movimiento sea relativo
            aimJoystick.center.copy(aimJoystick.current);
        }
        
        // El movimiento siempre es relativo a la cámara
        if (isMoving) {
            const worldMoveDirection = moveDirection.clone().normalize().applyQuaternion(camera.quaternion);
            player.position.addScaledVector(worldMoveDirection, currentSpeed * deltaTime);
        }

    } else { // Lógica de Escritorio
        if (isMoving) {
            // Si está en modo freelook, el movimiento es relativo a la cámara.
            // Si no, es relativo al jugador (movimiento tipo tanque).
            const moveQuaternion = isFreelooking ? camera.quaternion : player.quaternion;
            const worldMoveDirection = moveDirection.clone().normalize().applyQuaternion(moveQuaternion);
            player.position.addScaledVector(worldMoveDirection, currentSpeed * deltaTime);
        }

        // Rotación
        if (isFreelooking) {
            player.rotation.y = pointerLockControls.getObject().rotation.y;
        } else {
            // Rotación estilo "tanque" con A y D (si no se está moviendo hacia los lados)
            if (moveDirection.x === 0) {
                 if (inputState.left) player.rotation.y += playerRotationSpeed * deltaTime;
                 if (inputState.right) player.rotation.y -= playerRotationSpeed * deltaTime;
            }
        }
    }
    
    // Colisiones (sin cambios)...
    const playerBody = player.children[0];
    playerBody.updateMatrixWorld();
    const playerBox = new THREE.Box3().setFromObject(playerBody);
    scene.children.forEach(obj => {
        if (obj.geometry instanceof THREE.BoxGeometry && obj !== player) {
            obj.updateMatrixWorld();
            const buildingBox = new THREE.Box3().setFromObject(obj);

            if (playerBox.intersectsBox(buildingBox)) {
                const centerA = new THREE.Vector3(); playerBox.getCenter(centerA);
                const centerB = new THREE.Vector3(); buildingBox.getCenter(centerB);
                const sizeA = new THREE.Vector3(); playerBox.getSize(sizeA);
                const sizeB = new THREE.Vector3(); buildingBox.getSize(sizeB);

                const overlapX = (sizeA.x / 2 + sizeB.x / 2) - Math.abs(centerA.x - centerB.x);
                const overlapZ = (sizeA.z / 2 + sizeB.z / 2) - Math.abs(centerA.z - centerB.z);

                if (overlapX > 0 && overlapZ > 0) {
                    if (overlapX < overlapZ) {
                        player.position.x += (centerA.x < centerB.x ? -overlapX : overlapX);
                    } else {
                        player.position.z += (centerA.z < centerB.z ? -overlapZ : overlapZ);
                    }
                    playerBody.updateMatrixWorld();
                    playerBox.setFromObject(playerBody);
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

    const vehicleBox = new THREE.Box3().setFromObject(currentVehicle);
    pedestrians.forEach(ped => {
        if (ped.userData.health > 0 && ped.visible) {
            const pedBody = ped.children[0];
            const pedBox = new THREE.Box3().setFromObject(pedBody);
            if (vehicleBox.intersectsBox(pedBox)) {
                console.log(`Peatón ${ped.userData.id} atropellado!`);
                ped.userData.health = 0;
                ped.rotation.x = Math.PI / 2;
                ped.position.y = pedBody.geometry.parameters.radius;
                createBloodPuddle(ped.position);
            }
        }
    });
}

function toggleVehicleEntry() {
    if (currentVehicle) { // Salir del vehículo
        player.visible = true;
        const carWidth = currentVehicle.geometry.parameters.width;
        const exitOffset = new THREE.Vector3(carWidth / 2 + 0.6, 0, 0).applyQuaternion(currentVehicle.quaternion);
        player.position.copy(currentVehicle.position).add(exitOffset);
        const playerBody = player.children[0];
        player.position.y = playerBody.geometry.parameters.radius + playerBody.geometry.parameters.height / 2;
        player.rotation.copy(currentVehicle.rotation);
        
        currentVehicle = null;
        if (isFreelooking) pointerLockControls.unlock();

    } else { // Entrar al vehículo
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
                pointerLockControls.unlock();
            }
        }
    }
}

function shoot() {
    // Permitir disparo en móvil si se está apuntando con el joystick
    if (!player || currentVehicle || !player.visible || (!isFreelooking && !aimJoystick.active)) return;

    const raycaster = new THREE.Raycaster();
    const shootOrigin = new THREE.Vector3();
    const shootDirection = new THREE.Vector3();

    camera.getWorldPosition(shootOrigin);
    camera.getWorldDirection(shootDirection);
    raycaster.set(shootOrigin, shootDirection);

    const livingPedestrians = pedestrians.filter(p => p.userData.health > 0 && p.visible);
    const hittableMeshes = livingPedestrians.flatMap(p => p.children);
    const intersects = raycaster.intersectObjects(hittableMeshes, false);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const hitPedestrian = hitMesh.userData.parentGroup;

        if (hitPedestrian) {
            const damage = hitMesh.userData.type === 'head' ? 100 : 50;
            hitPedestrian.userData.health -= damage;

            if (hitPedestrian.userData.health <= 0) {
                hitPedestrian.rotation.x = Math.PI / 2;
                hitPedestrian.position.y = hitPedestrian.children[0].geometry.parameters.radius;
                createBloodPuddle(hitPedestrian.position);
            } else {
                hitPedestrian.userData.isFleeing = true;
                const fleeDir = new THREE.Vector3().subVectors(hitPedestrian.position, player.position).normalize();
                hitPedestrian.userData.targetPosition.addVectors(hitPedestrian.position, fleeDir.multiplyScalar(30));
            }
        }
    }
}

function updatePedestrians(deltaTime) {
    // Lógica sin cambios...
    pedestrians.forEach(ped => {
        if (!ped.visible || ped.userData.health <= 0) return;

        const pedSpeed = ped.userData.isFleeing ? 4 : 1.5;
        const playerDistance = player.visible ? player.position.distanceTo(ped.position) : Infinity;

        if (!ped.userData.isFleeing && player.visible && !currentVehicle && playerDistance < 20 && inputState.shoot) {
             ped.userData.isFleeing = true;
             const fleeDirection = new THREE.Vector3().subVectors(ped.position, player.position).normalize();
             ped.userData.targetPosition.addVectors(ped.position, fleeDirection.multiplyScalar(Math.random() * 20 + 10));
        }

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

        if (ped.position.distanceTo(ped.userData.targetPosition) < (ped.userData.isFleeing ? 2 : 1) || Math.random() < 0.01) {
            if (ped.userData.isFleeing) {
                 const sourceOfDanger = currentVehicle ? currentVehicle.position : (player.visible ? player.position : ped.position);
                 const fleeDirection = new THREE.Vector3().subVectors(ped.position, sourceOfDanger).normalize();
                 if (fleeDirection.lengthSq() < 0.001) fleeDirection.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
                 ped.userData.targetPosition.addVectors(ped.position, fleeDirection.multiplyScalar(Math.random() * 20 + 10));
            } else {
                ped.userData.targetPosition.set(
                    (Math.random() - 0.5) * 200,
                    ped.position.y,
                    (Math.random() - 0.5) * 200
                );
            }
        }

        const moveDirection = new THREE.Vector3().subVectors(ped.userData.targetPosition, ped.position);
        moveDirection.y = 0;
        if (moveDirection.lengthSq() > 0.001) {
            moveDirection.normalize();
            ped.position.addScaledVector(moveDirection, pedSpeed * deltaTime);
            const lookAtPos = new THREE.Vector3(ped.userData.targetPosition.x, ped.position.y, ped.userData.targetPosition.z);
            ped.lookAt(lookAtPos);
        }

        const pedBody = ped.children[0];
        const pedBox = new THREE.Box3().setFromObject(pedBody);
        scene.children.forEach(obj => {
             if (obj.geometry instanceof THREE.BoxGeometry && obj !== ped) {
                const buildingBox = new THREE.Box3().setFromObject(obj);
                if (pedBox.intersectsBox(buildingBox)) {
                    const centerPed = new THREE.Vector3(); pedBox.getCenter(centerPed);
                    const centerBuild = new THREE.Vector3(); buildingBox.getCenter(centerBuild);
                    const pushDirection = centerPed.sub(centerBuild).normalize();
                    pushDirection.y = 0;
                    ped.position.addScaledVector(pushDirection, pedSpeed * deltaTime * 0.5);
                    ped.userData.targetPosition.addScaledVector(pushDirection, 5);
                }
            }
        });
    });
}

function updateCamera(deltaTime) {
    if (currentVehicle) {
        const cameraLookAtOffset = new THREE.Vector3(0, 1.0, 0);
        const offset = new THREE.Vector3(0, 4, 8);
        const cameraPosition = offset.applyMatrix4(currentVehicle.matrixWorld);
        camera.position.lerp(cameraPosition, 0.1);
        const lookAtPosition = new THREE.Vector3().copy(currentVehicle.position).add(cameraLookAtOffset);
        camera.lookAt(lookAtPosition);
    } else if (player && player.visible) {
        if (isTouchDevice) {
            // La cámara en móvil se controla directamente con el joystick de apuntado
            const cameraLookAtOffset = new THREE.Vector3(0, 1.2, 0); // Mirar un poco más arriba
            const offset = new THREE.Vector3(0, 2.5, 4.5);
            
            // Rotar el offset de la cámara con la rotación del jugador
            const cameraOffset = offset.clone().applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y);
            
            const cameraTargetPosition = player.position.clone().add(cameraOffset);
            camera.position.lerp(cameraTargetPosition, 0.5); // LERP más rápido para respuesta inmediata
            
            // Aplicar la inclinación vertical (pitch)
            const lookAtTarget = player.position.clone().add(cameraLookAtOffset);
            camera.lookAt(lookAtTarget);
            camera.rotation.x += cameraPitch; // Añadir el pitch manualmente después de lookAt

        } else if (isFreelooking) { // Cámara en 1a persona para escritorio
            const head = player.children[1];
            const headPosition = new THREE.Vector3();
            head.getWorldPosition(headPosition);
            camera.position.copy(headPosition);
        } else { // Cámara en 3a persona para escritorio
            const cameraLookAtOffset = new THREE.Vector3(0, 1.0, 0);
            const offset = new THREE.Vector3(0, 2.5, 4.5);
            const cameraTargetPosition = new THREE.Vector3();
            player.getWorldPosition(cameraTargetPosition);

            const cameraOffset = offset.clone().applyQuaternion(player.quaternion);
            const cameraPosition = cameraTargetPosition.clone().add(cameraOffset);

            camera.position.lerp(cameraPosition, 0.1);
            const lookAtPosition = cameraTargetPosition.clone().add(cameraLookAtOffset);
            camera.lookAt(lookAtPosition);
        }
    }
}

function updateDayNightCycle(deltaTime) {
    // Lógica sin cambios...
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

    const sunIntensityFactor = Math.max(0, Math.sin(angle - Math.PI / 2) + 0.1);

    sunLight.intensity = 0.8 * sunIntensityFactor + 0.1;
    ambientLight.intensity = 0.15 + 0.25 * sunIntensityFactor;

    scene.background.lerpColors(nightSkyColor, daySkyColor, sunIntensityFactor);
    scene.fog.color.lerpColors(nightFogColor, dayFogColor, sunIntensityFactor);
}

function updateMobileUI() {
    if (!isTouchDevice) return;
    
    // Mostrar/ocultar el joystick de apuntado
    const showAimJoystick = !currentVehicle && player.visible;
    if (aimJoystick.area) {
        aimJoystick.area.style.display = showAimJoystick ? 'block' : 'none';
    }
}

// --- Bucle Principal de Animación ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = Math.min(0.05, clock.getDelta());

    if (currentVehicle) {
        updateVehicleControls(deltaTime);
    } else if (player.visible) {
        updatePlayer(deltaTime);
    }

    if(isTouchDevice) {
        updateMobileUI();
    } else {
        if (!isFreelooking && !currentVehicle) {
            crosshair.style.display = 'none';
        }
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

gameCanvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

init();