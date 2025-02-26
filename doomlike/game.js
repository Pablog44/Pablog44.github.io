/***** game.js *****/

// ─── CONFIGURACIÓN DEL CANVAS Y VARIABLES GLOBALES ───
const canvas = document.getElementById('gameCanvas');
const availableHeight = window.innerHeight * 0.85;
const canvasSize = Math.min(window.innerWidth, availableHeight);
canvas.width = canvasSize;
canvas.height = canvasSize;
const ctx = canvas.getContext('2d');
const screenWidth = canvas.width;
const screenHeight = canvas.height;

const gameOveSound = new Audio('gameOve.mp3');
gameOveSound.volume = 0.3;

// Variable para evitar múltiples activaciones del reinicio por gamepad
let restartTriggered = false;

// VARIABLES GLOBALES DEL JUEGO
let playerLife = 100;            // Vida del jugador
let enemyBullets = [];           // Proyectiles de los enemigos
const enemyBulletSpeed = 0.3;    // Velocidad de los proyectiles enemigos
const enemyShootCooldown = 3000; // Tiempo (ms) entre disparos de cada enemigo

// Constantes para evitar aglomeraciones y mantener margen de seguridad
const enemySpeed = 0.02;
const minWallDist = 0.3;   // Distancia mínima que debe mantener el enemigo con la pared
const minEnemyDist = 0.5;  // Distancia mínima entre enemigos

// ─── FUNCIONES DE AYUDA ───
function loadTexture(src) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  return img;
}

// Función para determinar si el jugador es visible desde un enemigo (sin paredes en medio)
function isPlayerVisible(enemy) {
  const dx = posX - enemy.x;
  const dy = posY - enemy.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance / 0.1);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const checkX = enemy.x + dx * t;
    const checkY = enemy.y + dy * t;
    if (window.map[Math.floor(checkY)] && window.map[Math.floor(checkY)][Math.floor(checkX)] > 0) {
      return false;
    }
  }
  return true;
}

// ─── CARGA DE TEXTURAS ───
// Cambia las rutas de las texturas según corresponda
const wallTexture    = loadTexture('wall.png');  
const floorTexture   = loadTexture('floor.png');
const ceilingTexture = loadTexture('ceiling.png');
const weaponTexture  = loadTexture('weapon.png');
const enemyTexture   = loadTexture('enemy.png');

let floorData = null, ceilingData = null;
let texturesLoaded = 0;
function onTextureLoaded() {
  texturesLoaded++;
  if (texturesLoaded === 5) {
    // Extraer píxeles de piso
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = floorTexture.width;
    floorCanvas.height = floorTexture.height;
    const floorCtx = floorCanvas.getContext('2d');
    floorCtx.drawImage(floorTexture, 0, 0);
    floorData = floorCtx.getImageData(0, 0, floorTexture.width, floorTexture.height).data;

    // Extraer píxeles de techo
    const ceilingCanvas = document.createElement('canvas');
    ceilingCanvas.width = ceilingTexture.width;
    ceilingCanvas.height = ceilingTexture.height;
    const ceilingCtx = ceilingCanvas.getContext('2d');
    ceilingCtx.drawImage(ceilingTexture, 0, 0);
    ceilingData = ceilingCtx.getImageData(0, 0, ceilingTexture.width, ceilingTexture.height).data;

    // Inicializa el primer mapa y arranca el bucle (window.initMap viene de maps.js)
    window.initMap(0);
    requestAnimationFrame(gameLoop);
  }
}
wallTexture.onload    = onTextureLoaded;
floorTexture.onload   = onTextureLoaded;
ceilingTexture.onload = onTextureLoaded;
weaponTexture.onload  = onTextureLoaded;
enemyTexture.onload   = onTextureLoaded;

// ─── VARIABLES DEL JUGADOR (se definen en initMap de maps.js) ───
let posX = 0, posY = 0; // Se sobreescriben en initMap()
let angle = 0;          // Se sobreescriben en initMap()

