// --- Variables Globales ---
let scene, camera, renderer;
let player, controls;
let mapData = []; // Matriz 2D para el mapa
let mapWidth = 10;
let mapHeight = 10;
const TILE_SIZE = 5; // Tamaño de cada cuadrado en el mundo 3D
const WALL_HEIGHT = 5; // Altura de las paredes

// Texturas
const textureLoader = new THREE.TextureLoader();
let wallTextures = [];
let floorTextures = [];
let ceilingTextures = [];
let wallTextureUrls = ['textures/wall1.png', 'textures/wall2.png']; // Rutas iniciales
let floorTextureUrls = ['textures/floor1.png'];
let ceilingTextureUrls = ['textures/ceiling1.png'];

// Estado del Editor
let currentTool = 'wall'; // 'wall' o 'floor'
let selectedWallTextureIndex = 0;
let selectedFloorTextureIndex = 0;
let selectedCeilingTextureIndex = 0;

// Movimiento
const moveState = { forward: 0, back: 0, left: 0, right: 0, up: 0, down: 0 };
const moveSpeed = 10.0;
const lookSpeed = 0.003;
let clock = new THREE.Clock();
let isPointerLocked = false;

// Objetos 3D del mapa
let mapMeshesGroup = new THREE.Group(); // Grupo para contener todos los meshes del mapa

// --- Inicialización ---
function init() {
    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Color cielo
    scene.fog = new THREE.Fog(0x87CEEB, 0, TILE_SIZE * mapWidth * 0.8); // Niebla ligera

    // Cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = WALL_HEIGHT / 2; // Altura inicial del jugador

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth - 450, window.innerHeight); // Ajusta al tamaño del contenedor
    renderer.shadowMap.enabled = true; // Sombras (opcional, puede afectar rendimiento)

    // Luces
    const ambientLight = new THREE.AmbientLight(0xaaaaaa); // Luz ambiental suave
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(10, 30, 20);
    directionalLight.castShadow = true; // La luz proyecta sombras
    scene.add(directionalLight);

    // Controles de Cámara (Pointer Lock para movimiento FPS)
    setupPointerLock();

    // Cargar texturas iniciales y construir el mapa
    preloadTextures().then(() => {
        createMapData(); // Crear datos del mapa inicial
        buildMapGeometry(); // Construir geometría 3D
        setupEditor(); // Configurar la interfaz del editor
        animate(); // Iniciar el bucle de renderizado
    }).catch(error => {
        console.error("Error al cargar texturas iniciales:", error);
        // Opcional: Mostrar un mensaje al usuario
    });


    // Event Listener para redimensionar ventana
    window.addEventListener('resize', onWindowResize, false);
}

// --- Carga de Texturas ---
async function loadTexture(url) {
    return new Promise((resolve, reject) => {
        textureLoader.load(
            url,
            (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.magFilter = THREE.NearestFilter; // Estilo Pixelado (Doom)
                texture.minFilter = THREE.LinearMipmapLinearFilter; // Mejor calidad a distancia
                resolve(texture);
            },
            undefined, // onProgress (no necesario aquí)
            (error) => {
                console.error(`Error cargando textura: ${url}`, error);
                // Intentar cargar una textura por defecto o placeholder
                textureLoader.load('textures/placeholder.png', // Asegúrate de tener esta imagen
                    (placeholderTexture) => {
                         placeholderTexture.wrapS = THREE.RepeatWrapping;
                         placeholderTexture.wrapT = THREE.RepeatWrapping;
                         placeholderTexture.magFilter = THREE.NearestFilter;
                         placeholderTexture.minFilter = THREE.LinearMipmapLinearFilter;
                         resolve(placeholderTexture); // Resuelve con el placeholder
                    },
                    undefined,
                    (placeholderError) => {
                         console.error("Error cargando textura placeholder", placeholderError);
                         reject(`No se pudo cargar ${url} ni el placeholder.`); // Rechaza si ni el placeholder carga
                    }
                 );
            }
        );
    });
}


