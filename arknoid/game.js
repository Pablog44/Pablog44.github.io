const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Variables para la posición y velocidad de la paleta
let paddleX = canvas.width / 2;
const paddleY = canvas.height - 20;
const paddleWidth = 100;
const paddleHeight = 10;
let paddleSpeed = 7;

// Variables para la posición y velocidad de la pelota
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballRadius = 10;
let ballSpeedX = 3;
let ballSpeedY = -3;

// Variables para el estado del juego
let lives = 3;
let gameStarted = false;
let gameOver = false;

// Variables para los bloques
const blockRowCount = 4;
const blockColumnCount = 10;
const blockWidth = 75;
const blockHeight = 20;
const blockPadding = 10;
const blockOffsetTop = 30;
const blockOffsetLeft = 30;

// Definir los colores de los bloques
const blockColors = ["#00FF00", "#FFA500", "#FFFF00", "#FF1493"];

// Crear los bloques
let blocks = [];
for (let c = 0; c < blockColumnCount; c++) {
  blocks[c] = [];
  for (let r = 0; r < blockRowCount; r++) {
    blocks[c][r] = { x: 0, y: 0, visible: true };
  }
}

// Escuchar eventos de ratón para controlar la paleta
canvas.addEventListener("mousemove", (event) => {
  if (!gameStarted || gameOver) return;

  let mouseX = event.clientX - canvas.offsetLeft;
  if (mouseX > paddleWidth / 2 && mouseX < canvas.width - paddleWidth / 2) {
    paddleX = mouseX - paddleWidth / 2;
  }
});

// Función para dibujar la paleta
function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, paddleY, paddleWidth, paddleHeight);
  ctx.fillStyle = "#00FF00";
  ctx.fill();
  ctx.closePath();
}
// Función para dibujar las vidas
function drawLives() {
  ctx.font = "20px Arial";
  ctx.fillStyle = "#00FF00";
  let heartEmoji = "❤️";
  let startX = canvas.width - 30 * lives;
  let startY = 20;

  for (let i = 0; i < lives; i++) {
    ctx.fillText(heartEmoji, startX + 30 * i, startY);
  }
}
// Función para dibujar la pelota
function drawBall() {
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#00FFFF";
  ctx.fill();
  ctx.closePath();
}

