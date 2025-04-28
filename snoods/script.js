const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// --- Botones Móviles --- (Obtener referencias)
const mobileControlsDiv = document.getElementById('mobile-controls');
const aimLeftBtn = document.getElementById('aimLeftBtn');
const aimRightBtn = document.getElementById('aimRightBtn');
const shootBtn = document.getElementById('shootBtn');


// --- Configuración del Juego ---
const BUBBLE_RADIUS = 20;
const BUBBLE_DIAMETER = BUBBLE_RADIUS * 2;
const ROWS = 12;
const COLS = 15;
const COLORS = ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#F1C40F', '#8E44AD'];
const BUBBLE_SPEED = 15;
const INITIAL_BUBBLE_ROWS = 5;
const AIM_STEP = 0.05; // Cuánto cambia el ángulo por paso (teclado/botón)
const AIM_LIMIT_ANGLE_MIN = -Math.PI + 0.1; // Ángulo mínimo (casi izquierda horizontal)
const AIM_LIMIT_ANGLE_MAX = -0.1; // Ángulo máximo (casi derecha horizontal)


let grid = [];
let projectile = null;
let nextProjectile = null;
let aimAngle = -Math.PI / 2; // Ángulo inicial (hacia arriba)
let isShooting = false;
let score = 0;
let gameOver = false;

// --- Variables para Control Continuo (Teclado/Botones) ---
let aimingLeft = false;
let aimingRight = false;
let aimIntervalLeft = null;
let aimIntervalRight = null;
const AIM_INTERVAL_MS = 30; // Milisegundos para el intervalo de apuntado


// --- Funciones Auxiliares ---

function getRandomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function gridToCanvas(row, col) {
    const xOffset = (row % 2 === 0) ? 0 : BUBBLE_RADIUS;
    const x = col * BUBBLE_DIAMETER + BUBBLE_RADIUS + xOffset;
    const y = row * (BUBBLE_DIAMETER - 5) + BUBBLE_RADIUS;
    return { x, y };
}

function canvasToNearestGrid(x, y) {
    let estimatedRow = Math.round((y - BUBBLE_RADIUS) / (BUBBLE_DIAMETER - 5));
    const xOffset = (estimatedRow % 2 === 0) ? 0 : BUBBLE_RADIUS;
    let estimatedCol = Math.round((x - BUBBLE_RADIUS - xOffset) / BUBBLE_DIAMETER);
    estimatedRow = Math.max(0, Math.min(ROWS - 1, estimatedRow));
    estimatedCol = Math.max(0, Math.min(COLS - 1, estimatedCol));
    return { row: estimatedRow, col: estimatedCol };
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// --- Inicialización ---

function initGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < COLS; c++) {
            if (r < INITIAL_BUBBLE_ROWS) {
                const isOffsetRow = r % 2 !== 0;
                if (!isOffsetRow || c < COLS -1) {
                   grid[r][c] = { color: getRandomColor(), row: r, col: c };
                } else {
                   grid[r][c] = null;
                }
            } else {
                grid[r][c] = null;
            }
        }
    }
     // Asegurarse de que haya colores disponibles para el primer proyectil
     ensureValidColorsExist();
}

function createProjectile() {
    isShooting = false;
    aimingLeft = false; // Resetear estados de apuntado
    aimingRight = false;
    stopAiming(); // Detener cualquier intervalo de apuntado

    // Asegurarse de que el nuevo proyectil tenga un color que exista en el tablero
    let availableColors = getAvailableColors();
    if (availableColors.length === 0) {
         console.warn("No quedan colores disponibles en el tablero, usando uno aleatorio.");
         // Podrías terminar el juego aquí o añadir una lógica para manejar esta situación
         availableColors = COLORS; // Fallback a todos los colores
         if (availableColors.length === 0) { // Si COLORS está vacío por alguna razón
            console.error("No hay colores definidos!");
            gameOver = true; // No se puede continuar
            return;
         }
    }
    const randomAvailableColor = availableColors[Math.floor(Math.random() * availableColors.length)];


    projectile = {
        x: canvas.width / 2,
        y: canvas.height - BUBBLE_RADIUS - 10,
        dx: 0,
        dy: 0,
        color: randomAvailableColor, // Usar color disponible
        radius: BUBBLE_RADIUS,
        isMoving: false
    };
}
// Función para obtener los colores actualmente en el grid
function getAvailableColors() {
    const colorsInGrid = new Set();
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c]) {
                colorsInGrid.add(grid[r][c].color);
            }
        }
    }
    return Array.from(colorsInGrid);
}
// Asegurarse de que hay burbujas de los colores base al inicio
function ensureValidColorsExist() {
    const currentColors = getAvailableColors();
    if (currentColors.length < 2 && INITIAL_BUBBLE_ROWS > 0) { // Si hay muy pocos colores (o 0)
        console.warn("Pocos tipos de colores al inicio, rellenando...");
        // Intentar añadir algunos colores base si faltan
        for(let r=0; r < Math.min(INITIAL_BUBBLE_ROWS, 2); r++) { // Mirar las primeras filas
            for(let c=0; c<COLS; c+=3) { // Poner algunos colores base
                if(grid[r][c] === null) {
                     grid[r][c] = { color: COLORS[c % COLORS.length], row: r, col: c };
                }
            }
        }
    }
}