async function preloadTextures() {
    const wallPromises = wallTextureUrls.map(url => loadTexture(url));
    const floorPromises = floorTextureUrls.map(url => loadTexture(url));
    const ceilingPromises = ceilingTextureUrls.map(url => loadTexture(url));

    wallTextures = await Promise.all(wallPromises);
    floorTextures = await Promise.all(floorPromises);
    ceilingTextures = await Promise.all(ceilingPromises);
    console.log("Texturas cargadas:", { wallTextures, floorTextures, ceilingTextures });
    updateTexturePalettes(); // Actualizar UI después de cargar
}

// --- Creación y Gestión del Mapa ---
function createMapData(newWidth = mapWidth, newHeight = mapHeight) {
    mapWidth = newWidth;
    mapHeight = newHeight;
    mapData = [];
    for (let y = 0; y < mapHeight; y++) {
        mapData[y] = [];
        for (let x = 0; x < mapWidth; x++) {
            // Borde exterior como pared por defecto
            const isWall = x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1;
            mapData[y][x] = {
                isWall: isWall,
                wallTexture: 0, // Índice de textura de pared
                floorTexture: 0, // Índice de textura de suelo
                ceilingTexture: 0 // Índice de textura de techo
            };
        }
    }
    // Colocar al jugador en un espacio vacío inicial
    findStartPosition();
}

function findStartPosition() {
    for (let y = 1; y < mapHeight - 1; y++) {
        for (let x = 1; x < mapWidth - 1; x++) {
            if (!mapData[y][x].isWall) {
                camera.position.x = x * TILE_SIZE + TILE_SIZE / 2;
                camera.position.z = y * TILE_SIZE + TILE_SIZE / 2;
                camera.position.y = WALL_HEIGHT / 2; // Asegurar altura correcta
                console.log(`Posición inicial jugador: x=${x}, z=${y}`);
                return; // Salir en cuanto se encuentra un espacio
            }
        }
    }
    // Si no hay espacio (mapa solo paredes), colocar en el centro
    console.warn("No se encontró espacio vacío para el jugador, colocando en el centro.");
    camera.position.x = (mapWidth / 2) * TILE_SIZE;
    camera.position.z = (mapHeight / 2) * TILE_SIZE;
    camera.position.y = WALL_HEIGHT / 2;
}