// Función para dibujar los bloques
function drawBlocks() {
  for (let c = 0; c < blockColumnCount; c++) {
    for (let r = 0; r < blockRowCount; r++) {
      if (blocks[c][r].visible) {
        let blockX = c * (blockWidth + blockPadding) + blockOffsetLeft;
        let blockY = r * (blockHeight + blockPadding) + blockOffsetTop;

        ctx.beginPath();
        ctx.rect(blockX, blockY, blockWidth, blockHeight);
        ctx.fillStyle = blockColors[r];
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}


// Función para detectar colisiones con la paleta
function checkPaddleCollision() {
  if (
    ballY + ballRadius >= paddleY &&
    ballY + ballRadius <= paddleY + paddleHeight &&
    ballX >= paddleX &&
    ballX <= paddleX + paddleWidth
  ) {
    let paddleCenterX = paddleX + paddleWidth / 2;
    let collisionOffset = ballX - paddleCenterX;
    ballSpeedY = -ballSpeedY;

    // Cambiar la dirección de la pelota en función de la posición de la colisión
    if (collisionOffset < 0) {
      ballSpeedX = -Math.abs(ballSpeedX);
    } else {
      ballSpeedX = Math.abs(ballSpeedX);
    }
  }
}

// Función para detectar colisiones con los bloques
function checkBlockCollision() {
  for (let c = 0; c < blockColumnCount; c++) {
    for (let r = 0; r < blockRowCount; r++) {
      let block = blocks[c][r];
      if (block.visible) {
        let blockX = c * (blockWidth + blockPadding) + blockOffsetLeft;
        let blockY = r * (blockHeight + blockPadding) + blockOffsetTop;

        if (
          ballX > blockX &&
          ballX < blockX + blockWidth &&
          ballY > blockY &&
          ballY < blockY + blockHeight
        ) {
          ballSpeedY = -ballSpeedY;
          block.visible = false;
        }
      }
    }
  }
}

// Función para actualizar la posición de la pelota
function updateBallPosition() {
  ballX += ballSpeedX;
  ballY += ballSpeedY;
}

// Función para detectar colisiones con los bordes del canvas
function checkWallCollision() {
  if (ballX + ballRadius >= canvas.width || ballX - ballRadius <= 0) {
    ballSpeedX = -ballSpeedX;
  }

  if (ballY - ballRadius <= 0) {
    ballSpeedY = -ballSpeedY;
  }

  // Verificar si la pelota ha tocado el suelo
  if (ballY + ballRadius >= canvas.height) {
    // Restar una vida
    lives--;

    // Verificar si se han perdido todas las vidas
    if (lives === 0) {
      gameOver = true;
    } else {
      // Reiniciar la posición de la pelota, la paleta y los bloques
      ballX = canvas.width / 2;
      ballY = canvas.height / 2;
      paddleX = canvas.width / 2 - paddleWidth / 2;

      for (let c = 0; c < blockColumnCount; c++) {
        for (let r = 0; r < blockRowCount; r++) {
          blocks[c][r].visible = true;
        }
      }

      // Detener el movimiento de la pelota
      ballSpeedX = 0;
      ballSpeedY = 0;

      // Esperar a que el jugador haga clic para reiniciar el juego
      gameStarted = false;
      canvas.addEventListener("click", startGame);
    }
  }
}


// Función para reiniciar el juego cuando se hace clic
function startGame() {
  gameStarted = true;
  canvas.removeEventListener("click", startGame);

  // Iniciar el movimiento de la pelota
  ballSpeedX = 3;
  ballSpeedY = -3;
   // Llamar a gameLoop para iniciar el juego
   gameLoop();
}

// Función principal para dibujar y actualizar el juego
function gameLoop() {
  // Limpiar el canvas
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
 // Configurar el efecto brillante
 ctx.shadowColor = "#00FF00";
 ctx.shadowBlur = 10;
 ctx.shadowOffsetX = 0;
 ctx.shadowOffsetY = 0;
  // Dibujar la paleta, la pelota y los bloques
  drawPaddle();
  drawBall();
  drawBlocks();
  drawLives();
 


  // Verificar colisiones y actualizar las posiciones
  checkPaddleCollision();
  checkBlockCollision();
  updateBallPosition();
  checkWallCollision();

  // Si el juego está en curso, seguir llamando al gameLoop
  if (!gameOver) {
    requestAnimationFrame(gameLoop);
  } else {
    // Mostrar el mensaje "Game Over" brillante
    ctx.font = "50px sans-serif";
    ctx.fillStyle = "#00FF00";
    ctx.fillText("Game Over", canvas.width / 2 - 120, canvas.height / 2 + 15);
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    ctx.strokeText("Game Over", canvas.width / 2 - 120, canvas.height / 2 + 15);
    
    // Esperar a que el jugador presione la tecla "r" para reiniciar el juego
    document.addEventListener("keydown", restartGame);
    
  }
}

// Función para reiniciar el juego cuando se presiona la tecla "r"
function restartGame(event) {
  if (event.key === "r") {
    lives = 3;
    gameOver = false;

    // Reiniciar la posición de la pelota, la paleta y los bloques
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    paddleX = canvas.width / 2 - paddleWidth / 2;

    for (let c = 0; c < blockColumnCount; c++) {
      for (let r = 0; r < blockRowCount; r++) {
        blocks[c][r].visible = true;
      }
    }

    // Reiniciar la velocidad de la pelota
    ballSpeedX = 3;
    ballSpeedY = -3;

    // Remover el evento de reinicio del juego
    document.removeEventListener("keydown", restartGame);

    // Iniciar el juego
    gameStarted = true;
    requestAnimationFrame(gameLoop);
  }
}

// Iniciar el juego
gameLoop();

