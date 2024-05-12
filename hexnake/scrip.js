const board = document.getElementById("board");
const scoreElement = document.getElementById("score");
const boardSize = 14;
const hexagons = [];
let snake = [
    { x: 7, y: 1 },
    { x: 8, y: 1 },
    { x: 9, y: 1 }
];
let direction = { x: -1, y: 0 };
let food;
let score = 0;
const obstacleSize = 3;
const obstacleStartX = Math.floor((boardSize - obstacleSize) / 2);
const obstacleStartY = Math.floor((boardSize - obstacleSize) / 2);
const obstacles = createObstacles();

// Crear la parrilla hexagonal
function createBoard() {
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const hex = document.createElement("div");
            hex.classList.add("hexagon");
            hex.dataset.x = col;
            hex.dataset.y = row;
            board.appendChild(hex);
            hexagons.push(hex);
        }
    }
    updateBoard();
}

// Crear los obstáculos centrales
function createObstacles() {
    const obstaclePositions = [];
    for (let row = obstacleStartY; row < obstacleStartY + obstacleSize; row++) {
        for (let col = obstacleStartX; col < obstacleStartX + obstacleSize; col++) {
            obstaclePositions.push({ x: col, y: row });
        }
    }
    return obstaclePositions;
}

// Actualizar la visualización del tablero
function updateBoard() {
    hexagons.forEach(hex => {
        const x = parseInt(hex.dataset.x);
        const y = parseInt(hex.dataset.y);
        hex.classList.remove("snake", "food", "obstacle");
        if (snake.some(segment => segment.x === x && segment.y === y)) {
            hex.classList.add("snake");
        } else if (food && food.x === x && food.y === y) {
            hex.classList.add("food");
        } else if (obstacles.some(obstacle => obstacle.x === x && obstacle.y === y)) {
            hex.classList.add("obstacle");
        }
    });
}

function moveSnake() {
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Wrap-around del tablero
    if (head.x < 0) head.x = boardSize - 1;
    if (head.x >= boardSize) head.x = 0;
    if (head.y < 0) head.y = boardSize - 1;
    if (head.y >= boardSize) head.y = 0;

    // Verificar si la serpiente ha colisionado consigo misma o con un obstáculo
    if (snake.some(segment => segment.x === head.x && segment.y === head.y) ||
        obstacles.some(obstacle => obstacle.x === head.x && obstacle.y === head.y)) {
        alert(`Juego Terminado! Puntuación final: ${score}`);
        // Reposicionar la serpiente fuera del obstáculo
        snake = [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 }
        ];
        direction = { x: 1, y: 0 };
        score = 0;
        scoreElement.textContent = score;
        placeFood();
        updateBoard();
        return;
    }

    snake.unshift(head);

    // Comprobar si la serpiente come la comida
    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreElement.textContent = score;
        placeFood();
    } else {
        snake.pop();
    }

    updateBoard();
}

function placeFood() {
    let newFoodPosition;
    do {
        newFoodPosition = {
            x: Math.floor(Math.random() * boardSize),
            y: Math.floor(Math.random() * boardSize)
        };
    } while (
        snake.some(segment => segment.x === newFoodPosition.x && segment.y === newFoodPosition.y) ||
        obstacles.some(obstacle => obstacle.x === newFoodPosition.x && obstacle.y === newFoodPosition.y)
    );
    food = newFoodPosition;
}

function changeDirection(event) {
    const key = event.key;
    switch (key) {
        case "ArrowUp": // Arriba
            if (direction.y === 0) direction = { x: 0, y: -1 };
            break;
        case "ArrowDown": // Abajo
            if (direction.y === 0) direction = { x: 0, y: 1 };
            break;
        case "ArrowLeft": // Izquierda
            if (direction.x === 0) direction = { x: -1, y: 0 };
            break;
        case "ArrowRight": // Derecha
            if (direction.x === 0) direction = { x: 1, y: 0 };
            break;
    }
}

function setupTouchControls() {
    document.getElementById("button-up").addEventListener("click", () => {
        if (direction.y === 0) direction = { x: 0, y: -1 };
    });
    document.getElementById("button-down").addEventListener("click", () => {
        if (direction.y === 0) direction = { x: 0, y: 1 };
    });
    document.getElementById("button-left").addEventListener("click", () => {
        if (direction.x === 0) direction = { x: -1, y: 0 };
    });
    document.getElementById("button-right").addEventListener("click", () => {
        if (direction.x === 0) direction = { x: 1, y: 0 };
    });
}

// Iniciar el juego
createBoard();
placeFood();
updateBoard();
document.addEventListener("keydown", changeDirection);
setupTouchControls();
setInterval(moveSnake, 300);