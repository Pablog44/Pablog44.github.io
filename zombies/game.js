// Configuración inicial del canvas y contexto
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Variables globales para modo de juego y controles
let gameMode = 1; // 1 o 2 jugadores
let controlTypePlayer1 = "keyboard"; // "keyboard" o "gamepad" (para 1 jugador se elige)
let controlTypePlayer2 = "gamepad";   // Para 2 jugadores se asigna automáticamente

// Variables para los jugadores
let player;          // Usado en modo 1 jugador
let player1, player2; // Para modo 2 jugadores

// Arrays de balas y enemigos
let bullets = [];      // Balas de jugador(s)
let enemyBullets = []; // Balas de enemigos
let enemies = [];
let bulletSpeed = 9;
let enemyBulletSpeed = 6;
let score = 0;
let shotCooldown = 200; // milisegundos entre disparos

// Estrellas de fondo
let stars = [[], [], []];
let starSpeeds = [1, 2, 3];
let starColors = ['#FFFF00', '#FFFF33', '#FFFF66'];

// Para controles de teclado (para jugador 1)
let keys = {
  up: false,
  down: false,
  left: false,
  right: false
};

let isUsingGamepad = false;
let gameOver = false;

// Inicializar estrellas
for (let i = 0; i < 100; i++) {
  for (let j = 0; j < stars.length; j++) {
    let star = {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2,
    };
    stars[j].push(star);
  }
}

/* ------------------------- */
/*   Lógica de la interfaz   */
/* ------------------------- */

// Landing page
document.getElementById('onePlayerBtn').addEventListener('click', () => {
  gameMode = 1;
  document.getElementById('landing').style.display = 'none';
  document.getElementById('onePlayerControl').style.display = 'block';
  document.getElementById('controlSelection').style.display = 'block';
});

document.getElementById('twoPlayersBtn').addEventListener('click', () => {
  gameMode = 2;
  document.getElementById('landing').style.display = 'none';
  document.getElementById('twoPlayersControl').style.display = 'block';
  document.getElementById('controlSelection').style.display = 'block';
});

document.getElementById('recordsBtn').addEventListener('click', () => {
  document.getElementById('landing').style.display = 'none';
  document.getElementById('recordsPage').style.display = 'block';
  displayRecords();
});

document.getElementById('backToLandingBtn').addEventListener('click', () => {
  document.getElementById('recordsPage').style.display = 'none';
  document.getElementById('landing').style.display = 'block';
});

// Para 1 jugador, elegir el control
document.getElementById('controlKeyboardBtn').addEventListener('click', () => {
  controlTypePlayer1 = "keyboard";
  startGame();
});
document.getElementById('controlGamepadBtn').addEventListener('click', () => {
  controlTypePlayer1 = "gamepad";
  startGame();
});

// Para 2 jugadores (se asigna: Jugador1 = teclado y ratón; Jugador2 = mando)
document.getElementById('startTwoPlayersBtn').addEventListener('click', () => {
  controlTypePlayer1 = "keyboard";
  controlTypePlayer2 = "gamepad";
  startGame();
});

// Gestión de records (usando localStorage)
function saveRecord(newScore) {
  let records = JSON.parse(localStorage.getItem('records')) || [];
  records.push(newScore);
  records.sort((a, b) => b - a);
  records = records.slice(0, 10); // Top 10
  localStorage.setItem('records', JSON.stringify(records));
}

function displayRecords() {
  let records = JSON.parse(localStorage.getItem('records')) || [];
  let recordsList = document.getElementById('recordsList');
  recordsList.innerHTML = "";
  if (records.length === 0) {
    recordsList.innerHTML = "<li>No hay records aún.</li>";
  } else {
    records.forEach((rec, index) => {
      let li = document.createElement('li');
      li.textContent = (index + 1) + ". " + rec;
      recordsList.appendChild(li);
    });
  }
}

/* ------------------------- */
/*   Eventos de entrada      */
/* ------------------------- */

// Teclado para jugador 1 (o para jugador 1 en modo 2 jugadores)
document.addEventListener('keydown', function(e) {
  if (!gameOver && ((gameMode === 1 && controlTypePlayer1 === "keyboard") || gameMode === 2)) {
    switch(e.key) {
      case 'w': keys.up = true; break;
      case 'a': keys.left = true; break;
      case 's': keys.down = true; break;
      case 'd': keys.right = true; break;
    }
  }
});
document.addEventListener('keyup', function(e) {
  if ((gameMode === 1 && controlTypePlayer1 === "keyboard") || gameMode === 2) {
    switch(e.key) {
      case 'w': keys.up = false; break;
      case 'a': keys.left = false; break;
      case 's': keys.down = false; break;
      case 'd': keys.right = false; break;
    }
  }
});