function buildMapGeometry() {
    // Limpiar geometría anterior
    while (mapMeshesGroup.children.length > 0) {
        const mesh = mapMeshesGroup.children[0];
        mapMeshesGroup.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        // Importante: Desechar materiales si son únicos por mesh
         if (mesh.material) {
             if (Array.isArray(mesh.material)) {
                 mesh.material.forEach(material => {
                     if (material.map) material.map.dispose();
                     material.dispose();
                 });
             } else {
                  if (mesh.material.map) mesh.material.map.dispose();
                  mesh.material.dispose();
             }
         }
    }


    // Geometrías base (reutilizables)
    const wallGeometry = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
    const floorCeilingGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    floorCeilingGeometry.rotateX(-Math.PI / 2); // Rotar para que esté horizontal
    const ceilingGeometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    ceilingGeometry.rotateX(Math.PI / 2); // Rotar para el techo


    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const cell = mapData[y][x];
            const worldX = x * TILE_SIZE;
            const worldZ = y * TILE_SIZE;

            if (cell.isWall) {
                // --- Pared ---
                const wallTextureIndex = cell.wallTexture < wallTextures.length ? cell.wallTexture : 0;
                 if (!wallTextures[wallTextureIndex]) {
                     console.warn(`Textura de pared índice ${wallTextureIndex} no encontrada para celda (${x},${y}). Usando índice 0.`);
                     wallTextureIndex = 0; // Fallback a la primera textura
                 }

                if (wallTextures.length > 0 && wallTextures[wallTextureIndex]) {
                    // Crear un material específico para esta pared si las texturas pueden variar
                    const wallMaterial = new THREE.MeshStandardMaterial({
                        map: wallTextures[wallTextureIndex],
                        side: THREE.DoubleSide // Renderizar ambas caras (puede no ser necesario si el mapa siempre es cerrado)
                    });
                    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                    wallMesh.position.set(worldX + TILE_SIZE / 2, WALL_HEIGHT / 2, worldZ + TILE_SIZE / 2);
                    wallMesh.castShadow = true;
                    wallMesh.receiveShadow = true;
                    mapMeshesGroup.add(wallMesh);
                } else {
                    console.warn(`No hay texturas de pared válidas disponibles para la celda (${x},${y})`);
                    // Opcional: Crear una pared con color básico si no hay textura
                     const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
                     const wallMesh = new THREE.Mesh(wallGeometry, fallbackMaterial);
                     wallMesh.position.set(worldX + TILE_SIZE / 2, WALL_HEIGHT / 2, worldZ + TILE_SIZE / 2);
                     mapMeshesGroup.add(wallMesh);
                }

            } else {
                // --- Suelo ---
                let floorTextureIndex = cell.floorTexture < floorTextures.length ? cell.floorTexture : 0;
                 if (!floorTextures[floorTextureIndex]) {
                     console.warn(`Textura de suelo índice ${floorTextureIndex} no encontrada para celda (${x},${y}). Usando índice 0.`);
                     floorTextureIndex = 0; // Fallback
                 }

                 if (floorTextures.length > 0 && floorTextures[floorTextureIndex]) {
                     const floorMaterial = new THREE.MeshStandardMaterial({
                         map: floorTextures[floorTextureIndex],
                         side: THREE.DoubleSide
                     });
                     // Clonar la textura y aplicarla si necesitas repetición específica por tile
                     // floorMaterial.map = floorTextures[floorTextureIndex].clone();
                     // floorMaterial.map.needsUpdate = true; // Si clonas
                     // floorMaterial.map.repeat.set(1, 1); // Repetir 1 vez en el plano

                     const floorMesh = new THREE.Mesh(floorCeilingGeometry, floorMaterial);
                     floorMesh.position.set(worldX + TILE_SIZE / 2, 0, worldZ + TILE_SIZE / 2);
                     floorMesh.receiveShadow = true; // El suelo recibe sombras
                     mapMeshesGroup.add(floorMesh);
                 } else {
                      console.warn(`No hay texturas de suelo válidas disponibles para la celda (${x},${y})`);
                      // Fallback color
                      const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide });
                      const floorMesh = new THREE.Mesh(floorCeilingGeometry, fallbackMaterial);
                      floorMesh.position.set(worldX + TILE_SIZE / 2, 0, worldZ + TILE_SIZE / 2);
                      mapMeshesGroup.add(floorMesh);
                 }


                // --- Techo ---
                let ceilingTextureIndex = cell.ceilingTexture < ceilingTextures.length ? cell.ceilingTexture : 0;
                if (!ceilingTextures[ceilingTextureIndex]) {
                    console.warn(`Textura de techo índice ${ceilingTextureIndex} no encontrada para celda (${x},${y}). Usando índice 0.`);
                    ceilingTextureIndex = 0; // Fallback
                }

                if (ceilingTextures.length > 0 && ceilingTextures[ceilingTextureIndex]) {
                    const ceilingMaterial = new THREE.MeshStandardMaterial({
                        map: ceilingTextures[ceilingTextureIndex],
                        side: THREE.DoubleSide
                    });
                    // ceilingMaterial.map = ceilingTextures[ceilingTextureIndex].clone();
                    // ceilingMaterial.map.needsUpdate = true;
                    // ceilingMaterial.map.repeat.set(1, 1);

                    const ceilingMesh = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
                    ceilingMesh.position.set(worldX + TILE_SIZE / 2, WALL_HEIGHT, worldZ + TILE_SIZE / 2);
                    // ceilingMesh.receiveShadow = true; // Opcional si hay luces desde abajo
                    mapMeshesGroup.add(ceilingMesh);
                 } else {
                      console.warn(`No hay texturas de techo válidas disponibles para la celda (${x},${y})`);
                      // Fallback color
                      const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, side: THREE.DoubleSide });
                      const ceilingMesh = new THREE.Mesh(ceilingGeometry, fallbackMaterial);
                      ceilingMesh.position.set(worldX + TILE_SIZE / 2, WALL_HEIGHT, worldZ + TILE_SIZE / 2);
                      mapMeshesGroup.add(ceilingMesh);
                 }
            }
        }
    }
    scene.add(mapMeshesGroup); // Añadir el grupo completo a la escena
    console.log("Geometría del mapa reconstruida.");
}


