import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// --- Variables Globales ---
let scene, camera, renderer, clock;
let player, playerSpeed = 5, playerRunSpeed = 10, playerRotationSpeed = 2;
let vehicles = [];
let pedestrians = [];
let bloodPuddles = [];
let streetlights = [];
let buildings = [];
let currentVehicle = null;
let ambientLight, sunLight;
let dayDuration = 120;
let timeOfDay = 0;

let pointerLockControls;
let isFreelooking = false;

const inputState = {
    forward: 0, backward: 0, left: 0, right: 0,
    action: false, shoot: false, run: false,
    freelook: false
};

const crosshair = document.getElementById('crosshair');
const gameCanvas = document.getElementById('gameCanvas');
const mobileControlsContainer = document.getElementById('mobileControls');

const worldBounds = 250;

// --- Configuración Inicial ---
function init() {
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
    const shadowSize = 150;
    sunLight.shadow.camera.left = -shadowSize;
    sunLight.shadow.camera.right = shadowSize;
    sunLight.shadow.camera.top = shadowSize;
    sunLight.shadow.camera.bottom = -shadowSize;
    scene.add(sunLight);
    scene.add(sunLight.target);

    createWorld();
    createPlayer();

    // --- CORRECCIÓN APLICADA AQUÍ ---
    // Posiciona la cámara inicialmente para que no empiece dentro del jugador.
    // Usamos los mismos cálculos que en updateCamera para la vista en tercera persona.
    const initialCameraOffset = new THREE.Vector3(0, 2.5, 4.5);
    camera.position.copy(player.position).add(initialCameraOffset);
    camera.lookAt(player.position);
    // --- FIN DE LA CORRECCIÓN ---

    createVehicles(5);
    createPedestrians(15);
    createStreetlights(40);

    pointerLockControls = new PointerLockControls(camera, renderer.domElement);
    pointerLockControls.addEventListener('lock', () => {
        isFreelooking = true;
        crosshair.style.display = 'block';
        if (document.getElementById('info')) document.getElementById('info').style.display = 'none';
    });
    pointerLockControls.addEventListener('unlock', () => {
        isFreelooking = false;
        if (document.getElementById('info')) document.getElementById('info').style.display = 'block';
    });
    scene.add(pointerLockControls.getObject());

    setupInputHandlers();
    setupMobileControls();

    animate();
}

// --- Creación de Elementos del Juego ---

function createBuildingTexture(isNight = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const context = canvas.getContext('2d');

    context.fillStyle = '#6d6d6d';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const windowColor = isNight ? '#ffffaa' : '#334455';
    context.fillStyle = windowColor;
    const windowPadding = 8;
    const windowWidth = 10;
    const windowHeight = 15;

    for (let y = windowPadding; y < canvas.height - windowHeight; y += windowHeight + windowPadding) {
        for (let x = windowPadding; x < canvas.width - windowWidth; x += windowWidth + windowPadding) {
            if (isNight && Math.random() < 0.3) {
                 context.fillStyle = '#334455';
            } else {
                 context.fillStyle = windowColor;
            }
            context.fillRect(x, y, windowWidth, windowHeight);
        }
    }
    return new THREE.CanvasTexture(canvas);
}

function createWorld() {
    const groundGeo = new THREE.PlaneGeometry(worldBounds * 2, worldBounds * 2);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x777777, side: THREE.DoubleSide });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const dayTexture = createBuildingTexture(false);
    dayTexture.wrapS = dayTexture.wrapT = THREE.RepeatWrapping;
    const nightTexture = createBuildingTexture(true);
    nightTexture.wrapS = nightTexture.wrapT = THREE.RepeatWrapping;
    
    const dayMaterial = new THREE.MeshStandardMaterial({ map: dayTexture });
    const nightMaterial = new THREE.MeshStandardMaterial({ map: nightTexture, emissive: 0x222200, emissiveMap: nightTexture, emissiveIntensity: 1 });


    for (let i = 0; i < 30; i++) {
        const w = Math.random() * 10 + 5;
        const h = Math.random() * 40 + 10;
        const d = Math.random() * 10 + 5;
        const buildingGeo = new THREE.BoxGeometry(w, h, d);
        
        const bldDayMat = dayMaterial.clone();
        bldDayMat.map.repeat.set(Math.ceil(w/8), Math.ceil(h/8));
        bldDayMat.map.needsUpdate = true;
        
        const bldNightMat = nightMaterial.clone();
        bldNightMat.map.repeat.set(Math.ceil(w/8), Math.ceil(h/8));
        bldNightMat.emissiveMap.repeat.set(Math.ceil(w/8), Math.ceil(h/8));
        bldNightMat.map.needsUpdate = true;
        bldNightMat.emissiveMap.needsUpdate = true;

        const building = new THREE.Mesh(buildingGeo, bldDayMat);
        building.castShadow = true;
        building.receiveShadow = true;
        building.position.set(
            (Math.random() - 0.5) * (worldBounds * 1.8),
            h / 2,
            (Math.random() - 0.5) * (worldBounds * 1.8)
        );
        if (building.position.length() < 30) {
            building.position.x += Math.sign(building.position.x || 1) * 30;
            building.position.z += Math.sign(building.position.z || 1) * 30;
        }

        building.userData.dayMaterial = bldDayMat;
        building.userData.nightMaterial = bldNightMat;

        scene.add(building);
        buildings.push(building);
    }
}