// Campo de visión y velocidades
const fov = Math.PI / 3;  // 60°
const moveSpeed = 0.2;
const rotSpeed  = 0.2;

// ─── VARIABLES PARA ACELERAR/DESACELERAR LA ROTACIÓN (TECLADO) ───
let rotateLeftTime  = 0;
let rotateRightTime = 0;
const minRotSpeed   = 0.03;
const accelFrames   = 10;

// ─── CONTROL CON RATÓN (POINTER LOCK) ───
// Cuando se use el ratón, la rotación se actualizará directamente según el movimiento
let useMouseRotation = false;
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;

canvas.addEventListener('click', function() {
    canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', lockChangeAlert, false);
document.addEventListener('mozpointerlockchange', lockChangeAlert, false);

function lockChangeAlert() {
    if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
        useMouseRotation = true;
        document.addEventListener("mousemove", updateMouseMovement, false);
    } else {
        useMouseRotation = false;
        document.removeEventListener("mousemove", updateMouseMovement, false);
    }
}

function updateMouseMovement(e) {
    const mouseSensitivity = 0.001; // Ajusta la sensibilidad según convenga
    // Se invierte la dirección: si mueves el ratón a la izquierda, se rota a la izquierda
    angle += e.movementX * mouseSensitivity;
}

// ─── DISPARO CON RATÓN ───
// Al hacer clic izquierdo se dispara
canvas.addEventListener('mousedown', function(e) {
    if (e.button === 0) { // Botón izquierdo
        shootBullet();
    }
});

// ─── CONTROLES CON TECLADO ───
window.keys = {}; // Objeto global para almacenar pulsaciones
window.addEventListener('keydown', e => {
  window.keys[e.key] = true;
  // Activar dash con la tecla Control
  if (e.key === "Control") {
    if (typeof window.dash === "function") {
      window.dash();
    }
  }
  // Disparo con la barra espaciadora (opcional)
  if (e.code === "Space") {
    shootBullet();
  }
});
window.addEventListener('keyup', e => {
  window.keys[e.key] = false;
});

// ─── FUNCIÓN DASH ───
// Mueve al jugador rápidamente hacia adelante si no hay obstáculo.
function dash() {
  const dashDistance = 1; // Distancia del dash (ajústala según tu juego)
  const newX = posX + Math.cos(angle) * dashDistance;
  const newY = posY + Math.sin(angle) * dashDistance;
  if (window.map[Math.floor(newY)][Math.floor(newX)] === 0) {
    posX = newX;
    posY = newY;
  }
}
window.dash = dash;

// ─── SISTEMA DE DISPAROS DEL JUGADOR ───
const bullets = [];
window.bullets = bullets; // Hacemos el array de balas accesible globalmente

const bulletSpeed = 0.5;
let lastShotTime = 0;
const shootCooldown = 300; // milisegundos

// Sonido del disparo (asegúrate de tener "shoot.mp3" en la ruta correcta)
const shootSound = new Audio('shoot.mp3');
shootSound.volume = 0.5;

function shootBullet() {
  const currentTime = Date.now();
  if (currentTime - lastShotTime > shootCooldown) {
    bullets.push({ x: posX, y: posY, angle: angle });
    shootSound.currentTime = 0;
    shootSound.play();
    lastShotTime = currentTime;
  }
}
window.shootBullet = shootBullet;

// ─── FUNCIÓN REINICIAR JUEGO ───
// Reinicia el juego eliminando el overlay y reseteando variables
function restartGame() {
  if (typeof gameOveSound !== 'undefined') {
    gameOveSound.pause();
    gameOveSound.currentTime = 0;
  }
  const overlay = document.getElementById('game-over-overlay');
  if (overlay) {
    document.body.removeChild(overlay);
  }
  // Reiniciamos variables globales según sea necesario
  playerLife = 100;
  bullets.length = 0;
  enemyBullets.length = 0;
  // Se reinician el mapa, enemigos, etc. (asumimos que initMap se encarga de ello)
  window.initMap(0);
}

// ─── ACTUALIZACIÓN DEL ESTADO (MOVIMIENTO Y LÓGICA) ───
function update() {
  // Si la vida llega a 0, se considera Game Over
  if (playerLife <= 0) {
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) {
      // Comprobar si se pulsa el botón Start del gamepad (normalmente button 9)
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp && gp.buttons[9] && gp.buttons[9].pressed && !restartTriggered) {
        restartTriggered = true;
        restartGame();
      } else if (gp && gp.buttons[9] && !gp.buttons[9].pressed) {
        restartTriggered = false;
      }
      return;
    }
    
    // ─── CREAR OVERLAY DE GAME OVER ───
    const overlayNew = document.createElement('div');
    overlayNew.id = 'game-over-overlay';
    overlayNew.style.position = 'fixed';
    overlayNew.style.top = 0;
    overlayNew.style.left = 0;
    overlayNew.style.width = '100%';
    overlayNew.style.height = '100%';
    overlayNew.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlayNew.style.display = 'flex';
    overlayNew.style.flexDirection = 'column';
    overlayNew.style.justifyContent = 'center';
    overlayNew.style.alignItems = 'center';
    overlayNew.style.zIndex = 9999;
    // Hacer que el overlay pueda recibir foco para detectar la tecla Intro
    overlayNew.tabIndex = 0;
    overlayNew.focus();

    // Mensaje "Game Over"
    const message = document.createElement('div');
    message.textContent = '¡Game Over!';
    message.style.color = 'red';
    message.style.fontSize = '48px';
    message.style.marginBottom = '20px';
    overlayNew.appendChild(message);

    // Botón "Reiniciar"
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Reiniciar';
    restartButton.style.padding = '10px 20px';
    restartButton.style.fontSize = '24px';
    restartButton.style.cursor = 'pointer';
    restartButton.addEventListener('click', function() {
      restartGame();
    });
    overlayNew.appendChild(restartButton);

    // Permitir reiniciar con click derecho
    overlayNew.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      restartGame();
    });

    // Permitir reiniciar al pulsar la tecla Intro
    overlayNew.addEventListener('keydown', function(e) {
      if (e.key === "Enter") {
        restartGame();
      }
    });

    document.body.appendChild(overlayNew);
    return;
  }

  // Movimiento del jugador hacia adelante y atrás (w/s o flechas arriba/abajo)
  if (window.keys["ArrowUp"] || window.keys["w"]) {
    const newX = posX + Math.cos(angle) * moveSpeed;
    const newY = posY + Math.sin(angle) * moveSpeed;
    if (window.map[Math.floor(newY)][Math.floor(newX)] === 0) {
      posX = newX;
      posY = newY;
    }
  }
  if (window.keys["ArrowDown"] || window.keys["s"]) {
    const newX = posX - Math.cos(angle) * moveSpeed;
    const newY = posY - Math.sin(angle) * moveSpeed;
    if (window.map[Math.floor(newY)][Math.floor(newX)] === 0) {
      posX = newX;
      posY = newY;
    }
  }

  // Movimiento lateral (strafe) con "a" (izquierda) y "d" (derecha)
  if (window.keys["a"]) {
    const newX = posX + Math.cos(angle - Math.PI / 2) * moveSpeed;
    const newY = posY + Math.sin(angle - Math.PI / 2) * moveSpeed;
    if (window.map[Math.floor(newY)][Math.floor(newX)] === 0) {
      posX = newX;
      posY = newY;
    }
  }
  if (window.keys["d"]) {
    const newX = posX + Math.cos(angle + Math.PI / 2) * moveSpeed;
    const newY = posY + Math.sin(angle + Math.PI / 2) * moveSpeed;
    if (window.map[Math.floor(newY)][Math.floor(newX)] === 0) {
      posX = newX;
      posY = newY;
    }
  }

  // ─── ROTACIÓN ───
  if (!useMouseRotation) {
    if (window.keys["ArrowLeft"] || window.keys["q"]) {
      rotateLeftTime++;
      const factor = Math.min(1, rotateLeftTime / accelFrames);
      angle -= (minRotSpeed + factor * (rotSpeed - minRotSpeed));
    } else {
      rotateLeftTime = 0;
    }
    if (window.keys["ArrowRight"] || window.keys["e"]) {
      rotateRightTime++;
      const factor = Math.min(1, rotateRightTime / accelFrames);
      angle += (minRotSpeed + factor * (rotSpeed - minRotSpeed));
    } else {
      rotateRightTime = 0;
    }
  }
  // Independientemente del método, se añade la rotación analógica del gamepad (stick derecho)
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = gamepads[0];
  if (gp) {
    let axisRotation = gp.axes[2]; // Asumimos que el stick derecho horizontal está en el eje 2
    const threshold = 0.1;
    if (Math.abs(axisRotation) > threshold) {
      const gamepadSensitivity = 0.15; // Ajusta según convenga
      angle += axisRotation * gamepadSensitivity;
    }
  }

  // Actualizamos las posiciones globales (útiles para el minimapa, etc.)
  window.posX = posX;
  window.posY = posY;
  window.angle = angle;

  // ─── ACTUALIZACIÓN DE LOS PROYECTILES DEL JUGADOR ───
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += Math.cos(b.angle) * bulletSpeed;
    b.y += Math.sin(b.angle) * bulletSpeed;
    // Si colisiona con pared o sale del mapa, se elimina
    if (!window.map[Math.floor(b.y)] || window.map[Math.floor(b.y)][Math.floor(b.x)] > 0) {
      bullets.splice(i, 1);
      continue;
    }
    // Detección de impacto con enemigos
    for (let enemy of window.enemies) {
      if (enemy.alive) {
        const dx = enemy.x - b.x;
        const dy = enemy.y - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.3) {
          enemy.alive = false;
          bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  // ─── ACTUALIZACIÓN DE ENEMIGOS ───
  const currentTime = Date.now();
  for (let enemy of window.enemies) {
    if (!enemy.alive) continue;
    const dx = posX - enemy.x;
    const dy = posY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Determinar si el enemigo debe perseguir al jugador
    let chasePlayer = false;
    if (dist < 5 || isPlayerVisible(enemy)) {
      chasePlayer = true;
    }

    let chaseVector = { x: 0, y: 0 };
    if (chasePlayer) {
      chaseVector.x = (dx / dist) * enemySpeed;
      chaseVector.y = (dy / dist) * enemySpeed;
    }

    // Repulsión respecto a las paredes
    let repulseWall = { x: 0, y: 0 };
    const enemyCellX = Math.floor(enemy.x);
    const enemyCellY = Math.floor(enemy.y);
    for (let i = enemyCellY - 1; i <= enemyCellY + 1; i++) {
      for (let j = enemyCellX - 1; j <= enemyCellX + 1; j++) {
        if (window.map[i] && window.map[i][j] > 0) {
          const wallCenterX = j + 0.5;
          const wallCenterY = i + 0.5;
          const vx = enemy.x - wallCenterX;
          const vy = enemy.y - wallCenterY;
          const distanceToWall = Math.sqrt(vx * vx + vy * vy);
          if (distanceToWall < minWallDist && distanceToWall > 0) {
            const push = (minWallDist - distanceToWall);
            repulseWall.x += (vx / distanceToWall) * push * enemySpeed;
            repulseWall.y += (vy / distanceToWall) * push * enemySpeed;
          }
        }
      }
    }

    // Repulsión entre enemigos para mantener separación
    let repulseEnemies = { x: 0, y: 0 };
    for (let other of window.enemies) {
      if (other === enemy || !other.alive) continue;
      const vx = enemy.x - other.x;
      const vy = enemy.y - other.y;
      const d = Math.sqrt(vx * vx + vy * vy);
      if (d < minEnemyDist && d > 0) {
        const push = (minEnemyDist - d);
        repulseEnemies.x += (vx / d) * push * enemySpeed;
        repulseEnemies.y += (vy / d) * push * enemySpeed;
      }
    }

    // Sumar fuerzas de persecución y repulsión
    let moveX = chaseVector.x + repulseWall.x + repulseEnemies.x;
    let moveY = chaseVector.y + repulseWall.y + repulseEnemies.y;

    // Intentar mover al enemigo si la nueva posición es transitable
    const newX = enemy.x + moveX;
    const newY = enemy.y + moveY;
    if (window.map[Math.floor(newY)] && window.map[Math.floor(newY)][Math.floor(newX)] === 0) {
      enemy.x = newX;
      enemy.y = newY;
    } else {
      if (window.map[Math.floor(enemy.y)] && window.map[Math.floor(enemy.y)][Math.floor(newX)] === 0) {
        enemy.x = newX;
      }
      if (window.map[Math.floor(newY)] && window.map[Math.floor(newY)][Math.floor(enemy.x)] === 0) {
        enemy.y = newY;
      }
    }

    // Ataque por contacto: si el enemigo toca al jugador, le quita vida (cada 1 seg)
    if (dist < 0.5) {
      if (!enemy.lastContactDamage || currentTime - enemy.lastContactDamage > 1000) {
        playerLife -= 5;
        enemy.lastContactDamage = currentTime;
      }
    }

    // Ataque a distancia: el enemigo dispara si el jugador está cerca y es visible
    if (dist < 5 && isPlayerVisible(enemy)) {
      if (!enemy.lastShotTime || currentTime - enemy.lastShotTime > enemyShootCooldown) {
        enemyBullets.push({
          x: enemy.x,
          y: enemy.y,
          angle: Math.atan2(posY - enemy.y, posX - enemy.x)
        });
        enemy.lastShotTime = currentTime;
      }
    }
  }

  // ─── ACTUALIZACIÓN DE LOS PROYECTILES DE LOS ENEMIGOS ───
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    bullet.x += Math.cos(bullet.angle) * enemyBulletSpeed;
    bullet.y += Math.sin(bullet.angle) * enemyBulletSpeed;
    if (!window.map[Math.floor(bullet.y)] || window.map[Math.floor(bullet.y)][Math.floor(bullet.x)] > 0) {
      enemyBullets.splice(i, 1);
      continue;
    }
    const dxBullet = posX - bullet.x;
    const dyBullet = posY - bullet.y;
    if (Math.sqrt(dxBullet * dxBullet + dyBullet * dyBullet) < 0.3) {
      playerLife -= 5;
      enemyBullets.splice(i, 1);
      continue;
    }
  }

  // Si ya no quedan enemigos vivos, se pasa al siguiente mapa
  const aliveEnemies = window.enemies.filter(e => e.alive);
  if (aliveEnemies.length === 0) {
    window.nextMap();
  }

  // Actualizar la variable global de vida y, si existe, actualizar el HUD
  window.playerLife = playerLife;
  const lifeLabel = document.getElementById("lifeLabel");
  if (lifeLabel) {
    lifeLabel.innerText = "Vida: " + playerLife;
  }
}