// --- Controles de Movimiento y Cámara ---
function setupPointerLock() {
    const canvas = renderer.domElement;
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === canvas;
        if(isPointerLocked) {
            console.log("Pointer Locked");
            // Opcional: Ocultar cursor o mostrar retícula
        } else {
            console.log("Pointer Unlocked");
            // Mostrar cursor, detener movimiento si es necesario
            Object.keys(moveState).forEach(key => moveState[key] = 0); // Detener movimiento al salir
        }
    }, false);

    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
}

function onMouseMove(event) {
    if (!isPointerLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Rotación horizontal (Yaw) - alrededor del eje Y global
    camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), -movementX * lookSpeed);

    // Rotación vertical (Pitch) - alrededor del eje X local de la cámara
    // Limitamos el pitch para evitar que la cámara se invierta
    const currentPitch = camera.rotation.x;
    const deltaPitch = -movementY * lookSpeed;
    const maxPitch = Math.PI / 2 - 0.1; // Casi vertical hacia arriba
    const minPitch = -Math.PI / 2 + 0.1; // Casi vertical hacia abajo

    if (currentPitch + deltaPitch < maxPitch && currentPitch + deltaPitch > minPitch) {
        camera.rotateX(deltaPitch);
    }
}


function onKeyDown(event) {
    if (!isPointerLocked && !['INPUT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName)) { // Permitir escribir en inputs
         // Si no está bloqueado y no estamos en un input, bloquearlo al presionar WASD
         if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(event.key.toLowerCase())) {
              renderer.domElement.requestPointerLock();
         }
    }

    switch (event.key.toLowerCase()) {
        case 'w': case 'arrowup':    moveState.forward = 1; break;
        case 's': case 'arrowdown':  moveState.back = 1; break;
        case 'a': case 'arrowleft':  moveState.left = 1; break;
        case 'd': case 'arrowright': moveState.right = 1; break;
        // case 'r': moveState.up = 1; break;    // Subir (opcional)
        // case 'f': moveState.down = 1; break;  // Bajar (opcional)
    }
}

function onKeyUp(event) {
    switch (event.key.toLowerCase()) {
        case 'w': case 'arrowup':    moveState.forward = 0; break;
        case 's': case 'arrowdown':  moveState.back = 0; break;
        case 'a': case 'arrowleft':  moveState.left = 0; break;
        case 'd': case 'arrowright': moveState.right = 0; break;
        // case 'r': moveState.up = 0; break;
        // case 'f': moveState.down = 0; break;
    }
}