// --- Dibujo (sin cambios mayormente) ---

function drawBubble(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.closePath();
}

function drawGrid() { /* ... (sin cambios) ... */
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c]) {
                const pos = gridToCanvas(r, c);
                drawBubble(pos.x, pos.y, BUBBLE_RADIUS, grid[r][c].color);
            }
        }
    }
}

function drawProjectile() { /* ... (sin cambios) ... */
    if (projectile) {
        drawBubble(projectile.x, projectile.y, projectile.radius, projectile.color);
    }
}

function drawAimLine() {
    // No dibujar si se está disparando o si no hay proyectil
    if (isShooting || !projectile) return;

    const startX = projectile.x; // Usar la posición actual del proyectil como inicio
    const startY = projectile.y;
    const length = 100;

    const endX = startX + length * Math.cos(aimAngle);
    const endY = startY + length * Math.sin(aimAngle);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
}

function drawLauncherBase() { /* ... (sin cambios) ... */
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height - 10, BUBBLE_RADIUS + 5, 0, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();
    ctx.closePath();
}

function drawGameOver() { /* ... (sin cambios) ... */
     ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
     ctx.fillRect(0, 0, canvas.width, canvas.height);
     ctx.font = '48px Arial';
     ctx.fillStyle = 'red';
     ctx.textAlign = 'center';
     ctx.fillText('¡GAME OVER!', canvas.width / 2, canvas.height / 2);
     ctx.font = '24px Arial';
     ctx.fillStyle = 'white';
     ctx.fillText('Toca / Haz clic para reiniciar', canvas.width / 2, canvas.height / 2 + 40); // Mensaje adaptado
}

// --- Lógica del Juego ---

function updateProjectile() { /* ... (sin cambios en la lógica interna) ... */
    if (!projectile || !projectile.isMoving) return;

    projectile.x += projectile.dx;
    projectile.y += projectile.dy;

    // Colisión con paredes laterales
    if (projectile.x - projectile.radius < 0 || projectile.x + projectile.radius > canvas.width) {
        projectile.dx *= -1;
        projectile.x = Math.max(projectile.radius, Math.min(canvas.width - projectile.radius, projectile.x));
    }

    // Colisión con el techo
    if (projectile.y - projectile.radius <= 0) {
        projectile.y = projectile.radius;
        snapProjectile();
        return;
    }

    // Colisión con otras burbujas
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c]) {
                const bubblePos = gridToCanvas(r, c);
                const dist = distance(projectile.x, projectile.y, bubblePos.x, bubblePos.y);
                if (dist < BUBBLE_DIAMETER - 5) {
                    snapProjectile();
                    return;
                }
            }
        }
    }
     // Verificar si alguna burbuja llega al fondo (Game Over)
     // Esta comprobación se movió a snapProjectile y checkGameOverCondition
}

