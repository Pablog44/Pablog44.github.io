const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gridCount = 25;
const gridSize = canvas.width / gridCount; // Cada celda del grid tiene un tamaño de 20x20 px

let score = 0;
let snake = [{x: 10, y: 10}];
let food = {x: Math.floor(Math.random() * gridCount), y: Math.floor(Math.random() * gridCount)};
let dx = 1;
let dy = 0;
let gameOver = false;

function main() {
    if (gameOver) {
        return showGameOver();
    }

    setTimeout(function onTick() {
        clearCanvas();
        drawFood();
        moveSnake();
        drawSnake();
        checkCollision();
        main();
    }, 100);
}

function clearCanvas() {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
    ctx.fillStyle = 'green';
    for (let cell of snake) {
        ctx.fillRect(cell.x * gridSize, cell.y * gridSize, gridSize, gridSize);
    }
}

function moveSnake() {
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    snake.unshift(head);
    
    if (head.x === food.x && head.y === food.y) {
        score += 1;
        document.getElementById('score').innerHTML = 'Puntuación: ' + score;
        placeFood();
    } else {
        snake.pop();
    }
}

function drawFood() {
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
}

function placeFood() {
    food = {x: Math.floor(Math.random() * gridCount), y: Math.floor(Math.random() * gridCount)};
    if (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        placeFood();
    }
}

function checkCollision() {
    const head = snake[0];
    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
            gameOver = true;
        }
    }
    
    if (head.x < 0 || head.x >= gridCount || head.y < 0 || head.y >= gridCount) {
        gameOver = true;
    }
}

function showGameOver() {
    ctx.fillStyle = 'black';
    ctx.font = '30px Arial';
    ctx.fillText('Game Over', canvas.width / 6, canvas.height / 2);
}

document.addEventListener('keydown', e => {
    switch (e.key) {
        case 'ArrowUp': if (dy === 0) { dx = 0; dy = -1; } break;
        case 'ArrowDown': if (dy === 0) { dx = 0; dy = 1; } break;
        case 'ArrowLeft': if (dx === 0) { dx = -1; dy = 0; } break;
        case 'ArrowRight': if (dx === 0) { dx = 1; dy = 0; } break;
    }
});

main();