function updateMovement(delta) {
    if (!isPointerLocked && (moveState.forward || moveState.back || moveState.left || moveState.right)) {
        // Si se desbloqueó mientras se movía, detener
         Object.keys(moveState).forEach(key => moveState[key] = 0);
         return;
    }
     if (!isPointerLocked) return; // No mover si no está bloqueado


    const moveDistance = moveSpeed * delta;
    const velocity = new THREE.Vector3();

    // Obtener la dirección de la cámara en el plano XZ
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; // Ignorar componente Y para movimiento horizontal
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(camera.up, forward).normalize(); // Vector derecho perpendicular

    if (moveState.forward) velocity.add(forward);
    if (moveState.back) velocity.sub(forward);
    if (moveState.left) velocity.sub(right); // Moverse hacia la izquierda relativa
    if (moveState.right) velocity.add(right); // Moverse hacia la derecha relativa

    // Movimiento vertical (opcional)
    // if (moveState.up) camera.position.y += moveDistance;
    // if (moveState.down) camera.position.y -= moveDistance;

    velocity.normalize().multiplyScalar(moveDistance);

    // --- Colisión Simple ---
    const currentPos = camera.position.clone();
    const targetPos = currentPos.clone().add(velocity);

    const targetGridX = Math.floor(targetPos.x / TILE_SIZE);
    const targetGridZ = Math.floor(targetPos.z / TILE_SIZE); // Usar Z para el eje Y del mapa

    const currentGridX = Math.floor(currentPos.x / TILE_SIZE);
    const currentGridZ = Math.floor(currentPos.z / TILE_SIZE);

    // Comprobar colisión en el eje X
    const targetPosX = currentPos.clone().add(new THREE.Vector3(velocity.x, 0, 0));
    const targetGridX_X = Math.floor(targetPosX.x / TILE_SIZE);
    if (isWallAt(targetGridX_X, currentGridZ)) {
        velocity.x = 0; // Detener movimiento X si choca
    }

    // Comprobar colisión en el eje Z
    const targetPosZ = currentPos.clone().add(new THREE.Vector3(0, 0, velocity.z));
    const targetGridZ_Z = Math.floor(targetPosZ.z / TILE_SIZE);
     if (isWallAt(currentGridX, targetGridZ_Z)) {
        velocity.z = 0; // Detener movimiento Z si choca
    }

    // Comprobar colisiones diagonales sutiles (esquinas) - Simplificado
    // Una mejor colisión consideraría el radio del jugador
    if (isWallAt(targetGridX_X, targetGridZ_Z) && isWallAt(currentGridX, targetGridZ_Z) && isWallAt(targetGridX_X, currentGridZ)) {
         // Si el destino diagonal es pared Y las paredes adyacentes también lo son, detener ambos
         // Esto ayuda a evitar quedarse atascado en esquinas internas
         velocity.x = 0;
         velocity.z = 0;
    }


    camera.position.add(velocity);

    // Mantener al jugador dentro de los límites (opcional, las paredes deberían bastar)
    // camera.position.x = Math.max(TILE_SIZE / 2, Math.min(mapWidth * TILE_SIZE - TILE_SIZE / 2, camera.position.x));
    // camera.position.z = Math.max(TILE_SIZE / 2, Math.min(mapHeight * TILE_SIZE - TILE_SIZE / 2, camera.position.z));

     // Forzar altura constante (si no hay movimiento arriba/abajo)
     camera.position.y = WALL_HEIGHT / 2;
}

function isWallAt(gridX, gridZ) {
    if (gridX < 0 || gridX >= mapWidth || gridZ < 0 || gridZ >= mapHeight) {
        return true; // Considerar fuera de límites como pared
    }
    return mapData[gridZ] && mapData[gridZ][gridX] && mapData[gridZ][gridX].isWall;
}


