// --- DOM Elements ---
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const onePlayerBtn = document.getElementById('one-player-btn');
const twoPlayersBtn = document.getElementById('two-players-btn');
const player1Viewport = document.getElementById('player1-viewport');
const player2Viewport = document.getElementById('player2-viewport');
const canvas1 = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
const hud1 = document.getElementById('hud1');
const hud2 = document.getElementById('hud2');
const gamepadStatus = document.getElementById('gamepad-status');
const gamepadList = document.getElementById('gamepad-list');

// --- Game Contexts ---
const ctx1 = canvas1.getContext('2d');
const ctx2 = canvas2.getContext('2d');

// --- Game State ---
let numPlayers = 1;
let gameRunning = false;
let animationFrameId;
let connectedGamepads = {};

// --- Game Constants ---
const CAR_WIDTH = 20;
const CAR_HEIGHT = 10;
const ACCELERATION = 0.1;
const BRAKING = 0.15;
const REVERSE_ACCELERATION = 0.05;
const MAX_SPEED = 5;
const MAX_REVERSE_SPEED = -2;
const TURN_SPEED = 0.05; // radians
const FRICTION = 0.02;
const TRACK_COLOR = '#404040'; // Gris oscuro para el borde
const GRASS_COLOR = '#5a8a5a'; // Verde para el exterior/interior

// --- Car Objects ---
let cars = [];

// --- Track Definition (simple oval) ---
let trackCenterX, trackCenterY, trackWidth, trackHeight, trackThickness;

// --- Input State ---
let inputs = [
    { accelerate: false, brake: false, left: false, right: false }, // Player 1
    { accelerate: false, brake: false, left: false, right: false }  // Player 2
];

// --- Lap Counting ---
const FINISH_LINE_X = () => trackCenterX; // Center X
const FINISH_LINE_Y_START = () => trackCenterY - trackHeight / 2 - trackThickness / 2;
const FINISH_LINE_Y_END = () => trackCenterY - trackHeight / 2 + trackThickness / 2;
const FINISH_LINE_WIDTH = 5;

// ----------------------------------------
// --- Initialization and Setup ---
// ----------------------------------------

function setupCanvas(canvas, ctx) {
    // Ajustar tamaño del canvas al contenedor
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Actualizar dimensiones de la pista
    trackWidth = canvas.width / dpr * 0.7;
    trackHeight = canvas.height / dpr * 0.4;
    trackThickness = 60;
    trackCenterX = canvas.width / dpr / 2;
    trackCenterY = canvas.height / dpr / 2;
}

function setupCanvases() {
    setupCanvas(canvas1, ctx1);
    if (numPlayers === 2) {
        setupCanvas(canvas2, ctx2);
    }
}

function initCar(playerIndex, color) {
    return {
        x: trackCenterX,
        y: trackCenterY - trackHeight / 2, // Start near finish line
        angle: 0, // Pointing right
        speed: 0,
        color: color,
        playerIndex: playerIndex,
        lap: 0,
        onFinishLineHalf: false // For lap counting logic
    };
}

function initGame() {
    console.log(`Iniciando juego con ${numPlayers} jugador(es)`);
    startScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    if (numPlayers === 1) {
        gameScreen.classList.add('single-player');
        gameScreen.classList.remove('two-players');
        player2Viewport.classList.add('hidden');
    } else {
        gameScreen.classList.remove('single-player');
        gameScreen.classList.add('two-players');
        player2Viewport.classList.remove('hidden');
    }

    setupCanvases(); // Setup canvas sizes

    // Initialize cars
    cars = [];
    cars.push(initCar(0, 'red')); // Player 1 car
    hud1.textContent = `Vueltas P1: 0`;
    if (numPlayers === 2) {
        cars.push(initCar(1, 'blue')); // Player 2 car
        // Slightly offset P2 start position
        cars[1].y += CAR_HEIGHT * 1.5;
        hud2.textContent = `Vueltas P2: 0`;
    }

    gameRunning = true;
    gameLoop(); // Start the main game loop
}