// ─── RENDERIZADO (raycasting 2D) ───
function render() {
  // Fondo negro
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, screenWidth, screenHeight);

  const zBuffer = new Array(screenWidth);
  const planeX = -Math.sin(angle) * Math.tan(fov / 2);
  const planeY =  Math.cos(angle) * Math.tan(fov / 2);
  const dirX   =  Math.cos(angle);
  const dirY   =  Math.sin(angle);
  const invDet = 1.0 / (planeX * dirY - dirX * planeY);
  const halfHeight = screenHeight / 2;
  const posZ = halfHeight;

  // --- Floor & Ceiling casting ---
  const imgData = ctx.getImageData(0, 0, screenWidth, screenHeight);
  const data = imgData.data;

  for (let y = 0; y < screenHeight; y++) {
    let p = y - halfHeight;
    if (p === 0) p = 1;
    const rowDistance = posZ / Math.abs(p);

    const floorStepX = rowDistance * ((dirX + planeX) - (dirX - planeX)) / screenWidth;
    const floorStepY = rowDistance * ((dirY + planeY) - (dirY - planeY)) / screenWidth;
    let worldX = posX + rowDistance * (dirX - planeX);
    let worldY = posY + rowDistance * (dirY - planeY);

    for (let x = 0; x < screenWidth; x++) {
      const cellX = Math.floor(worldX);
      const cellY = Math.floor(worldY);
      const pixelIndex = (y * screenWidth + x) * 4;

      if (y > halfHeight) {
        // Floor
        let tx = Math.floor((worldX - cellX) * floorTexture.width);
        let ty = Math.floor((worldY - cellY) * floorTexture.height);
        tx = ((tx % floorTexture.width) + floorTexture.width) % floorTexture.width;
        ty = ((ty % floorTexture.height) + floorTexture.height) % floorTexture.height;
        const texIndex = (ty * floorTexture.width + tx) * 4;
        data[pixelIndex    ] = floorData[texIndex    ];
        data[pixelIndex + 1] = floorData[texIndex + 1];
        data[pixelIndex + 2] = floorData[texIndex + 2];
        data[pixelIndex + 3] = 255;
      } else if (y < halfHeight) {
        // Ceiling
        let tx = Math.floor((worldX - cellX) * ceilingTexture.width);
        let ty = Math.floor((worldY - cellY) * ceilingTexture.height);
        tx = ((tx % ceilingTexture.width) + ceilingTexture.width) % ceilingTexture.width;
        ty = ((ty % ceilingTexture.height) + ceilingTexture.height) % ceilingTexture.height;
        const texIndex = (ty * ceilingTexture.width + tx) * 4;
        data[pixelIndex    ] = ceilingData[texIndex    ];
        data[pixelIndex + 1] = ceilingData[texIndex + 1];
        data[pixelIndex + 2] = ceilingData[texIndex + 2];
        data[pixelIndex + 3] = 255;
      }

      worldX += floorStepX;
      worldY += floorStepY;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // --- Raycasting de paredes ---
  for (let x = 0; x < screenWidth; x++) {
    const cameraX = 2 * x / screenWidth - 1;
    const rayDirX = dirX + planeX * cameraX;
    const rayDirY = dirY + planeY * cameraX;

    let mapX = Math.floor(posX);
    let mapY = Math.floor(posY);

    const deltaDistX = Math.abs(1 / rayDirX);
    const deltaDistY = Math.abs(1 / rayDirY);

    let stepX, stepY;
    let sideDistX, sideDistY;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (posX - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - posX) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (posY - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - posY) * deltaDistY;
    }

    let hit = false;
    let side;

    while (!hit) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (window.map[mapY][mapX] > 0) hit = true;
    }

    let perpWallDist;
    if (side === 0) {
      perpWallDist = (mapX - posX + (1 - stepX) / 2) / rayDirX;
    } else {
      perpWallDist = (mapY - posY + (1 - stepY) / 2) / rayDirY;
    }

    zBuffer[x] = perpWallDist;

    const lineHeight = Math.floor(screenHeight / perpWallDist);
    let drawStart = Math.floor(-lineHeight / 2 + screenHeight / 2);
    if (drawStart < 0) drawStart = 0;
    let drawEnd = Math.floor(lineHeight / 2 + screenHeight / 2);
    if (drawEnd >= screenHeight) drawEnd = screenHeight - 1;

    let wallX;
    if (side === 0) {
      wallX = posY + perpWallDist * rayDirY;
    } else {
      wallX = posX + perpWallDist * rayDirX;
    }
    wallX -= Math.floor(wallX);

    let texX = Math.floor(wallX * wallTexture.width);
    if (side === 0 && rayDirX > 0) texX = wallTexture.width - texX - 1;
    if (side === 1 && rayDirY < 0) texX = wallTexture.width - texX - 1;

    if (wallTexture.complete) {
      ctx.drawImage(
        wallTexture,
        texX, 0, 1, wallTexture.height,
        x, drawStart, 1, drawEnd - drawStart
      );
    } else {
      ctx.fillStyle = (side === 1) ? "#888" : "#aaa";
      ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
    }
  }

  // --- Renderizado de enemigos (sprites) ---
  const spriteData = [];
  for (let enemy of window.enemies) {
    if (!enemy.alive) continue;
    const spriteX = enemy.x - posX;
    const spriteY = enemy.y - posY;
    const transformX = invDet * (dirY * spriteX - dirX * spriteY);
    const transformY = invDet * (-planeY * spriteX + planeX * spriteY);
    if (transformY <= 0) continue;
    spriteData.push({ enemy, transformX, transformY });
  }
  spriteData.sort((a, b) => b.transformY - a.transformY);

  for (let sprite of spriteData) {
    const { transformX, transformY } = sprite;
    const spriteScreenX = Math.floor((screenWidth / 2) * (1 + transformX / transformY));
    const spriteHeight = Math.abs(Math.floor(screenHeight / transformY));
    const spriteWidth  = spriteHeight;
    const drawStartY = Math.floor(-spriteHeight / 2 + screenHeight / 2);
    const drawStartX = Math.floor(-spriteWidth / 2 + spriteScreenX);
    for (let stripe = drawStartX; stripe < drawStartX + spriteWidth; stripe++) {
      if (stripe < 0 || stripe >= screenWidth) continue;
      if (transformY < zBuffer[stripe]) {
        const texX = Math.floor((stripe - drawStartX) * enemyTexture.width / spriteWidth);
        ctx.drawImage(
          enemyTexture,
          texX, 0, 1, enemyTexture.height,
          stripe, drawStartY, 1, spriteHeight
        );
      }
    }
  }

  // --- Renderizado de proyectiles del jugador ---
  for (let bullet of bullets) {
    const spriteX = bullet.x - posX;
    const spriteY = bullet.y - posY;
    const transformX = invDet * (dirY * spriteX - dirX * spriteY);
    const transformY = invDet * (-planeY * spriteX + planeX * spriteY);
    if (transformY > 0) {
      const spriteScreenX = Math.floor((screenWidth / 2) * (1 + transformX / transformY));
      const spriteSize = Math.abs(Math.floor(screenHeight / transformY)) / 8;
      const drawStartY = Math.floor(-spriteSize / 2 + screenHeight / 2);
      const drawStartX = Math.floor(-spriteSize / 2 + spriteScreenX);
      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(
        drawStartX + spriteSize / 2, 
        drawStartY + spriteSize / 2,
        spriteSize / 2, 
        0, 
        2 * Math.PI
      );
      ctx.fill();
    }
  }

  // --- Renderizado de proyectiles de los enemigos ---
  for (let bullet of enemyBullets) {
    const spriteX = bullet.x - posX;
    const spriteY = bullet.y - posY;
    const transformX = invDet * (dirY * spriteX - dirX * spriteY);
    const transformY = invDet * (-planeY * spriteX + planeX * spriteY);
    if (transformY > 0) {
      const spriteScreenX = Math.floor((screenWidth / 2) * (1 + transformX / transformY));
      const spriteSize = Math.abs(Math.floor(screenHeight / transformY)) / 8;
      const drawStartY = Math.floor(-spriteSize / 2 + screenHeight / 2);
      const drawStartX = Math.floor(-spriteSize / 2 + spriteScreenX);
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(
        drawStartX + spriteSize / 2, 
        drawStartY + spriteSize / 2,
        spriteSize / 2, 
        0, 
        2 * Math.PI
      );
      ctx.fill();
    }
  }

  // --- Dibuja el arma (HUD) en la parte inferior ---
  const weaponWidth = screenWidth * 0.5;
  const weaponHeight = weaponTexture.height * (weaponWidth / weaponTexture.width);
  const weaponX = (screenWidth - weaponWidth) / 2;
  const weaponY = screenHeight - weaponHeight;
  ctx.drawImage(weaponTexture, weaponX, weaponY, weaponWidth, weaponHeight);
}

// ─── BUCLE DEL JUEGO ───
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}
