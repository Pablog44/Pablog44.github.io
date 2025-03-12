let canvas = document.getElementById('gameCanvas');
canvas.width = window.innerWidth;  // Establecer el ancho del canvas igual al ancho de la ventana
canvas.height = window.innerHeight;  // Establecer la altura del canvas igual a la altura de la ventana

let ctx = canvas.getContext('2d');
let mouse = { x: 0, y: 0 };

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 10,
    height: 20,
    rotation: 0,
    speed: 2
};

let bullets = [];
let bulletSpeed = 5;
let score = 0;

let enemies = [];
let enemySpeed = 2;

// Arrays para las estrellas en distintas capas
let stars = [[], [], []];
let starSpeeds = [1, 2, 3];  
let starColors = ['#FFFF00', '#FFFF33', '#FFFF66'];

let keys = {
    up: false,
    down: false,
    left: false,
    right: false
};

// Agregar estrellas iniciales
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

canvas.addEventListener('mousemove', function(e) {
    let rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    player.rotation = Math.atan2(mouse.y - player.y, mouse.x - player.x);
});

window.addEventListener('keydown', function(e) {
    switch(e.key) {
        case 'w': keys.up = true; break;
        case 'a': keys.left = true; break;
        case 's': keys.down = true; break;
        case 'd': keys.right = true; break;
    }
});

function pollGamepad() {
    let gamepad = navigator.getGamepads()[0]; // Considera el primer gamepad conectado
    if (gamepad) {
        // Joystick derecho para apuntar (asumiendo que axes[2] y axes[3] son los ejes del joystick derecho)
        player.rotation = Math.atan2(gamepad.axes[3], gamepad.axes[2]);

        // Joystick izquierdo para moverse (asumiendo que axes[0] y axes[1] son los ejes del joystick izquierdo)
        player.x += gamepad.axes[0] * player.speed;
        player.y += gamepad.axes[1] * player.speed;

        // Botón 'RB' para disparar (asumiendo que buttons[5] es el botón 'RB')
        if (gamepad.buttons[5].pressed) {
            let bullet = {
                x: player.x,
                y: player.y,
                vx: bulletSpeed * Math.cos(player.rotation),
                vy: bulletSpeed * Math.sin(player.rotation)
            };
            bullets.push(bullet);
        }
    }
}

window.addEventListener('keyup', function(e) {
    switch(e.key) {
        case 'w': keys.up = false; break;
        case 'a': keys.left = false; break;
        case 's': keys.down = false; break;
        case 'd': keys.right = false; break;
    }
});

canvas.addEventListener('mousemove', function(e) {
    let rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;
    player.rotation = Math.atan2(mouseY - player.y, mouseX - player.x);
});

canvas.addEventListener('click', function(e) {
    let bullet = {
        x: player.x,
        y: player.y,
        vx: bulletSpeed * Math.cos(player.rotation),
        vy: bulletSpeed * Math.sin(player.rotation)
    };
    bullets.push(bullet);
});

// Generar enemigos cada 2 segundos
setInterval(function() {
    let enemy = {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        width: 10,
        height: 20
    };
    enemies.push(enemy);
}, 2000);

