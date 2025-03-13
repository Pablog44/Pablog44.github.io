// game.js
let canvas = document.getElementById('gameCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let ctx = canvas.getContext('2d');
let mouse = { x: 0, y: 0 };

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 10,
    height: 20,
    rotation: 0,
    speed: 4
};

let bullets = [];
let enemyBullets = [];
let bulletSpeed = 9;
let enemyBulletSpeed = 6;
let score = 0;
let lastShotTime = 0;
const shotCooldown = 200;

let enemies = [];
let enemySpeed = 2;

let stars = [[], [], []];
let starSpeeds = [1, 2, 3];
let starColors = ['#FFFF00', '#FFFF33', '#FFFF66'];

let keys = {
    up: false,
    down: false,
    left: false,
    right: false
};

let isUsingGamepad = false;
let gameOver = false;

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
    if (!isUsingGamepad && !gameOver) {
        let rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        player.rotation = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    }
});

window.addEventListener('keydown', function(e) {
    if (!gameOver) {
        switch(e.key) {
            case 'w': keys.up = true; break;
            case 'a': keys.left = true; break;
            case 's': keys.down = true; break;
            case 'd': keys.right = true; break;
        }
    }
});

window.addEventListener('keyup', function(e) {
    switch(e.key) {
        case 'w': keys.up = false; break;
        case 'a': keys.left = false; break;
        case 's': keys.down = false; break;
        case 'd': keys.right = false; break;
    }
});

canvas.addEventListener('click', function(e) {
    if (!gameOver) shootBullet();
});

function shootBullet() {
    let currentTime = Date.now();
    if (currentTime - lastShotTime >= shotCooldown) {
        let bullet = {
            x: player.x,
            y: player.y,
            vx: bulletSpeed * Math.cos(player.rotation),
            vy: bulletSpeed * Math.sin(player.rotation),
            color: '#00f' // Azul para balas del jugador
        };
        bullets.push(bullet);
        lastShotTime = currentTime;
    }
}

function spawnEnemy() {
    let attempts = 0;
    const maxAttempts = 10;
    let newEnemy;

    do {
        newEnemy = {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            width: 10,
            height: 20,
            wanderAngle: Math.random() * Math.PI * 2,
            lastShot: Date.now() + Math.random() * 1000 // Tiempo inicial aleatorio para disparos
        };
        attempts++;
    } while (isTooCloseToOthers(newEnemy) && attempts < maxAttempts);

    if (attempts < maxAttempts) {
        enemies.push(newEnemy);
    }
}

setInterval(spawnEnemy, 2000);

function isTooCloseToOthers(enemy) {
    const minDistance = 40;
    for (let other of enemies) {
        let dx = enemy.x - other.x;
        let dy = enemy.y - other.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minDistance) return true;
    }
    return false;
}

function pollGamepad() {
    let gamepad = navigator.getGamepads()[0];
    if (gamepad) {
        isUsingGamepad = true;
        if (!gameOver) {
            player.rotation = Math.atan2(gamepad.axes[3], gamepad.axes[2]);
            player.x += gamepad.axes[0] * player.speed;
            player.y += gamepad.axes[1] * player.speed;

            if (gamepad.buttons[5].pressed || gamepad.buttons[0].pressed) {
                shootBullet();
            }
        }
        // Botón Start (índice 9 en muchos controles) para reiniciar
        if (gameOver && gamepad.buttons[9].pressed) {
            resetGame();
        }
    } else {
        isUsingGamepad = false;
    }
}

