let canvas = document.getElementById('gameArea');
let ctx = canvas.getContext('2d');
let box = 20;
let score = 0;
let speed = 10;
let snake = [];
snake[0] = {x: 10 * box, y: 10 * box};
let food = {x: Math.floor(Math.random()*17+1) * box, y: Math.floor(Math.random()*15+3) * box};
let d;
let gameInterval;
let timerInterval;
let playerName;
let scores = JSON.parse(localStorage.getItem('scores')) || Array(21).fill().map(() => []);
let moveMade = false;
let gamepadInterval;

document.addEventListener('keydown', direction);

function direction(event) {
    if(!moveMade){
        let newDirection;
        if((event.keyCode == 37 || event.keyCode == 65) && d != 'RIGHT') newDirection = 'LEFT';  // Arrow Left or 'A'
        else if((event.keyCode == 38 || event.keyCode == 87) && d != 'DOWN') newDirection = 'UP';  // Arrow Up or 'W'
        else if((event.keyCode == 39 || event.keyCode == 68) && d != 'LEFT') newDirection = 'RIGHT';  // Arrow Right or 'D'
        else if((event.keyCode == 40 || event.keyCode == 83) && d != 'UP') newDirection = 'DOWN';  // Arrow Down or 'S'
        else if(event.keyCode == 82) restartGame();  // Reset game with 'R' key

        if(newDirection) {
            d = newDirection;
            moveMade = true;
        }
    }
}


function resetGame() {
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    snake = [];
    snake[0] = {x: 10 * box, y: 10 * box};
    food = {x: Math.floor(Math.random()*17+1) * box, y: Math.floor(Math.random()*15+3) * box};
    d = '';
    score = 0;
    document.getElementById('score').innerHTML = "Score: 0";
    document.getElementById('timer').innerText = "Time: 0s";
    document.getElementById('speedValue').innerText = speed;
    startGame();
}

function startGame() {
    gameInterval = setInterval(draw, 200 - speed * 10);
    let startTime = new Date();
    timerInterval = setInterval(function() {
        let elapsedSeconds = Math.floor((new Date() - startTime) / 1000);
        document.getElementById('timer').innerText = "Time: " + elapsedSeconds + "s";
    }, 1000);

    // Mostrar el botón para elegir la velocidad y la lista de puntajes
    document.getElementById('speed').style.display = 'block';
    document.getElementById('topScores').style.display = 'block';
}

function gameOver() {
    clearInterval(gameInterval);
    clearInterval(timerInterval);
    clearInterval(gamepadInterval);

    // Pide el nombre del jugador
    playerName = prompt("Game Over. Your score is " + score + ". Enter your name for the high score list:");

    // Añadir el puntaje al array de puntajes correspondiente a la velocidad actual
    let currentSpeedScores = scores[speed];
    currentSpeedScores.push({name: playerName, score: score});

    // Ordenar el array de puntajes en orden descendiente
    currentSpeedScores.sort((a, b) => b.score - a.score);

    // Si hay más de 10 puntajes, eliminar el más bajo
    if(currentSpeedScores.length > 10) {
        currentSpeedScores.pop();
    }

    // Guardar el array de puntajes actualizado en localStorage
    localStorage.setItem('scores', JSON.stringify(scores));

    // Mostrar los puntajes altos
    showTopScores();

    // Mostrar el botón de reinicio y esconder el área de juego
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('resetButton').style.display = 'block';
    document.getElementById('topScores').style.display = 'block';
    document.getElementById('speed').style.display = 'block'; // Asegúrate de que el botón de elegir la velocidad también se muestre
}