// ----------------------------------------
// --- Gamepad Handling ---
// ----------------------------------------

function updateGamepadStatus() {
    connectedGamepads = {};
    const gamepads = navigator.getGamepads();
    let listHTML = '';
    let foundP1 = false;
    let foundP2 = false;

    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp) {
            connectedGamepads[gp.index] = gp;
            listHTML += `<li>Gamepad ${gp.index}: ${gp.id} ${gp.connected ? '(Conectado)' : '(Desconectado)'}</li>`;
            if (i === 0) foundP1 = true;
            if (i === 1) foundP2 = true;
        }
    }
    gamepadList.innerHTML = listHTML || '<li>No hay gamepads conectados</li>';

    // Habilitar/Deshabilitar botones según gamepads conectados
    onePlayerBtn.disabled = !foundP1;
    twoPlayersBtn.disabled = !(foundP1 && foundP2);
    if (!foundP1) gamepadStatus.querySelector('p').textContent = "Conecta al menos un gamepad.";
    else if (!foundP2 && numPlayers === 2) gamepadStatus.querySelector('p').textContent = "Conecta un segundo gamepad para 2 jugadores.";
    else gamepadStatus.querySelector('p').textContent = "Gamepads detectados:";

}

function handleGamepadInput() {
    const gamepads = navigator.getGamepads();

    // Reset inputs
    inputs.forEach(input => {
        input.accelerate = false;
        input.brake = false;
        input.left = false;
        input.right = false;
    });

    for (let i = 0; i < numPlayers; i++) {
        const gp = gamepads[i]; // Assume P1 = index 0, P2 = index 1
        if (gp && gp.connected) {
            // --- Acceleration / Braking ---
            // Use triggers (axes 7 and 6 often) or buttons
            const accelerateButton = gp.buttons[7] || gp.buttons[0]; // RT or A (XInput mapping)
            const brakeButton = gp.buttons[6] || gp.buttons[1];    // LT or B (XInput mapping)

            if (accelerateButton) inputs[i].accelerate = accelerateButton.pressed || accelerateButton.value > 0.1;
            if (brakeButton) inputs[i].brake = brakeButton.pressed || brakeButton.value > 0.1;

            // --- Steering ---
            // Use left stick horizontal axis (axis 0) or D-Pad buttons
            const steerAxis = gp.axes[0];
            const dpadLeft = gp.buttons[14];
            const dpadRight = gp.buttons[15];

            if (steerAxis < -0.3 || (dpadLeft && dpadLeft.pressed)) {
                inputs[i].left = true;
            } else if (steerAxis > 0.3 || (dpadRight && dpadRight.pressed)) {
                inputs[i].right = true;
            }
        }
         // --- Keyboard Fallback (Optional, for testing) ---
         else if (i === 0) { // Player 1 Keyboard
            // inputs[i].accelerate = keys['ArrowUp'] || false;
            // inputs[i].brake = keys['ArrowDown'] || false;
            // inputs[i].left = keys['ArrowLeft'] || false;
            // inputs[i].right = keys['ArrowRight'] || false;
         } else if (i === 1) { // Player 2 Keyboard
            // inputs[i].accelerate = keys['w'] || false;
            // inputs[i].brake = keys['s'] || false;
            // inputs[i].left = keys['a'] || false;
            // inputs[i].right = keys['d'] || false;
         }
    }
}

// Listen for gamepad connection/disconnection
window.addEventListener("gamepadconnected", (event) => {
    console.log("Gamepad conectado en índice %d: %s.", event.gamepad.index, event.gamepad.id);
    updateGamepadStatus();
});

window.addEventListener("gamepaddisconnected", (event) => {
    console.log("Gamepad desconectado del índice %d: %s.", event.gamepad.index, event.gamepad.id);
    delete connectedGamepads[event.gamepad.index];
    updateGamepadStatus();
});