function resetGame() {
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 10,
        height: 20,
        rotation: 0,
        speed: 2
    };

    bullets = [];
    enemies = [];
    score = 0;
    
    keys = {
        up: false,
        down: false,
        left: false,
        right: false
    };
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar y mover las estrellas
    for (let i = 0; i < stars.length; i++) {
        ctx.fillStyle = starColors[i];
        for (let j = 0; j < stars[i].length; j++) {
            let star = stars[i][j];
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
            star.x -= starSpeeds[i];
            // Si la estrella ha salido de la pantalla, se elimina y se agrega una nueva en el lado derecho
            if (star.x < 0) {
                stars[i].splice(j, 1);
                let newStar = {
                    x: canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * 2,
                };
                stars[i].push(newStar);
            }
        }
    }

    let dx = mouse.x - player.x;
    let dy = mouse.y - player.y;
    let distanceToMouse = Math.sqrt(dx * dx + dy * dy);
    if (distanceToMouse > 50) {  // Si el jugador no está "cerca" del cursor
        let angleToMouse = Math.atan2(dy, dx);
        player.x += player.speed * Math.cos(angleToMouse);
        player.y += player.speed * Math.sin(angleToMouse);
    }

    pollGamepad(); 

    if (keys.up) player.y -= player.speed;
    if (keys.down) player.y += player.speed;
    if (keys.left) player.x -= player.speed;
    if (keys.right) player.x += player.speed;

    // Dibujar jugador
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);
    ctx.fillStyle = '#00f';
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    // Dibujar rectángulos adicionales para el jugador
    ctx.fillRect(-player.width / 2 - 4, -player.height / 2, 10, 2);
    ctx.fillRect(-player.width / 2 - 4, player.height / 2, 10, 2);
    ctx.fillRect(player.width / 2 - 4, -player.height / 2, 10, 2);
    ctx.fillRect(player.width / 2 - 4, player.height / 2, 10, 2);
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Actualizar y dibujar balas
    bullets.forEach(function(bullet, i) {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Colisión bala-enemigo
        enemies.forEach(function(enemy, j) {
            let dx = enemy.x - bullet.x;
            let dy = enemy.y - bullet.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < enemy.width / 2) {
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                score++;
            }
        });
    });

    // Actualizar y dibujar enemigos con IA mejorada
    enemies.forEach(function(enemy, index) {
        // Vector de persecución hacia el jugador
        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;
        let distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        let pursuitX = dx / distanceToPlayer;
        let pursuitY = dy / distanceToPlayer;

        // Vector de separación respecto a otros enemigos
        let separationX = 0;
        let separationY = 0;
        let separationThreshold = 30;  // Umbral para evitar agrupación
        let count = 0;
        enemies.forEach(function(other, j) {
            if (j !== index) {
                let diffX = enemy.x - other.x;
                let diffY = enemy.y - other.y;
                let dist = Math.sqrt(diffX * diffX + diffY * diffY);
                if (dist < separationThreshold && dist > 0) {
                    separationX += diffX / dist;
                    separationY += diffY / dist;
                    count++;
                }
            }
        });
        if (count > 0) {
            separationX /= count;
            separationY /= count;
        }

        // Combinar las fuerzas de persecución y separación
        let separationWeight = 0.5;  // Ajusta este valor para modificar la fuerza de separación
        let moveX = pursuitX + separationWeight * separationX;
        let moveY = pursuitY + separationWeight * separationY;

        // Normalizar el vector resultante
        let magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
        if (magnitude > 0) {
            moveX /= magnitude;
            moveY /= magnitude;
        }

        enemy.x += enemySpeed * moveX;
        enemy.y += enemySpeed * moveY;

        // Calcular el ángulo para dibujar al enemigo (mirando hacia el jugador)
        let enemyAngle = Math.atan2(moveY, moveX);

        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(enemyAngle + Math.PI);
        ctx.fillStyle = '#f00';
        ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        // Dibujar rectángulos adicionales para el enemigo
        ctx.fillRect(-enemy.width / 2 - 4, -enemy.height / 2, 10, 2);
        ctx.fillRect(enemy.width / 2 - 4, -enemy.height / 2, 10, 2);
        ctx.fillRect(-enemy.width / 2 - 4, enemy.height / 2, 10, 2);
        ctx.fillRect(enemy.width / 2 - 4, enemy.height / 2, 10, 2);
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Colisión jugador-enemigo
        let pdx = player.x - enemy.x;
        let pdy = player.y - enemy.y;
        let pdistance = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pdistance < player.width / 2) {
            alert('Game Over');
            resetGame();
        }
    });

    // Mostrar la puntuación
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Score: " + score, 8, 20);
    
    requestAnimationFrame(gameLoop);
}

gameLoop();