function resetGame() {
    player = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        width: 10,
        height: 20,
        rotation: 0,
        speed: 4
    };
    bullets = [];
    enemyBullets = [];
    enemies = [];
    score = 0;
    keys = {
        up: false,
        down: false,
        left: false,
        right: false
    };
    isUsingGamepad = false;
    lastShotTime = 0;
    gameOver = false;
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!gameOver) {
        // Estrellas
        for (let i = 0; i < stars.length; i++) {
            ctx.fillStyle = starColors[i];
            for (let j = 0; j < stars[i].length; j++) {
                let star = stars[i][j];
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fill();
                star.x -= starSpeeds[i];
                if (star.x < 0) {
                    stars[i].splice(j, 1);
                    stars[i].push({
                        x: canvas.width,
                        y: Math.random() * canvas.height,
                        radius: Math.random() * 2,
                    });
                }
            }
        }

        if (!isUsingGamepad) {
            let dx = mouse.x - player.x;
            let dy = mouse.y - player.y;
            let distanceToMouse = Math.sqrt(dx * dx + dy * dy);
            if (distanceToMouse > 50) {
                let angleToMouse = Math.atan2(dy, dx);
                player.x += player.speed * Math.cos(angleToMouse);
                player.y += player.speed * Math.sin(angleToMouse);
            }
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
        ctx.fillRect(-player.width / 2 - 4, -player.height / 2, 10, 2);
        ctx.fillRect(-player.width / 2 - 4, player.height / 2, 10, 2);
        ctx.fillRect(player.width / 2 - 4, -player.height / 2, 10, 2);
        ctx.fillRect(player.width / 2 - 4, player.height / 2, 10, 2);
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Balas del jugador
        bullets.forEach(function(bullet, i) {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
            ctx.fill();

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

        // Balas de enemigos
        enemyBullets.forEach(function(bullet, i) {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            ctx.fillStyle = bullet.color;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
            ctx.fill();

            let dx = player.x - bullet.x;
            let dy = player.y - bullet.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < player.width / 2) {
                gameOver = true;
            }
        });

        // Enemigos con IA mejorada
        enemies.forEach(function(enemy) {
            let dx = player.x - enemy.x;
            let dy = player.y - enemy.y;
            let distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            let pursuitAngle = Math.atan2(dy, dx);

            // Persecución más directa con menos aleatoriedad
            let finalAngle = pursuitAngle * 0.9 + enemy.wanderAngle * 0.1;
            enemy.wanderAngle += (Math.random() - 0.5) * 0.1;

            // Separación mejorada
            let separationX = 0;
            let separationY = 0;
            enemies.forEach(function(other) {
                if (enemy !== other) {
                    let sepDx = enemy.x - other.x;
                    let sepDy = enemy.y - other.y;
                    let sepDist = Math.sqrt(sepDx * sepDx + sepDy * sepDy);
                    if (sepDist < 40 && sepDist > 0) {
                        let force = (40 - sepDist) / 40;
                        separationX += (sepDx / sepDist) * force * 2;
                        separationY += (sepDy / sepDist) * force * 2;
                    }
                }
            });

            enemy.x += Math.cos(finalAngle) * enemySpeed + separationX;
            enemy.y += Math.sin(finalAngle) * enemySpeed + separationY;

            // Disparo de enemigos
            let currentTime = Date.now();
            if (currentTime - enemy.lastShot >= 1000) {
                let bullet = {
                    x: enemy.x,
                    y: enemy.y,
                    vx: enemyBulletSpeed * Math.cos(pursuitAngle),
                    vy: enemyBulletSpeed * Math.sin(pursuitAngle),
                    color: '#f00' // Rojo para balas de enemigos
                };
                enemyBullets.push(bullet);
                enemy.lastShot = currentTime;
            }

            // Dibujar enemigo
            ctx.save();
            ctx.translate(enemy.x, enemy.y);
            ctx.rotate(pursuitAngle + Math.PI);
            ctx.fillStyle = '#f00';
            ctx.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
            ctx.fillRect(-enemy.width / 2 - 4, -enemy.height / 2, 10, 2);
            ctx.fillRect(enemy.width / 2 - 4, -enemy.height / 2, 10, 2);
            ctx.fillRect(-enemy.width / 2 - 4, enemy.height / 2, 10, 2);
            ctx.fillRect(enemy.width / 2 - 4, enemy.height / 2, 10, 2);
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Colisión con jugador
            let pdx = player.x - enemy.x;
            let pdy = player.y - enemy.y;
            let pdistance = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pdistance < player.width / 2) {
                gameOver = true;
            }
        });

        ctx.font = "16px Arial";
        ctx.fillStyle = "#0095DD";
        ctx.fillText("Score: " + score, 8, 20);
    } else {
        // Pantalla de Game Over
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.font = "60px Arial";
        ctx.fillStyle = "#ff0000";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 40);
        
        ctx.font = "30px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 20);
        
        ctx.font = "20px Arial";
        ctx.fillStyle = "#00ff00";
        ctx.fillText("Press START to Restart", canvas.width / 2, canvas.height / 2 + 60);
        
        pollGamepad(); // Seguir verificando el botón Start
    }
    
    requestAnimationFrame(gameLoop);
}

gameLoop();