function drawGrid() {
    for(let i=0; i<=canvas.width; i+=box) {
        ctx.strokeStyle = '#00FF00';
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
}
// Gamepad API
window.addEventListener("gamepadconnected", function(e) {
    console.log("Gamepad connected, index: "+e.gamepad.index);
    gamepadInterval = setInterval(pollGamepad, 100); // Poll every 100ms
});

window.addEventListener("gamepaddisconnected", function(e) {
    console.log("Gamepad disconnected, index: "+e.gamepad.index);
    clearInterval(gamepadInterval);
});

function pollGamepad() {
    let gamepad = navigator.getGamepads()[0];
    if(gamepad) {
        let newDirection;
        if(gamepad.buttons[14].pressed && d != 'RIGHT') newDirection = 'LEFT';  // D-pad Left
        else if(gamepad.buttons[12].pressed && d != 'DOWN') newDirection = 'UP';  // D-pad Up
        else if(gamepad.buttons[15].pressed && d != 'LEFT') newDirection = 'RIGHT';  // D-pad Right
        else if(gamepad.buttons[13].pressed && d != 'UP') newDirection = 'DOWN';  // D-pad Down

        if(newDirection) {
            d = newDirection;
            moveMade = true;
        }
    }
}
  
function draw() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    for(let i = 0; i < snake.length; i++) {
        ctx.fillStyle = (i == 0)? 'blue' : 'green';
        ctx.fillRect(snake[i].x, snake[i].y, box, box);
        ctx.strokeStyle = '#00FF00';
        ctx.strokeRect(snake[i].x, snake[i].y, box, box);
    }

    ctx.fillStyle = 'red';
    ctx.fillRect(food.x, food.y, box, box);  // Draw red square for food

    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    if(d == 'LEFT') snakeX -= box;
    if(d == 'UP') snakeY -= box;
    if(d == 'RIGHT') snakeX += box;
    if(d == 'DOWN') snakeY += box;

    if(snakeX == food.x && snakeY == food.y) {
        score += 5;
        document.getElementById('score').innerHTML = "Score: " + score;
        food = {x: Math.floor(Math.random()*17+1) * box, y: Math.floor(Math.random()*15+3) * box};
    } else {
        snake.pop();
    }

    let newHead = {x: snakeX, y: snakeY};
    moveMade = false;
    
    if(snakeX < 0 || snakeY < 0 || snakeX >= 20 * box || snakeY >= 20 * box || collision(newHead, snake)) {
        gameOver();
        return;
    }
  
    snake.unshift(newHead);  // Add the new head to the snake
}
    


function collision(head, array) {
    for(let i = 0; i < array.length; i++) {
        if(head.x == array[i].x && head.y == array[i].y) return true;
    }
    return false;
}

function showTopScores() {
    console.log("showTopScores function triggered");  // Añade esta línea
    const topScoresDiv = document.getElementById('topScores');
    topScoresDiv.style.display = 'block';
    topScoresDiv.innerHTML = '';
    let currentSpeedScores = scores[speed];
    if(currentSpeedScores.length > 0) {
        let ol = document.createElement('ol');
        for(let i = 0; i < currentSpeedScores.length; i++) {
            let li = document.createElement('li');
            li.innerText = currentSpeedScores[i].name + ": " + currentSpeedScores[i].score;
            ol.appendChild(li);
        }
        topScoresDiv.appendChild(ol);
    } else {
        topScoresDiv.innerText = 'No high scores yet for speed ' + speed;
    }
}


function resetToInitialScreen() {
    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('resetButton').style.display = 'none';  // Esconder el botón de reinicio
    document.getElementById('topScores').style.display = 'none';
    // Restablecer la velocidad y el array de puntajes desde localStorage
    speed = 10;
    scores = JSON.parse(localStorage.getItem('scores')) || Array(21).fill().map(() => []);
    resetGame();
}

// Asociamos la función 'resetToInitialScreen' al evento 'click' del botón 'resetButton'
document.getElementById('resetButton').addEventListener('click', resetToInitialScreen);

// Asociamos la función para reiniciar el juego al evento 'click' del botón 'restartButton'
document.getElementById('restartButton').addEventListener('click', function() {
    document.getElementById('gameArea').style.display = 'block'; // Mostrar el área de juego
    document.getElementById('restartButton').style.display = 'none'; // Esconder el botón de reinicio
    resetGame(); // Reiniciar el juego
});

// Asociamos las funciones para incrementar y decrementar la velocidad a los eventos 'click' de los signos '+' y '-'
document.getElementById('plus').addEventListener('click', function() {
    if(speed < 20) {
        speed++;
        document.getElementById('speedValue').innerText = speed;
        resetGame();
    }
});
document.getElementById('minus').addEventListener('click', function() {
    if(speed > 1) {
        speed--;
        document.getElementById('speedValue').innerText = speed;
        resetGame();
    }
});

// Asociamos la función 'showTopScores' al evento 'click' del botón 'showScoresButton'
document.getElementById('showScoresButton').addEventListener('click', showTopScores);

// Start the game for the first time
startGame();