// Initial check
updateGamepadStatus();


// ----------------------------------------
// --- Game Logic ---
// ----------------------------------------

function updateCar(car, input) {
    // Apply Friction
    if (car.speed > 0) {
        car.speed -= FRICTION;
        if (car.speed < 0) car.speed = 0;
    } else if (car.speed < 0) {
        car.speed += FRICTION;
        if (car.speed > 0) car.speed = 0;
    }

    // Acceleration / Braking
    if (input.accelerate) {
        car.speed += ACCELERATION;
    }
    if (input.brake) {
        if (car.speed > 0) {
            car.speed -= BRAKING; // Braking forward speed
        } else {
            car.speed -= REVERSE_ACCELERATION; // Accelerating in reverse
        }
    }

    // Clamp Speed
    if (car.speed > MAX_SPEED) car.speed = MAX_SPEED;
    if (car.speed < MAX_REVERSE_SPEED) car.speed = MAX_REVERSE_SPEED;

    // Steering (only when moving)
    if (Math.abs(car.speed) > 0.1) {
         // Reduce turning ability at higher speeds slightly (optional)
        const turnFactor = 1 - Math.abs(car.speed) / (MAX_SPEED * 2);
        if (input.left) {
            car.angle -= TURN_SPEED * turnFactor * (car.speed > 0 ? 1 : -1); // Invert steer in reverse
        }
        if (input.right) {
            car.angle += TURN_SPEED * turnFactor * (car.speed > 0 ? 1 : -1); // Invert steer in reverse
        }
    }


    // Update Position
    car.x += car.speed * Math.cos(car.angle);
    car.y += car.speed * Math.sin(car.angle);

    // --- Lap Counting Logic ---
    const flX = FINISH_LINE_X();
    const flY1 = FINISH_LINE_Y_START();
    const flY2 = FINISH_LINE_Y_END();

    // Check if car is near the finish line vertically and moving right-ish
    if (car.y > flY1 && car.y < flY2 && Math.cos(car.angle) > 0.1) {
        const crossedFinishLine = car.x > flX && car.x - car.speed * Math.cos(car.angle) <= flX; // Check precise crossing
        const isOnRightHalf = car.x > flX; // Is the car past the line?

        if (crossedFinishLine && car.onFinishLineHalf) {
             car.lap++;
             console.log(`Player ${car.playerIndex + 1} completed lap ${car.lap}`);
             if(car.playerIndex === 0) hud1.textContent = `Vueltas P1: ${car.lap}`;
             else hud2.textContent = `Vueltas P2: ${car.lap}`;
             car.onFinishLineHalf = false; // Reset for next lap
        } else if (isOnRightHalf) {
             // Mark that the car is on the far side, ready to complete lap on next pass
             car.onFinishLineHalf = true;
        }
    }
     // Reset flag if they move far away from the line vertically or start going left
     if (car.y < flY1 - 20 || car.y > flY2 + 20 || Math.cos(car.angle) < -0.1) {
         // car.onFinishLineHalf = false; // Only reset when crossing back? Need careful logic.
         // For simplicity, let's assume they won't reverse over the line perfectly.
     }


    // --- Basic Track Boundaries (Optional - keep cars loosely contained) ---
    // This is very basic, just pushes them back towards center if they go too far
    const outerRadiusX = trackWidth / 2 + trackThickness;
    const outerRadiusY = trackHeight / 2 + trackThickness;
    const innerRadiusX = trackWidth / 2;
    const innerRadiusY = trackHeight / 2;

    const dx = car.x - trackCenterX;
    const dy = car.y - trackCenterY;
    const distance = Math.sqrt(dx*dx + dy*dy);

    // Crude check - needs improvement for oval shape
    // if (distance > outerRadiusX || distance < innerRadiusX * 0.8 ) {
    //      car.speed *= 0.5; // Slow down if off track
    // }
}


// ----------------------------------------
// --- Drawing ---
// ----------------------------------------

