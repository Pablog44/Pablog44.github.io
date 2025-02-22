/***** game.js *****/

/***** CONFIGURACIÓN DEL CANVAS Y VARIABLES GLOBALES *****/
const canvas = document.getElementById('gameCanvas');
const availableHeight = window.innerHeight * 0.85;
const canvasSize = Math.min(window.innerWidth, availableHeight);
canvas.width = canvasSize;
canvas.height = canvasSize;
const ctx = canvas.getContext('2d');
const screenWidth = canvas.width;
const screenHeight = canvas.height;

// VARIABLES GLOBALES DEL JUEGO
let playerLife = 100;            // Vida del jugador
let enemyBullets = [];           // Proyectiles de los enemigos
const enemyBulletSpeed = 0.3;    // Velocidad de los proyectiles enemigos
const enemyShootCooldown = 3000; // Tiempo (ms) entre disparos de cada enemigo

// ─── FUNCIONES DE AYUDA ───
function loadTexture(src) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  return img;
}

// ─── CARGA DE TEXTURAS ───
// Cambiamos la textura de las paredes para que use un GIF (por ejemplo, "wall.gif")
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

    // **Aquí inicializamos el primer mapa y arrancamos el bucle**
    window.initMap(0); // <-- Viene de maps.js (define también window.enemies, etc.)
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

// ─── VARIABLES PARA ACELERAR/DESACELERAR LA ROTACIÓN ───
let rotateLeftTime  = 0;
let rotateRightTime = 0;
const minRotSpeed   = 0.03;
const accelFrames   = 10;
// ──────────────────────────────────────────────────────────

// ─── CONTROLES ───
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
  // Comprobamos que no choque con una pared
  if (window.map[Math.floor(newY)][Math.floor(newX)] === 0) {
    posX = newX;
    posY = newY;
  }
  // Opcional: reproducir sonido o animación
}
window.dash = dash;

// ─── SISTEMA DE DISPAROS DEL JUGADOR ───
const bullets = [];
// Hacemos que el array de balas esté accesible globalmente
window.bullets = bullets;

const bulletSpeed = 0.5;
let lastShotTime = 0;
const shootCooldown = 300; // milisegundos

// ─── SONIDO DEL DISPARO ───
// Se carga un archivo de audio (asegúrate de tener "shoot.mp3" en la ruta correcta)
const shootSound = new Audio('shoot.mp3');
shootSound.volume = 0.5; // Ajusta el volumen (0 a 1)

function shootBullet() {
  const currentTime = Date.now();
  if (currentTime - lastShotTime > shootCooldown) {
    bullets.push({ x: posX, y: posY, angle: angle });
    shootSound.currentTime = 0; // Reiniciar el sonido para poder reproducirlo de inmediato
    shootSound.play();
    lastShotTime = currentTime;
  }
}
window.shootBullet = shootBullet; // Exponer para otros módulos (footer.js, etc.)

// ─── MOVIMIENTO DE ENEMIGOS ───
const enemySpeed = 0.02;

// ─── ACTUALIZACIÓN DEL ESTADO (MOVIMIENTO Y LÓGICA) ───
function update() {
  // Si la vida llega a 0, se considera Game Over
  if (playerLife <= 0) {
    alert("¡Game Over!");
    window.initMap(0);
    playerLife = 100;
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

  // Movimiento lateral (strafe) con "q" (izquierda) y "e" (derecha)
  if (window.keys["q"]) {
    // Movimiento perpendicular hacia la izquierda (ángulo - 90°)
    const newX = posX + Math.cos(angle - Math.PI / 2) * moveSpeed;
    const newY = posY + Math.sin(angle - Math.PI / 2) * moveSpeed;
    if (window.map[Math.floor(newY)][Math.floor(newX)] === 0) {
      posX = newX;
      posY = newY;
    }
  }
  if (window.keys["e"]) {
    // Movimiento perpendicular hacia la derecha (ángulo + 90°)
    const newX = posX + Math.cos(angle + Math.PI / 2) * moveSpeed;
    const newY = posY + Math.sin(angle + Math.PI / 2) * moveSpeed;
    if (window.map[Math.floor(newY)][Math.floor(newX)] === 0) {
      posX = newX;
      posY = newY;
    }
  }

  // Rotación con aceleración/desaceleración (teclas flecha izquierda/derecha o a/d)
  if (window.keys["ArrowLeft"] || window.keys["a"]) {
    rotateLeftTime++;
    const factor = Math.min(1, rotateLeftTime / accelFrames);
    angle -= (minRotSpeed + factor * (rotSpeed - minRotSpeed));
  } else {
    rotateLeftTime = 0;
  }
  if (window.keys["ArrowRight"] || window.keys["d"]) {
    rotateRightTime++;
    const factor = Math.min(1, rotateRightTime / accelFrames);
    angle += (minRotSpeed + factor * (rotSpeed - minRotSpeed));
  } else {
    rotateRightTime = 0;
  }

  // Actualizamos las posiciones en window (para el minimapa)
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
    if (enemy.alive) {
      const dx = posX - enemy.x;
      const dy = posY - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Movimiento: se acerca al jugador y, si choca con pared, intenta deslizarse
      if (dist > 0.5) {
        const moveX = (dx / dist) * enemySpeed;
        const moveY = (dy / dist) * enemySpeed;
        const newX = enemy.x + moveX;
        const newY = enemy.y + moveY;
        if (window.map[Math.floor(newY)][Math.floor(newX)] === 0) {
          enemy.x = newX;
          enemy.y = newY;
        } else {
          // Intentar deslizarse: mover solo en X o solo en Y si es posible
          if (window.map[Math.floor(enemy.y)][Math.floor(newX)] === 0) {
            enemy.x = newX;
          }
          if (window.map[Math.floor(newY)][Math.floor(enemy.x)] === 0) {
            enemy.y = newY;
          }
        }
      }
      
      // Ataque por contacto: si el enemigo toca al jugador, le quita vida (cada 1 seg)
      if (dist < 0.5) {
        if (!enemy.lastContactDamage || currentTime - enemy.lastContactDamage > 1000) {
          playerLife -= 5;
          enemy.lastContactDamage = currentTime;
        }
      }
      
      // Ataque a distancia: si el jugador está cerca, el enemigo dispara
      if (dist < 5) {
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
  }

  // ─── ACTUALIZACIÓN DE LOS PROYECTILES DE LOS ENEMIGOS ───
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];
    bullet.x += Math.cos(bullet.angle) * enemyBulletSpeed;
    bullet.y += Math.sin(bullet.angle) * enemyBulletSpeed;
    // Si colisiona con pared o sale del mapa, se elimina
    if (!window.map[Math.floor(bullet.y)] || window.map[Math.floor(bullet.y)][Math.floor(bullet.x)] > 0) {
      enemyBullets.splice(i, 1);
      continue;
    }
    // Si impacta al jugador, le quita vida
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
    window.nextMap(); // Función definida en maps.js
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
    if (p === 0) p = 1; // Evitar división entre cero
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

    // Coordenada X en la textura
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