function createStreetlights(count) {
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 6, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const lampGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const lampMatOff = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const lampMatOn = new THREE.MeshStandardMaterial({ color: 0xffffdd, emissive: 0xffffdd, emissiveIntensity: 2 });


    for (let i = 0; i < count; i++) {
        const streetlight = new THREE.Group();

        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 3;
        streetlight.add(pole);
        
        const lamp = new THREE.Mesh(lampGeo, lampMatOff);
        lamp.position.y = 6;
        streetlight.add(lamp);
        
        const light = new THREE.PointLight(0xffddaa, 0, 20, 2);
        light.position.y = 5.8;
        light.castShadow = true;
        light.shadow.mapSize.width = 256;
        light.shadow.mapSize.height = 256;
        streetlight.add(light);

        streetlight.position.set(
            (Math.random() - 0.5) * (worldBounds * 1.9),
            0,
            (Math.random() - 0.5) * (worldBounds * 1.9)
        );

        streetlight.userData = { lamp, light, lampMatOff, lampMatOn, isOn: false };
        
        scene.add(streetlight);
        streetlights.push(streetlight);
    }
}


function createPlayer() {
    const playerGeo = new THREE.CapsuleGeometry(0.4, 0.8, 8, 16);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    player = new THREE.Mesh(playerGeo, playerMat);
    player.castShadow = true;
    player.position.y = 0.4 + 0.8 / 2;
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
    const bodyGeo = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);

    for (let i = 0; i < count; i++) {
        const pedMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) });
        
        const pedestrian = new THREE.Group();
        
        const body = new THREE.Mesh(bodyGeo, pedMat);
        body.castShadow = true;
        body.userData.part = 'body';
        
        const head = new THREE.Mesh(headGeo, pedMat);
        head.castShadow = true;
        head.position.y = (1.0 / 2) + 0.3 + 0.25;
        head.userData.part = 'head';

        pedestrian.add(body);
        pedestrian.add(head);

        pedestrian.position.set(
            (Math.random() - 0.5) * 150,
            0.3 + 1.0 / 2,
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
            case 'control':
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
        }
    });
    document.addEventListener('mousedown', (event) => {
        if (event.button === 0) {
            if (!isFreelooking && !currentVehicle) {
                pointerLockControls.lock();
            }
            inputState.shoot = true;
        }
    });
    document.addEventListener('mouseup', (event) => {
        if (event.button === 0) inputState.shoot = false;
    });
}

function setupMobileControls() { /* ... sin cambios ... */ }


// --- Lógica de Juego (Actualizaciones) ---
function updatePlayer(deltaTime) {
    if (!player || currentVehicle || !player.visible) return;

    const currentSpeed = inputState.run ? playerRunSpeed : playerSpeed;
    let isMoving = false;
    
    // Movimiento combinado para Freelook y Tercera Persona
    if (isFreelooking) {
        // En Freelook, el ratón controla la cámara, y la cámara controla la rotación del jugador
        player.rotation.y = pointerLockControls.getObject().rotation.y;

        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();

        const rightDirection = new THREE.Vector3().crossVectors(camera.up, cameraDirection).normalize();
        
        const finalMove = new THREE.Vector3();
        if (inputState.forward) finalMove.add(cameraDirection);
        if (inputState.backward) finalMove.sub(cameraDirection);
        if (inputState.left) finalMove.sub(rightDirection);
        if (inputState.right) finalMove.add(rightDirection);

        if(finalMove.lengthSq() > 0){
            finalMove.normalize();
            player.position.addScaledVector(finalMove, currentSpeed * deltaTime);
            isMoving = true;
        }

    } else {
        // En tercera persona, A/D rotan al jugador
        if (inputState.left) player.rotation.y += playerRotationSpeed * deltaTime;
        if (inputState.right) player.rotation.y -= playerRotationSpeed * deltaTime;

        const moveDirection = new THREE.Vector3();
        if (inputState.forward) moveDirection.z = -1;
        if (inputState.backward) moveDirection.z = 1;

        if (moveDirection.lengthSq() > 0) {
            const worldMoveDirection = moveDirection.applyQuaternion(player.quaternion);
            player.position.addScaledVector(worldMoveDirection, currentSpeed * deltaTime);
            isMoving = true;
        }
    }


    // Colisión jugador-edificio
    if(isMoving) {
        player.updateMatrixWorld();
        const playerBox = new THREE.Box3().setFromObject(player);
        buildings.forEach(building => {
            const buildingBox = new THREE.Box3().setFromObject(building);
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
                }
            }
        });
    }


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
            const pedBox = new THREE.Box3().setFromObject(ped);
            if (vehicleBox.intersectsBox(pedBox)) {
                console.log(`Peatón ${ped.userData.id} atropellado!`);
                ped.userData.health = 0;
                ped.rotation.x = Math.PI / 2;
                ped.position.y = 0.3;
                createBloodPuddle(ped.position);
            }
        }
    });
}

