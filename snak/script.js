const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreText = document.getElementById('score');
const finalScore = document.getElementById('finalScore');
const startButton = document.getElementById('startButton');
const speedControl = document.getElementById('speed');
const gameOverScreen = document.getElementById('gameOver');
const highScoreText = document.getElementById('highScore');

const upButton = document.getElementById('upButton');
const downButton = document.getElementById('downButton');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');

const grid = 20;
let count = 0;
let score = 0;
let snake = [];
let apple = { x: 0, y: 0 };
let dx = grid;
let dy = 0;
let speed = 5;

async function loadHighScore(level) {
    const q = query(
        collection(db, "highscores"),
        where("level", "==", parseInt(level, 10)),
        orderBy("score", "desc"),
        limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const highScore = querySnapshot.docs[0].data().score;
        highScoreText.textContent = highScore;
    } else {
        highScoreText.textContent = 0;
    }
}

function gameLoop() {
    if (count < speed) {
        count++;
        requestAnimationFrame(gameLoop);
        return;
    }
    count = 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    moveSnake();
    drawApple();
    drawSnake();

    if (checkCollision()) {
        gameOver();
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    if (snake[0].x === apple.x && snake[0].y === apple.y) {
        score += 10;
        scoreText.textContent = score;
        placeApple();
    } else {
        snake.pop();
    }
}

function checkCollision() {
    for (let i = 4; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
            return true;
        }
    }
    const hitLeftWall = snake[0].x < 0;
    const hitRightWall = snake[0].x > canvas.width - grid;
    const hitTopWall = snake[0].y < 0;
    const hitBottomWall = snake[0].y > canvas.height - grid;
    return hitLeftWall || hitRightWall || hitTopWall || hitBottomWall;
}

function drawSnake() {
    ctx.fillStyle = 'lime';
    snake.forEach(part => {
        ctx.fillRect(part.x, part.y, grid - 1, grid - 1);
    });
}

function drawApple() {
    ctx.fillStyle = 'red';
    ctx.fillRect(apple.x, apple.y, grid - 1, grid - 1);
}

function placeApple() {
    apple = {
        x: Math.floor(Math.random() * (canvas.width / grid)) * grid,
        y: Math.floor(Math.random() * (canvas.height / grid)) * grid
    };
    if (snake.some(part => part.x === apple.x && part.y === apple.y)) {
        placeApple();
    }
}

function startGame() {
    speed = parseInt(speedControl.value, 10);
    speed = 11 - speed;
    snake = [
        { x: 160, y: 160 },
        { x: 140, y: 160 },
        { x: 120, y: 160 },
        { x: 100, y: 160 }
    ];
    dx = grid;
    dy = 0;
    score = 0;
    scoreText.textContent = score;
    gameOverScreen.style.display = 'none';
    placeApple();
    loadHighScore(speedControl.value);
    gameLoop();
}

function gameOver() {
    finalScore.textContent = score;
    gameOverScreen.style.display = 'block';
    saveHighScore(score, speedControl.value);
}

startButton.addEventListener('click', startGame);

document.addEventListener('keydown', function (e) {
    e.preventDefault(); // Evitar el desplazamiento de la página con las teclas de flecha
    if (e.key === "ArrowLeft" && dx === 0) {
        dx = -grid;
        dy = 0;
    } else if (e.key === "ArrowUp" && dy === 0) {
        dx = 0;
        dy = -grid;
    } else if (e.key === "ArrowRight" && dx === 0) {
        dx = grid;
        dy = 0;
    } else if (e.key === "ArrowDown" && dy === 0) {
        dx = 0;
        dy = grid;
    }
});

upButton.addEventListener('click', () => {
    if (dy === 0) {
        dx = 0;
        dy = -grid;
    }
});

downButton.addEventListener('click', () => {
    if (dy === 0) {
        dx = 0;
        dy = grid;
    }
});

leftButton.addEventListener('click', () => {
    if (dx === 0) {
        dx = -grid;
        dy = 0;
    }
});

rightButton.addEventListener('click', () => {
    if (dx === 0) {
        dx = grid;
        dy = 0;
    }
});