// --- Lógica del Editor ---
function setupEditor() {
    const mapEditorGrid = document.getElementById('mapEditorGrid');
    const mapSizeXInput = document.getElementById('mapSizeX');
    const mapSizeYInput = document.getElementById('mapSizeY');
    const btnNewMap = document.getElementById('btnNewMap');
    const currentToolDisplay = document.getElementById('currentTool');

    // Botones de herramientas
    document.getElementById('toolWall').addEventListener('click', () => {
        currentTool = 'wall';
        currentToolDisplay.textContent = 'Colocar Pared';
    });
    document.getElementById('toolFloor').addEventListener('click', () => {
        currentTool = 'floor';
        currentToolDisplay.textContent = 'Suelo/Techo';
    });

    // Botón Nuevo Mapa
    btnNewMap.addEventListener('click', () => {
        const newWidth = parseInt(mapSizeXInput.value, 10);
        const newHeight = parseInt(mapSizeYInput.value, 10);
        if (newWidth >= 3 && newHeight >= 3) {
            createMapData(newWidth, newHeight);
            buildMapGeometry();
            drawEditorGrid(); // Redibujar la rejilla 2D
            updateTexturePalettes(); // Asegurar paletas actualizadas
        } else {
            alert("El tamaño del mapa debe ser al menos 3x3.");
        }
    });

     // Añadir Texturas
     setupTextureAdding('Wall', wallTextureUrls, wallTextures, updateTexturePalettes);
     setupTextureAdding('Floor', floorTextureUrls, floorTextures, updateTexturePalettes);
     setupTextureAdding('Ceiling', ceilingTextureUrls, ceilingTextures, updateTexturePalettes);

    drawEditorGrid();
    updateTexturePalettes();
    updateSelectedTextureDisplays();
}

function setupTextureAdding(type, urlsArray, texturesArray, updateCallback) {
     const input = document.getElementById(`new${type}TextureUrl`);
     const button = document.getElementById(`btnAdd${type}Texture`);

     button.addEventListener('click', async () => {
         const url = input.value.trim();
         if (url && !urlsArray.includes(url)) {
             try {
                 const newTexture = await loadTexture(url);
                 urlsArray.push(url);
                 texturesArray.push(newTexture);
                 input.value = ''; // Limpiar input
                 updateCallback(); // Actualizar la UI de la paleta
                 console.log(`Textura de ${type} añadida: ${url}`);
             } catch (error) {
                 alert(`Error al cargar la textura de ${type}: ${error}`);
             }
         } else if (urlsArray.includes(url)) {
              alert(`La textura ${url} ya existe.`);
         } else {
              alert(`Introduce una URL o ruta válida para la textura de ${type}.`);
         }
     });
 }

function drawEditorGrid() {
    const mapEditorGrid = document.getElementById('mapEditorGrid');
    mapEditorGrid.innerHTML = ''; // Limpiar rejilla anterior

    // Actualizar variables CSS para el tamaño de la rejilla
    mapEditorGrid.style.setProperty('--map-cols', mapWidth);
    mapEditorGrid.style.setProperty('--map-rows', mapHeight);

    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.dataset.x = x; // Guardar coordenadas en el elemento
            cell.dataset.y = y;

            updateCellVisual(cell, mapData[y][x]); // Aplicar estilo inicial

            cell.addEventListener('click', handleGridClick);
            mapEditorGrid.appendChild(cell);
        }
    }
}

function handleGridClick(event) {
    const cellElement = event.target;
    const x = parseInt(cellElement.dataset.x, 10);
    const y = parseInt(cellElement.dataset.y, 10);

    if (isNaN(x) || isNaN(y)) return; // Salir si no se pudo obtener coords

    const cellData = mapData[y][x];

    if (currentTool === 'wall') {
        cellData.isWall = !cellData.isWall; // Alternar pared/suelo
        if (cellData.isWall) {
             // Al poner pared, asignar textura seleccionada
             cellData.wallTexture = selectedWallTextureIndex;
        } else {
             // Al quitar pared, asignar texturas de suelo/techo seleccionadas
             cellData.floorTexture = selectedFloorTextureIndex;
             cellData.ceilingTexture = selectedCeilingTextureIndex;
        }

    } else if (currentTool === 'floor') {
        if (!cellData.isWall) { // Solo se aplica a celdas de suelo/techo
            cellData.floorTexture = selectedFloorTextureIndex;
            cellData.ceilingTexture = selectedCeilingTextureIndex;
        } else {
             // Opcional: Permitir cambiar textura de pared con esta herramienta?
             cellData.wallTexture = selectedWallTextureIndex;
        }
    }

    updateCellVisual(cellElement, cellData); // Actualizar visualización 2D
    buildMapGeometry(); // Reconstruir la geometría 3D
}

