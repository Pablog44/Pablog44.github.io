const board = document.getElementById("board");
const scoreElement = document.getElementById("score");
const boardSize = 14;
const hexagons = [];
let snake = [{ x: 7, y: 7 }];
let direction = { x: 0, y: -1 };
let food = { x: 10, y: 10 };
let score = 0;

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

// Actualizar la visualización del tablero
function updateBoard() {
    hexagons.forEach(hex => {
        const x = parseInt(hex.dataset.x);
        const y = parseInt(hex.dataset.y);
        hex.classList.remove("snake", "food");
        if (snake.some(segment => segment.x === x && segment.y === y)) {
            hex.classList.add("snake");
        } else if (food.x === x && food.y === y) {
            hex.classList.add("food");
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

    // Verificar si la serpiente ha colisionado consigo misma
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        alert(`Juego Terminado! Puntuación final: ${score}`);
        snake = [{ x: 7, y: 7 }];
        direction = { x: 0, y: -1 };
        score = 0;
        scoreElement.textContent = score;
        food = { x: 10, y: 10 };
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
    } while (snake.some(segment => segment.x === newFoodPosition.x && segment.y === newFoodPosition.y));
    food = newFoodPosition;
}

function changeDirection(event) {
    const key = event.key;
    switch (key) {
        case "ArrowUp": // Arriba
            direction = { x: 0, y: -1 };
            break;
        case "ArrowDown": // Abajo
            direction = { x: 0, y: 1 };
            break;
        case "ArrowLeft": // Izquierda
            direction = { x: -1, y: 0 };
            break;
        case "ArrowRight": // Derecha
            direction = { x: 1, y: 0 };
            break;
    }
}

function setupTouchControls() {
    document.getElementById("button-up").addEventListener("click", () => direction = { x: 0, y: -1 });
    document.getElementById("button-down").addEventListener("click", () => direction = { x: 0, y: 1 });
    document.getElementById("button-left").addEventListener("click", () => direction = { x: -1, y: 0 });
    document.getElementById("button-right").addEventListener("click", () => direction = { x: 1, y: 0 });
}

// Iniciar el juego
createBoard();
placeFood();
updateBoard();
document.addEventListener("keydown", changeDirection);
setupTouchControls();
setInterval(moveSnake, 300);