function snapProjectile() { /* ... (sin cambios en la lógica interna, excepto llamada a checkGameOver) ... */
    if (!projectile) return; // Añadir guarda por si acaso

    projectile.isMoving = false;
    projectile.dx = 0;
    projectile.dy = 0;

    let closestDist = Infinity;
    let targetCell = null;
    const impactY = projectile.y;
    let estimatedRow = Math.round((impactY - BUBBLE_RADIUS) / (BUBBLE_DIAMETER - 5));
    estimatedRow = Math.max(0, Math.min(ROWS - 1, estimatedRow));

    for (let rOffset = -1; rOffset <= 1; rOffset++) {
        const checkRow = estimatedRow + rOffset;
        if (checkRow < 0 || checkRow >= ROWS) continue;
        for(let c = 0; c < COLS; c++){
            if (!grid[checkRow][c]) {
                const cellPos = gridToCanvas(checkRow, c);
                const dy = Math.abs(cellPos.y - projectile.y);
                if (dy > BUBBLE_DIAMETER * 1.5) continue;
                const dist = distance(projectile.x, projectile.y, cellPos.x, cellPos.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    targetCell = { row: checkRow, col: c };
                }
            }
        }
    }

    if (!targetCell) {
        console.warn("No se encontró celda objetivo, usando estimación.");
        targetCell = canvasToNearestGrid(projectile.x, projectile.y);
    }

    // Asegurarse de que targetCell sea válido antes de acceder a row/col
    if (!targetCell) {
         console.error("Fallo crítico al encontrar celda destino.");
         // ¿Quizás forzar la colocación en la fila más baja posible?
         // O simplemente crear el siguiente proyectil y esperar lo mejor
         createProjectile();
         return;
    }


    targetCell.row = Math.max(0, Math.min(ROWS - 1, targetCell.row));
    targetCell.col = Math.max(0, Math.min(COLS - 1, targetCell.col));

    // Colocar solo si la celda está vacía
    if (grid[targetCell.row] && grid[targetCell.row][targetCell.col] === null) {
        grid[targetCell.row][targetCell.col] = {
            color: projectile.color,
            row: targetCell.row,
            col: targetCell.col
        };

        const matchedBubbles = findMatches(targetCell.row, targetCell.col);
        let bubblesClearedCount = 0;

        if (matchedBubbles.length >= 3) {
            removeBubbles(matchedBubbles);
            bubblesClearedCount += matchedBubbles.length;

            const floatingBubbles = findFloatingBubbles();
            if (floatingBubbles.length > 0) {
                 removeBubbles(floatingBubbles);
                 bubblesClearedCount += floatingBubbles.length;
            }
            updateScore(bubblesClearedCount);
        }
         // Verificar Game Over *después* de colocar y limpiar
        checkGameOverCondition();
        if (!gameOver) {
             createProjectile(); // Crear el siguiente solo si no es game over
        }


    } else {
        console.warn("Celda destino ocupada o inválida, intentando de nuevo:", targetCell);
        // Podría intentar buscar un vecino vacío cercano aquí como fallback
        // Por ahora, simplemente no la colocamos y creamos una nueva para evitar errores.
         checkGameOverCondition(); // Aun así, verificar si el fallo lleva a game over
         if (!gameOver) {
             createProjectile();
         }
    }


}

function findMatches(startRow, startCol) { /* ... (sin cambios) ... */
    const startBubble = grid[startRow]?.[startCol]; // Safe navigation
    if (!startBubble) return [];

    const colorToMatch = startBubble.color;
    const matches = [];
    const queue = [{ r: startRow, c: startCol }];
    const visited = new Set([`${startRow},${startCol}`]); // Initialize with start

    while (queue.length > 0) {
        const current = queue.shift();
        // Check if bubble still exists (it might have been removed in a previous step if visited path crossed)
        const bubble = grid[current.r]?.[current.c];

        // Add to matches ONLY if it exists and matches color
        if (bubble && bubble.color === colorToMatch) {
             // Check if already added to matches (though visited set should prevent this)
             if (!matches.some(m => m.row === current.r && m.col === current.c)) {
                 matches.push(bubble);
             }

            const neighbors = getNeighbors(current.r, current.c);
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.r},${neighbor.c}`;
                 const neighborBubble = grid[neighbor.r]?.[neighbor.c]; // Check neighbor exists

                if (neighborBubble && // Neighbor exists in grid
                     neighborBubble.color === colorToMatch && // Neighbor has the same color
                    !visited.has(neighborKey)) // Neighbor hasn't been visited
                {
                    visited.add(neighborKey);
                    queue.push(neighbor);
                }
            }
        }
    }
    return matches;
}

function getNeighbors(r, c) { /* ... (sin cambios) ... */
    const neighbors = [];
    const isOffsetRow = r % 2 !== 0;
    const neighborPatterns = [
        { dr: -1, dc: isOffsetRow ? 0 : -1 }, { dr: -1, dc: isOffsetRow ? 1 : 0 },
        { dr: 0, dc: -1 }, { dr: 0, dc: 1 },
        { dr: 1, dc: isOffsetRow ? 0 : -1 }, { dr: 1, dc: isOffsetRow ? 1 : 0 }
    ];
    for (const pattern of neighborPatterns) {
        const nr = r + pattern.dr;
        const nc = c + pattern.dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            neighbors.push({ r: nr, c: nc });
        }
    }
    return neighbors;
}

function removeBubbles(bubblesToRemove) { /* ... (sin cambios) ... */
    bubblesToRemove.forEach(bubble => {
        if (grid[bubble.row] && grid[bubble.row][bubble.col]) {
             grid[bubble.row][bubble.col] = null;
        }
    });
}

function findFloatingBubbles() { /* ... (sin cambios) ... */
    const supported = new Set();
    const queue = [];
    for (let c = 0; c < COLS; c++) {
        if (grid[0][c]) {
            const key = `0,${c}`;
            if (!supported.has(key)) {
                 queue.push({ r: 0, c: c });
                 supported.add(key);
            }
        }
    }
    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = getNeighbors(current.r, current.c);
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.r},${neighbor.c}`;
            if (grid[neighbor.r][neighbor.c] && !supported.has(neighborKey)) {
                supported.add(neighborKey);
                queue.push(neighbor);
            }
        }
    }
    const floating = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c]) {
                const key = `${r},${c}`;
                if (!supported.has(key)) {
                    floating.push(grid[r][c]);
                }
            }
        }
    }
    return floating;
}