function updateCellVisual(cellElement, cellData) {
     // Actualiza la clase y el contenido de texto de la celda 2D
     if (cellData.isWall) {
         cellElement.classList.add('wall');
         cellElement.textContent = `W${cellData.wallTexture}`; // Muestra W y índice textura pared
         cellElement.style.backgroundImage = ''; // Limpiar imagen de fondo
     } else {
         cellElement.classList.remove('wall');
          // Mostrar índices de suelo/techo
         cellElement.textContent = `F${cellData.floorTexture} C${cellData.ceilingTexture}`;

         // Opcional: Mostrar miniatura de textura de suelo en la celda 2D
         const floorTexUrl = floorTextureUrls[cellData.floorTexture];
          if (floorTexUrl && floorTextures[cellData.floorTexture]) { // Asegurarse que la textura está cargada
              cellElement.style.backgroundImage = `url('${floorTexUrl}')`;
              cellElement.style.backgroundSize = 'cover';
          } else {
              cellElement.style.backgroundImage = '';
          }
     }
 }

 function updateTexturePalettes() {
    updatePalette('Wall', wallTextureUrls, selectedWallTextureIndex, (index) => {
        selectedWallTextureIndex = index;
        updateSelectedTextureDisplays();
    });
    updatePalette('Floor', floorTextureUrls, selectedFloorTextureIndex, (index) => {
        selectedFloorTextureIndex = index;
        updateSelectedTextureDisplays();
    });
    updatePalette('Ceiling', ceilingTextureUrls, selectedCeilingTextureIndex, (index) => {
        selectedCeilingTextureIndex = index;
        updateSelectedTextureDisplays();
    });
}


function updatePalette(type, urlsArray, selectedIndex, selectCallback) {
    const paletteDiv = document.getElementById(`${type.toLowerCase()}TexturePalette`);
    paletteDiv.innerHTML = ''; // Limpiar paleta

    urlsArray.forEach((url, index) => {
        const img = document.createElement('img');
        img.src = url;
        img.alt = `${type} Texture ${index}`;
        img.title = `${url} (Index: ${index})`; // Tooltip
        img.dataset.index = index;
        if (index === selectedIndex) {
            img.classList.add('selected');
        }

        // Manejar error de carga de imagen en la paleta
        img.onerror = function() {
             img.src = 'textures/placeholder.png'; // Usar placeholder si falla
             img.alt = `Error loading ${url}`;
             img.title = `Error loading ${url} (Index: ${index})`;
        };


        img.addEventListener('click', () => {
            selectCallback(index);
            // Actualizar visualmente la selección en la paleta
            const siblings = paletteDiv.querySelectorAll('img');
            siblings.forEach(sibling => sibling.classList.remove('selected'));
            img.classList.add('selected');
        });
        paletteDiv.appendChild(img);
    });
}


function updateSelectedTextureDisplays() {
    document.getElementById('selectedWallTextureDisplay').textContent = `Actual: ${selectedWallTextureIndex}`;
    document.getElementById('selectedFloorTextureDisplay').textContent = `Actual: ${selectedFloorTextureIndex}`;
    document.getElementById('selectedCeilingTextureDisplay').textContent = `Actual: ${selectedCeilingTextureIndex}`;
}


// --- Bucle de Animación y Renderizado ---
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta(); // Tiempo desde el último frame

    updateMovement(delta); // Actualizar posición del jugador/cámara

    renderer.render(scene, camera);
}

// --- Gestión de Ventana ---
function onWindowResize() {
    const newWidth = window.innerWidth - document.getElementById('editorControls').offsetWidth;
    const newHeight = window.innerHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
}

// --- Iniciar Todo ---
init();