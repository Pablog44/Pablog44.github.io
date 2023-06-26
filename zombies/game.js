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

// Agregar arrays para las estrellas
let stars = [[], [], []];
let starSpeeds = [1, 2, 3];  // Las velocidades de las tres capas de estrellas
let starColors = ['#FFFF00', '#FFFF33', '#FFFF66'];  // Los colores de las tres capas de estrellas

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
            radius: Math.random() * 2,  // Radio de la estrella
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

// Spawn enemies every 2 seconds
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
        speed: 2  // Reinicia la velocidad del jugador
    };

    bullets = [];
    enemies = [];
    score = 0;  // Reinicia la puntuación
    
    // Reinicia el estado de las teclas WASD
    keys = {
        w: false,  // up
        a: false,  // left
        s: false,  // down
        d: false  // right
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
            
            // Si la estrella ha salido de la pantalla
            if (star.x < 0) {
                stars[i].splice(j, 1);
                // Agregar una nueva estrella en el lado derecho
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

    if (distanceToMouse > 50) {  // Si el jugador no está "cerca" del cursor del ratón
        let angleToMouse = Math.atan2(dy, dx);
        player.x += player.speed * Math.cos(angleToMouse);
        player.y += player.speed * Math.sin(angleToMouse);
    }

    pollGamepad(); 

    if (keys.up) player.y -= player.speed;
    if (keys.down) player.y += player.speed;
    if (keys.left) player.x -= player.speed;
    if (keys.right) player.x += player.speed;
    ctx.save();  // Guarda el contexto actual
    ctx.translate(player.x, player.y);  // Cambia el origen del contexto al centro del jugador
    ctx.rotate(player.rotation);  // Rota el contexto alrededor del nuevo origen
    ctx.fillStyle = '#00f';  // Establece el color de relleno a azul
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);  // Dibuja el rectángulo principal del jugador
    
    // Añadir dos rectángulos azules al jugador
    ctx.fillRect(-player.width / 2 - 4, -player.height / 2 , 10, 2);  // Dibuja un rectángulo en la parte superior del rectángulo principal
    ctx.fillRect(-player.width / 2 - 4, player.height / 2 , 10, 2);  // Dibuja un rectángulo en la parte inferior del rectángulo principal
    ctx.fillRect(player.width / 2 - 4, -player.height / 2, 10, 2);
    ctx.fillRect(player.width / 2 - 4, player.height / 2, 10, 2);
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();  // Restaura el contexto a su estado original (antes del save)

    bullets.forEach(function(bullet, i) {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Bullet-enemy collision
        enemies.forEach(function(enemy, j) {
            let dx = enemy.x - bullet.x;
            let dy = enemy.y - bullet.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < enemy.width / 2) {
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                score++;  // Incrementa la puntuación
            }
        });
    });

    enemies.forEach(function(enemy) {
        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;
        let angle = Math.atan2(dy, dx);
        enemy.x += enemySpeed * Math.cos(angle);
        enemy.y += enemySpeed * Math.sin(angle);

        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.rotate(angle + Math.PI);
        ctx.fillStyle = '#f00';
        ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
        // Añadir dos rectángulos azules al enemigo
        ctx.fillRect(-enemy.width / 2 - 4, -enemy.height / 2, 10, 2);
        ctx.fillRect(enemy.width / 2 - 4, -enemy.height / 2, 10, 2);
        ctx.fillRect(-enemy.width / 2 - 4, enemy.height / 2 , 10, 2);
        ctx.fillRect(enemy.width / 2 - 4, enemy.height / 2, 10, 2);
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    
 

        // Player-enemy collision
        let pdx = player.x - enemy.x;
        let pdy = player.y - enemy.y;
        let pdistance = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pdistance < player.width / 2) {
            alert('Game Over');
            resetGame();
        }
    });
    // Muestra la puntuación
    ctx.font = "16px Arial";
    ctx.fillStyle = "#0095DD";
    ctx.fillText("Score: " + score, 8, 20);
    
    requestAnimationFrame(gameLoop);
}

gameLoop();