function updateScore(bubblesCleared) { /* ... (sin cambios) ... */
     score += bubblesCleared * 10;
     scoreElement.textContent = score;
}

function checkGameOverCondition() {
     // Comprobar si alguna burbuja en las filas inferiores está "visualmente" abajo
    for (let c = 0; c < COLS; c++) {
        // Revisar las últimas filas de la cuadrícula lógica
         for (let r = ROWS - 1; r >= ROWS - 2 && r >=0 ; r--) { // Revisar las últimas 2 filas lógicas
            if (grid[r][c]) {
                 const pos = gridToCanvas(r, c);
                 // Si el borde inferior de la burbuja supera la línea de fondo (con un margen)
                 if (pos.y + BUBBLE_RADIUS > canvas.height - BUBBLE_DIAMETER / 2) { // Ajustar margen si es necesario
                    gameOver = true;
                    console.log("Game Over - Bubble reached bottom at", r, c);
                    return; // Salir tan pronto como se detecte Game Over
                 }
            }
         }
    }
}


function resetGame() { /* ... (sin cambios) ... */
     console.log("Resetting game...");
     score = 0;
     scoreElement.textContent = score;
     gameOver = false;
     isShooting = false; // Asegurarse de resetear esto
     stopAiming(); // Detener intervalos
     initGrid();
     createProjectile();
     gameLoop(); // Reiniciar el bucle
}

// --- Funciones de Control ---

// Función centralizada para cambiar el ángulo
function changeAim(delta) {
    if (isShooting || gameOver) return;
    aimAngle += delta;
    // Aplicar límites al ángulo
    aimAngle = Math.max(AIM_LIMIT_ANGLE_MIN, Math.min(AIM_LIMIT_ANGLE_MAX, aimAngle));
}

// Función centralizada para disparar
function shootProjectile() {
    if (!isShooting && !gameOver && projectile) {
        isShooting = true;
        stopAiming(); // Detener el apuntado si se estaba haciendo con botones/teclas
        projectile.isMoving = true;
        projectile.dx = Math.cos(aimAngle) * BUBBLE_SPEED;
        projectile.dy = Math.sin(aimAngle) * BUBBLE_SPEED;
        // console.log(`Shooting at angle: ${aimAngle.toFixed(2)} rad`);
    }
}

// Iniciar apuntado continuo (para botones/teclas mantenidas)
function startAimingLeft() {
    if (aimingLeft || isShooting || gameOver) return;
    aimingLeft = true;
    clearInterval(aimIntervalLeft); // Limpiar intervalo anterior si existe
    aimIntervalLeft = setInterval(() => changeAim(-AIM_STEP), AIM_INTERVAL_MS);
}
function startAimingRight() {
    if (aimingRight || isShooting || gameOver) return;
    aimingRight = true;
    clearInterval(aimIntervalRight);
    aimIntervalRight = setInterval(() => changeAim(AIM_STEP), AIM_INTERVAL_MS);
}

// Detener apuntado continuo
function stopAimingLeft() {
    aimingLeft = false;
    clearInterval(aimIntervalLeft);
    aimIntervalLeft = null;
}
function stopAimingRight() {
    aimingRight = false;
    clearInterval(aimIntervalRight);
    aimIntervalRight = null;
}
function stopAiming() { // Detener ambos
    stopAimingLeft();
    stopAimingRight();
}


// --- Bucle Principal del Juego ---

function gameLoop() {
    if (gameOver) {
        drawGameOver();
        // Detener cualquier intervalo de apuntado si el juego termina mientras se apunta
        stopAiming();
        return; // Detener el bucle si es game over
    }

    // 1. Limpiar Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Actualizar Estado
    updateProjectile();

    // 3. Dibujar Elementos
    drawGrid();
    drawLauncherBase();
    drawProjectile();
    drawAimLine();

    // 4. Solicitar siguiente frame
    requestAnimationFrame(gameLoop);
}