function toggleVehicleEntry() {
    if (currentVehicle) {
        player.visible = true;
        const carWidth = currentVehicle.geometry.parameters.width;
        const carLength = currentVehicle.geometry.parameters.depth;

        const potentialExitLocalOffsets = [
            new THREE.Vector3(carWidth / 2 + 0.6, 0, 0),
            new THREE.Vector3(-carWidth / 2 - 0.6, 0, 0),
            new THREE.Vector3(0, 0, carLength / 2 + 0.6),
            new THREE.Vector3(0, 0, -carLength / 2 - 0.6),
        ];

        let foundClearSpot = false;
        for (const localOffset of potentialExitLocalOffsets) {
            const exitOffset = localOffset.clone().applyQuaternion(currentVehicle.quaternion);
            player.position.copy(currentVehicle.position).add(exitOffset);
            player.position.y = player.geometry.parameters.radius + player.geometry.parameters.height / 2;
            player.rotation.copy(currentVehicle.rotation);

            player.updateMatrixWorld();
            const playerExitBox = new THREE.Box3().setFromObject(player);
            let isColliding = false;

            for (const building of buildings) {
                const buildingBox = new THREE.Box3().setFromObject(building);
                if (playerExitBox.intersectsBox(buildingBox)) {
                    isColliding = true;
                    break;
                }
            }
            if (isColliding) continue;

            const carBox = new THREE.Box3().setFromObject(currentVehicle);
            if (playerExitBox.intersectsBox(carBox)) {
                isColliding = true;
            }

            if (!isColliding) {
                foundClearSpot = true;
                break;
            }
        }

        if (!foundClearSpot) {
            console.warn("No se pudo encontrar un lugar de salida despejado.");
            const exitOffset = potentialExitLocalOffsets[0].clone().applyQuaternion(currentVehicle.quaternion);
            player.position.copy(currentVehicle.position).add(exitOffset);
            player.position.y = player.geometry.parameters.radius + player.geometry.parameters.height / 2;
        }

        player.position.x = THREE.MathUtils.clamp(player.position.x, -worldBounds + 2, worldBounds - 2);
        player.position.z = THREE.MathUtils.clamp(player.position.z, -worldBounds + 2, worldBounds - 2);

        currentVehicle = null;
        if (isFreelooking) pointerLockControls.unlock();
        
    } else {
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
    if (!player || currentVehicle || !player.visible) return;

    const raycaster = new THREE.Raycaster();
    const shootOrigin = new THREE.Vector3();
    const shootDirection = new THREE.Vector3();

    camera.getWorldPosition(shootOrigin);
    camera.getWorldDirection(shootDirection);

    raycaster.set(shootOrigin, shootDirection);
    
    const livingPedestrians = pedestrians.filter(p => p.userData.health > 0 && p.visible);
    const intersects = raycaster.intersectObjects(livingPedestrians, true);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const hitPedestrian = hitMesh.parent;

        if (hitPedestrian && hitPedestrian.userData.health > 0) {
            const hitPart = hitMesh.userData.part;
            
            if (hitPart === 'head') {
                console.log(`¡Disparo a la cabeza a ${hitPedestrian.userData.id}!`);
                hitPedestrian.userData.health = 0;
            } else if (hitPart === 'body') {
                console.log(`Disparo al cuerpo de ${hitPedestrian.userData.id}!`);
                hitPedestrian.userData.health -= 34;
            }

            if (hitPedestrian.userData.health <= 0) {
                console.log(`Peatón ${hitPedestrian.userData.id} eliminado.`);
                hitPedestrian.rotation.x = Math.PI / 2;
                hitPedestrian.position.y = 0.3;
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
    pedestrians.forEach(ped => {
        if (!ped.visible) return;
        if (ped.userData.health <= 0) {
            if (ped.rotation.x !== Math.PI / 2) {
                 ped.rotation.x = Math.PI / 2;
                 ped.position.y = 0.3;
            }
            return;
        }

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
        if (ped.userData.isFleeing) {
            if (ped.position.distanceTo(ped.userData.targetPosition) < 2 || Math.random() < 0.01) {
                 const sourceOfDanger = currentVehicle ? currentVehicle.position : (player.visible ? player.position : ped.position);
                 const fleeDirection = new THREE.Vector3().subVectors(ped.position, sourceOfDanger).normalize();
                 if (fleeDirection.lengthSq() < 0.001) fleeDirection.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
                 ped.userData.targetPosition.addVectors(ped.position, fleeDirection.multiplyScalar(Math.random() * 20 + 10));
            }
        } else {
            if (ped.position.distanceTo(ped.userData.targetPosition) < 1 || Math.random() < 0.01) {
                ped.userData.targetPosition.set(
                    (Math.random() - 0.5) * (worldBounds * 1.8),
                    ped.position.y,
                    (Math.random() - 0.5) * (worldBounds * 1.8)
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

        const pedBox = new THREE.Box3().setFromObject(ped);
        buildings.forEach(building => {
            const buildingBox = new THREE.Box3().setFromObject(building);
            if(pedBox.intersectsBox(buildingBox)){
                const centerPed = new THREE.Vector3(); pedBox.getCenter(centerPed);
                const centerBuild = new THREE.Vector3(); buildingBox.getCenter(centerBuild);
                const pushDirection = centerPed.sub(centerBuild).normalize();
                pushDirection.y = 0;
                ped.position.addScaledVector(pushDirection, pedSpeed * deltaTime * 0.5);
                ped.userData.targetPosition.addScaledVector(pushDirection, 5);
            }
        });
    });
}


function updateCamera(deltaTime) {
    if (isFreelooking && player.visible && !currentVehicle) {
        const eyeHeightOffset = 0.6;
        camera.position.set(
            player.position.x,
            player.position.y + eyeHeightOffset,
            player.position.z
        );
    } else if (currentVehicle) {
        const cameraLookAtOffset = new THREE.Vector3(0, 1.0, 0);
        const offset = new THREE.Vector3(0, 4, 8);
        const cameraPosition = offset.applyMatrix4(currentVehicle.matrixWorld);
        camera.position.lerp(cameraPosition, 0.1);
        const lookAtPosition = new THREE.Vector3().copy(currentVehicle.position).add(cameraLookAtOffset);
        camera.lookAt(lookAtPosition);
    } else if (player && player.visible) {
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
    const sunIntensityFactor = Math.max(0, Math.sin(angle - Math.PI / 2) + 0.1);

    sunLight.intensity = 0.8 * sunIntensityFactor + 0.1;
    ambientLight.intensity = 0.15 + 0.25 * sunIntensityFactor;

    scene.background.lerpColors(nightSkyColor, daySkyColor, sunIntensityFactor);
    scene.fog.color.lerpColors(nightFogColor, dayFogColor, sunIntensityFactor);

    const isNight = sunIntensityFactor < 0.2;

    buildings.forEach(building => {
        const currentIsNight = building.material === building.userData.nightMaterial;
        if (isNight && !currentIsNight) {
            building.material = building.userData.nightMaterial;
        } else if (!isNight && currentIsNight) {
            building.material = building.userData.dayMaterial;
        }
    });

    streetlights.forEach(sl => {
        if (isNight && !sl.userData.isOn) {
            sl.userData.light.intensity = 2.5;
            sl.userData.lamp.material = sl.userData.lampMatOn;
            sl.userData.isOn = true;
        } else if (!isNight && sl.userData.isOn) {
            sl.userData.light.intensity = 0;
            sl.userData.lamp.material = sl.userData.lampMatOff;
            sl.userData.isOn = false;
        }
    });
}


// --- Bucle Principal de Animación ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = Math.min(0.05, clock.getDelta());

    if (currentVehicle) {
        updateVehicleControls(deltaTime);
        crosshair.style.display = 'none';
        if(isFreelooking) pointerLockControls.unlock();
    } else if (player.visible) {
        updatePlayer(deltaTime);
        crosshair.style.display = isFreelooking ? 'block' : 'none';
    } else {
        crosshair.style.display = 'none';
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
    if (pointerLockControls.isLocked) {
        event.preventDefault();
    }
});

init();