// Mouse para jugador 1 (usa teclado/ratón)  
let mouse = { x: 0, y: 0 };
canvas.addEventListener('mousemove', function(e) {
  if (!gameOver && ((gameMode === 1 && controlTypePlayer1 === "keyboard") || gameMode === 2)) {
    let rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    if (gameMode === 1 && controlTypePlayer1 === "keyboard") {
      player.rotation = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    }
    if (gameMode === 2) {
      player1.rotation = Math.atan2(mouse.y - player1.y, mouse.x - player1.x);
    }
  }
});

// Click para disparar (jugador 1)
canvas.addEventListener('click', function(e) {
  if (!gameOver) {
    if (gameMode === 1 && controlTypePlayer1 === "keyboard") {
      shootBullet(player);
    }
    if (gameMode === 2) {
      shootBullet(player1);
    }
  }
});

/* ------------------------- */
/*    Funciones del juego    */
/* ------------------------- */

// Función para disparar (recibe el objeto jugador)
function shootBullet(playerObj) {
  let currentTime = Date.now();
  if (currentTime - playerObj.lastShotTime >= shotCooldown) {
    let bullet = {
      x: playerObj.x,
      y: playerObj.y,
      vx: bulletSpeed * Math.cos(playerObj.rotation),
      vy: bulletSpeed * Math.sin(playerObj.rotation),
      // En modo 2, se usa azul para el jugador 1 y verde para el jugador 2
      color: (gameMode === 2 && playerObj === player2) ? '#0f0' : '#00f'
    };
    bullets.push(bullet);
    playerObj.lastShotTime = currentTime;
  }
}

// Función para generar enemigos
function spawnEnemy() {
  let attempts = 0;
  const maxAttempts = 10;
  let newEnemy;
  do {
    newEnemy = {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      width: 10,
      height: 20,
      wanderAngle: Math.random() * Math.PI * 2,
      lastShot: Date.now() + Math.random() * 1000
    };
    attempts++;
  } while (isTooCloseToOthers(newEnemy) && attempts < maxAttempts);
  if (attempts < maxAttempts) {
    enemies.push(newEnemy);
  }
}
setInterval(spawnEnemy, 2000);

function isTooCloseToOthers(enemy) {
  const minDistance = 40;
  for (let other of enemies) {
    let dx = enemy.x - other.x;
    let dy = enemy.y - other.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < minDistance) return true;
  }
  return false;
}

// Función para actualizar el mando (se usa para el control gamepad)
function pollGamepad() {
  let gamepads = navigator.getGamepads();
  // Modo 1: si se eligió mando para el jugador único
  if (gameMode === 1 && controlTypePlayer1 === "gamepad") {
    let gp = gamepads[0];
    if (gp) {
      isUsingGamepad = true;
      player.rotation = Math.atan2(gp.axes[3], gp.axes[2]);
      player.x += gp.axes[0] * player.speed;
      player.y += gp.axes[1] * player.speed;
      if (gp.buttons[5].pressed || gp.buttons[0].pressed) {
        shootBullet(player);
      }
      if (gameOver && gp.buttons[9].pressed) {
        resetGame();
      }
    } else {
      isUsingGamepad = false;
    }
  }
  // Modo 2: para el Jugador 2 (usando mando)
  if (gameMode === 2) {
    let gp = gamepads[0];
    if (gp) {
      isUsingGamepad = true;
      player2.rotation = Math.atan2(gp.axes[3], gp.axes[2]);
      player2.x += gp.axes[0] * player2.speed;
      player2.y += gp.axes[1] * player2.speed;
      if (gp.buttons[5].pressed || gp.buttons[0].pressed) {
        shootBullet(player2);
      }
      if (gameOver && gp.buttons[9].pressed) {
        resetGame();
      }
    } else {
      isUsingGamepad = false;
    }
  }
}