// --- Manejo de Eventos ---

// -- Ratón --
canvas.addEventListener('mousemove', (event) => {
    if (isShooting || gameOver) return;

    const rect = canvas.getBoundingClientRect();
    // Ajustar por el escalado si el canvas tiene tamaño CSS diferente al width/height
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;


    // Usar la posición del proyectil como origen para el ángulo
    const launcherX = projectile ? projectile.x : canvas.width / 2;
    const launcherY = projectile ? projectile.y : canvas.height - BUBBLE_RADIUS - 10;

    let angle = Math.atan2(mouseY - launcherY, mouseX - launcherX);

    // Aplicar límites
    angle = Math.max(AIM_LIMIT_ANGLE_MIN, Math.min(AIM_LIMIT_ANGLE_MAX, angle));
    aimAngle = angle; // Actualizar directamente
});

// -- Clic / Toque en Canvas (Disparar / Reiniciar) --
canvas.addEventListener('click', handleClickOrTap);
// canvas.addEventListener('touchstart', handleClickOrTap); // Opcional: Usar touchstart para respuesta más rápida en móvil

function handleClickOrTap(event) {
     event.preventDefault(); // Prevenir comportamiento por defecto (scroll, zoom, doble toque)
     if (gameOver) {
          resetGame();
          return;
     }
      // Disparar solo si no se hizo clic sobre los botones móviles (si están visibles)
     if (mobileControlsDiv.style.display !== 'flex' || !mobileControlsDiv.contains(event.target)) {
         shootProjectile();
     }
}


// -- Teclado --
document.addEventListener('keydown', (event) => {
    if (gameOver) return; // No hacer nada si es game over

    switch (event.key) {
        case 'ArrowLeft':
            event.preventDefault(); // Evitar scroll horizontal
            // Iniciar movimiento continuo si no está ya iniciado
             if (!aimingLeft) {
                  // Cambiar una vez inmediatamente para respuesta rápida
                  changeAim(-AIM_STEP);
                  // Iniciar intervalo para mantener pulsado (opcional, o solo cambio por pulsación)
                  // startAimingLeft(); // Descomentar si quieres movimiento continuo al mantener
             }
            break;
        case 'ArrowRight':
             event.preventDefault();
             if (!aimingRight) {
                  changeAim(AIM_STEP);
                  // startAimingRight(); // Descomentar para movimiento continuo
             }
            break;
        case ' ': // Espacio
        case 'ArrowUp': // Flecha arriba
            event.preventDefault(); // Evitar scroll vertical / comportamiento de espacio
            shootProjectile();
            break;
    }
});

// Opcional: detener movimiento continuo con teclado al soltar tecla
/* document.addEventListener('keyup', (event) => {
    if (gameOver) return;
    switch (event.key) {
        case 'ArrowLeft':
            stopAimingLeft();
            break;
        case 'ArrowRight':
            stopAimingRight();
            break;
    }
}); */
// Nota: Sin el keyup, cada pulsación de flecha moverá el ángulo un paso.
// Si descomentas el startAiming y el keyup, tendrás movimiento continuo al mantener pulsado. Elige el comportamiento que prefieras.


// -- Botones Táctiles --
// Usar 'touchstart' para respuesta más rápida y 'touchend'/'touchcancel' para detener
aimLeftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startAimingLeft(); });
aimLeftBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopAimingLeft(); });
aimLeftBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); stopAimingLeft(); }); // Si el toque se interrumpe
// También detener si el dedo se desliza fuera del botón mientras presiona
aimLeftBtn.addEventListener('mouseleave', stopAimingLeft);


aimRightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startAimingRight(); });
aimRightBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopAimingRight(); });
aimRightBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); stopAimingRight(); });
aimRightBtn.addEventListener('mouseleave', stopAimingRight);

shootBtn.addEventListener('touchstart', (e) => {
     e.preventDefault();
     // Añadir un pequeño feedback visual si se desea
     shootBtn.style.backgroundColor = '#ccc';
     shootProjectile();
});
// Resetear el feedback visual al soltar
shootBtn.addEventListener('touchend', (e) => {e.preventDefault(); shootBtn.style.backgroundColor = '#eee'; });
shootBtn.addEventListener('touchcancel', (e) => {e.preventDefault(); shootBtn.style.backgroundColor = '#eee'; });
shootBtn.addEventListener('mouseleave', () => { shootBtn.style.backgroundColor = '#eee'; });


// --- Iniciar el Juego ---
initGrid();
createProjectile();
gameLoop();