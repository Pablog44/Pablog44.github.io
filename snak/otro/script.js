const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const gameOverDisplay = document.getElementById('game-over');

const gridSize = 25;
const cellSize = 20;

let snake = [
    {x: 10, y: 10},
    {x: 9, y: 10},
    {x: 8, y: 10}
];
let direction = 'RIGHT';
let food = getRandomFoodPosition();
let score = 0;
let gameInterval;

document.addEventListener('keydown', changeDirection);

function startGame() {
    gameInterval = setInterval(update, 100);
}

function update() {
    moveSnake();
    if (isGameOver()) {
        clearInterval(gameInterval);
        gameOverDisplay.style.display = 'block';
        return;
    }
    if (hasEatenFood()) {
        score++;
        scoreDisplay.innerText = `Puntuación: ${score}`;
        food = getRandomFoodPosition();
    } else {
        snake.pop();
    }
    drawGame();
}

function drawGame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'lime';
    snake.forEach(cell => {
        ctx.fillRect(cell.x * cellSize, cell.y * cellSize, cellSize, cellSize);
    });

    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
}

function moveSnake() {
    const head = {...snake[0]};
    if (direction === 'RIGHT') head.x += 1;
    else if (direction === 'LEFT') head.x -= 1;
    else if (direction === 'UP') head.y -= 1;
    else if (direction === 'DOWN') head.y += 1;
    snake.unshift(head);
}

function changeDirection(event) {
    if (event.key === 'ArrowRight' && direction !== 'LEFT') direction = 'RIGHT';
    else if (event.key === 'ArrowLeft' && direction !== 'RIGHT') direction = 'LEFT';
    else if (event.key === 'ArrowUp' && direction !== 'DOWN') direction = 'UP';
    else if (event.key === 'ArrowDown' && direction !== 'UP') direction = 'DOWN';
}

function isGameOver() {
    const head = snake[0];
    if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) return true;
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) return true;
    }
    return false;
}

function hasEatenFood() {
    const head = snake[0];
    return head.x === food.x && head.y === food.y;
}

function getRandomFoodPosition() {
    let position;
    do {
        position = {
            x: Math.floor(Math.random() * gridSize),
            y: Math.floor(Math.random() * gridSize)
        };
    } while (snake.some(cell => cell.x === position.x && cell.y === position.y));
    return position;
}

// Iniciar el juego
startGame();