// Inicializar jugadores según el modo seleccionado
function initPlayers() {
  if (gameMode === 1) {
    player = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      width: 10,
      height: 20,
      rotation: 0,
      speed: 4,
      lastShotTime: 0
    };
  }
  if (gameMode === 2) {
    player1 = {
      x: canvas.width / 3,
      y: canvas.height / 2,
      width: 10,
      height: 20,
      rotation: 0,
      speed: 4,
      lastShotTime: 0
    };
    player2 = {
      x: 2 * canvas.width / 3,
      y: canvas.height / 2,
      width: 10,
      height: 20,
      rotation: 0,
      speed: 4,
      lastShotTime: 0
    };
  }
}

// Reiniciar el juego
function resetGame() {
  initPlayers();
  bullets = [];
  enemyBullets = [];
  enemies = [];
  score = 0;
  keys = { up: false, down: false, left: false, right: false };
  isUsingGamepad = false;
  gameOver = false;
}

// Bucle principal del juego
function gameLoop() {
  if (!gameOver) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Fondo de estrellas
    for (let i = 0; i < stars.length; i++) {
      ctx.fillStyle = starColors[i];
      for (let j = 0; j < stars[i].length; j++) {
        let star = stars[i][j];
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        star.x -= starSpeeds[i];
        if (star.x < 0) {
          stars[i].splice(j, 1);
          stars[i].push({
            x: canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2,
          });
        }
      }
    }
    // Actualizar jugadores
    if (gameMode === 1) {
      if (controlTypePlayer1 === "keyboard") {
        let dx = mouse.x - player.x;
        let dy = mouse.y - player.y;
        let distanceToMouse = Math.sqrt(dx * dx + dy * dy);
        if (distanceToMouse > 50) {
          let angleToMouse = Math.atan2(dy, dx);
          player.x += player.speed * Math.cos(angleToMouse);
          player.y += player.speed * Math.sin(angleToMouse);
        }
        if (keys.up) player.y -= player.speed;
        if (keys.down) player.y += player.speed;
        if (keys.left) player.x -= player.speed;
        if (keys.right) player.x += player.speed;
      }
      pollGamepad();
    }
    if (gameMode === 2) {
      // Jugador 1 (teclado y ratón)
      let dx1 = mouse.x - player1.x;
      let dy1 = mouse.y - player1.y;
      let distanceToMouse1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      if (distanceToMouse1 > 50) {
        let angleToMouse1 = Math.atan2(dy1, dx1);
        player1.x += player1.speed * Math.cos(angleToMouse1);
        player1.y += player1.speed * Math.sin(angleToMouse1);
      }
      if (keys.up) player1.y -= player1.speed;
      if (keys.down) player1.y += player1.speed;
      if (keys.left) player1.x -= player1.speed;
      if (keys.right) player1.x += player1.speed;
      // Jugador 2 (mando)
      pollGamepad();
    }
    // Dibujar jugadores
    if (gameMode === 1) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.rotation);
      ctx.fillStyle = '#00f';
      ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (gameMode === 2) {
      // Jugador 1
      ctx.save();
      ctx.translate(player1.x, player1.y);
      ctx.rotate(player1.rotation);
      ctx.fillStyle = '#00f';
      ctx.fillRect(-player1.width / 2, -player1.height / 2, player1.width, player1.height);
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Jugador 2
      ctx.save();
      ctx.translate(player2.x, player2.y);
      ctx.rotate(player2.rotation);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(-player2.width / 2, -player2.height / 2, player2.width, player2.height);
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Actualizar y dibujar balas de jugadores
    for (let i = bullets.length - 1; i >= 0; i--) {
      let bullet = bullets[i];
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
      ctx.fill();
      // Colisión bala-enemigo
      for (let j = enemies.length - 1; j >= 0; j--) {
        let enemy = enemies[j];
        let dx = enemy.x - bullet.x;
        let dy = enemy.y - bullet.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < enemy.width / 2) {
          enemies.splice(j, 1);
          bullets.splice(i, 1);
          score++;
          break;
        }
      }
    }
    // Actualizar y dibujar balas de enemigos
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      let bullet = enemyBullets[i];
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
      ctx.fill();
      // Colisión con jugadores
      if (gameMode === 1) {
        let dx = player.x - bullet.x;
        let dy = player.y - bullet.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < player.width / 2) {
          gameOver = true;
        }
      }
      if (gameMode === 2) {
        let dx1 = player1.x - bullet.x;
        let dy1 = player1.y - bullet.y;
        let distance1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        let dx2 = player2.x - bullet.x;
        let dy2 = player2.y - bullet.y;
        let distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (distance1 < player1.width / 2 || distance2 < player2.width / 2) {
          gameOver = true;
        }
      }
    }
    // Actualizar y dibujar enemigos
    for (let i = enemies.length - 1; i >= 0; i--) {
      let enemy = enemies[i];
      let dx, dy, pursuitAngle;
      if (gameMode === 1) {
        dx = player.x - enemy.x;
        dy = player.y - enemy.y;
      }
      if (gameMode === 2) {
        // En modo 2, el enemigo persigue al jugador más cercano
        let dx1 = player1.x - enemy.x;
        let dy1 = player1.y - enemy.y;
        let d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        let dx2 = player2.x - enemy.x;
        let dy2 = player2.y - enemy.y;
        let d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (d1 < d2) {
          dx = dx1;
          dy = dy1;
        } else {
          dx = dx2;
          dy = dy2;
        }
      }
      pursuitAngle = Math.atan2(dy, dx);
      let finalAngle = pursuitAngle * 0.9 + enemy.wanderAngle * 0.1;
      enemy.wanderAngle += (Math.random() - 0.5) * 0.1;
      // Fuerza de separación entre enemigos
      let separationX = 0;
      let separationY = 0;
      for (let j = 0; j < enemies.length; j++) {
        if (i !== j) {
          let other = enemies[j];
          let sepDx = enemy.x - other.x;
          let sepDy = enemy.y - other.y;
          let sepDist = Math.sqrt(sepDx * sepDx + sepDy * sepDy);
          if (sepDist < 40 && sepDist > 0) {
            let force = (40 - sepDist) / 40;
            separationX += (sepDx / sepDist) * force * 2;
            separationY += (sepDy / sepDist) * force * 2;
          }
        }
      }
      enemy.x += Math.cos(finalAngle) * 2 + separationX;
      enemy.y += Math.sin(finalAngle) * 2 + separationY;
      // Disparo del enemigo
      let currentTime = Date.now();
      if (currentTime - enemy.lastShot >= 1000) {
        let bullet = {
          x: enemy.x,
          y: enemy.y,
          vx: enemyBulletSpeed * Math.cos(pursuitAngle),
          vy: enemyBulletSpeed * Math.sin(pursuitAngle),
          color: '#f00'
        };
        enemyBullets.push(bullet);
        enemy.lastShot = currentTime;
      }
      // Dibujar enemigo
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(pursuitAngle + Math.PI);
      ctx.fillStyle = '#f00';
      ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // Colisión enemigo-jugador
      if (gameMode === 1) {
        let pdx = player.x - enemy.x;
        let pdy = player.y - enemy.y;
        let pdistance = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pdistance < player.width / 2) {
          gameOver = true;
        }
      }
      if (gameMode === 2) {
        let pdx1 = player1.x - enemy.x;
        let pdy1 = player1.y - enemy.y;
        let pdistance1 = Math.sqrt(pdx1 * pdx1 + pdy1 * pdy1);
        let pdx2 = player2.x - enemy.x;
        let pdy2 = player2.y - enemy.y;
        let pdistance2 = Math.sqrt(pdx2 * pdx2 + pdy2 * pdy2);
        if (pdistance1 < player1.width / 2 || pdistance2 < player2.width / 2) {
          gameOver = true;
        }
      }
    }
    // Mostrar score
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Score: " + score, 8, 20);
  } else {
    // Pantalla de Game Over
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "60px Arial";
    ctx.fillStyle = "#ff0000";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "30px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 20);
    ctx.font = "20px Arial";
    ctx.fillStyle = "#00ff00";
    ctx.fillText("Press START to Restart", canvas.width / 2, canvas.height / 2 + 60);
    pollGamepad();
    // También se permite reiniciar con la tecla Enter
    document.addEventListener('keydown', function(e) {
      if (gameOver && e.key === 'Enter') {
        resetGame();
      }
    });
    saveRecord(score);
  }
  requestAnimationFrame(gameLoop);
}

// Función para iniciar el juego: oculta la UI y muestra el canvas
function startGame() {
  document.getElementById('controlSelection').style.display = 'none';
  document.getElementById('gameCanvas').style.display = 'block';
  initPlayers();
  resetGame();
  gameLoop();
}