function drawOvalTrack(ctx, canvasWidth, canvasHeight) {
    const halfThickness = trackThickness / 2;

    // Outer bounds (for grass)
    ctx.fillStyle = GRASS_COLOR;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Track Path
    ctx.fillStyle = TRACK_COLOR;
    ctx.strokeStyle = '#fff'; // White lines
    ctx.lineWidth = 2;

    ctx.beginPath();
    // Outer ellipse path
    ctx.ellipse(trackCenterX, trackCenterY, trackWidth / 2 + halfThickness, trackHeight / 2 + halfThickness, 0, 0, Math.PI * 2);
    // Inner ellipse path (for hole)
    ctx.ellipse(trackCenterX, trackCenterY, trackWidth / 2 - halfThickness, trackHeight / 2 - halfThickness, 0, 0, Math.PI * 2);
    ctx.fill("evenodd"); // Fill between the two paths

    // Draw center lines (optional dashed line)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]); // Dashed line pattern
    ctx.beginPath();
    ctx.ellipse(trackCenterX, trackCenterY, trackWidth / 2, trackHeight / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash pattern

    // Draw Finish Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = FINISH_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(FINISH_LINE_X(), FINISH_LINE_Y_START());
    ctx.lineTo(FINISH_LINE_X(), FINISH_LINE_Y_END());
    ctx.stroke();
}

function drawCar(ctx, car) {
    ctx.save(); // Save context state
    ctx.translate(car.x, car.y); // Move origin to car position
    ctx.rotate(car.angle); // Rotate context
    ctx.fillStyle = car.color;
    ctx.fillRect(-CAR_WIDTH / 2, -CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT); // Draw car centered

    // Draw a small triangle at the front for direction
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.moveTo(CAR_WIDTH / 2, 0); // Tip of triangle
    ctx.lineTo(CAR_WIDTH / 4, -CAR_HEIGHT / 3);
    ctx.lineTo(CAR_WIDTH / 4, CAR_HEIGHT / 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore(); // Restore context state
}

function drawGame(ctx, canvas) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Use the actual pixel dimensions

    // Draw Track
    drawOvalTrack(ctx, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));

    // Draw Cars
    cars.forEach(car => {
        drawCar(ctx, car);
    });
}


// ----------------------------------------
// --- Main Game Loop ---
// ----------------------------------------

function gameLoop(timestamp) {
    if (!gameRunning) return;

    // 1. Handle Input
    handleGamepadInput();

    // 2. Update Game State
    cars.forEach((car, index) => {
        updateCar(car, inputs[index]);
    });

    // 3. Render
    drawGame(ctx1, canvas1);
    if (numPlayers === 2) {
        drawGame(ctx2, canvas2);
    }

    // Request next frame
    animationFrameId = requestAnimationFrame(gameLoop);
}

// ----------------------------------------
// --- Event Listeners ---
// ----------------------------------------

onePlayerBtn.addEventListener('click', () => {
    numPlayers = 1;
    initGame();
});

twoPlayersBtn.addEventListener('click', () => {
    numPlayers = 2;
    initGame();
});

// Handle window resizing
window.addEventListener('resize', () => {
    if (gameRunning) {
        // Re-setup canvases which also recalculates track dimensions
        setupCanvases();
        // Redraw immediately after resize
        drawGame(ctx1, canvas1);
         if (numPlayers === 2) {
            drawGame(ctx2, canvas2);
        }
    }
});

// --- Keyboard Input Handling (Optional Fallback) ---
/*
let keys = {};
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);
*/

// --- Stop game loop if tab/window loses focus (optional) ---
// document.addEventListener('visibilitychange', () => {
//     if (document.hidden && gameRunning) {
//         cancelAnimationFrame(animationFrameId);
//         // Optionally pause game state here
//     } else if (!document.hidden && gameRunning) {
//         // Optionally resume game state here
//         animationFrameId = requestAnimationFrame(gameLoop);
//     }
// });