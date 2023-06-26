const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const resetButton = document.getElementById('resetButton');

let player1 = {
    x: canvas.width / 4,
    y: canvas.height - 30,
    width: 20,
    height: 20,
    color: '#39ff14',
    isAlive: true
};

let player2 = null;

let bullets = [];
let enemies = [];
let enemyBullets = [];
let gameInterval;
let score = 0;
let scoreP2 = 0;
let level = 1;
let enemySpeed = 0.05;

resetButton.addEventListener('click', resetGame);

document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 's':
            player2 = {
                x: 3 * canvas.width / 4,
                y: canvas.height - 30,
                width: 20,
                height: 20,
                color: '#0000FF',
                isAlive: true
            };
            break;
        case 'ArrowLeft':
            player1.x = Math.max(player1.x - 5, 0);
            break;
        case 'ArrowRight':
            player1.x = Math.min(player1.x + 5, canvas.width - player1.width);
            break;
        case ' ':
            shootBullet(player1, 1);
            break;
        case 'd':
            if(player2) {
                player2.x = Math.min(player2.x + 5, canvas.width - player2.width);
            }
            break;
        case 'a':
            if(player2) {
                player2.x = Math.max(player2.x - 5, 0);
            }
            break;
        case 'w':
            if(player2) {
                shootBullet(player2, 2);
            }
            break;
        case 'r':
            resetGame();
            break;
    }
});

function resetGame() {
    player1 = {
        x: canvas.width / 4,
        y: canvas.height - 30,
        width: 20,
        height: 20,
        color: '#39ff14',
        isAlive: true
    };
    player2 = null;
    bullets = [];
    enemies = [];
    enemyBullets = [];
    level = 1;
    score = 0;
    scoreP2 = 0;
    enemySpeed = 0.05;
    createEnemies();
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    gameInterval = setInterval(gameLoop, 1000 / 60);
}

function createEnemies() {
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 11; j++) {
            enemies.push({
                x: 10 + j * 40,
                y: 10 + i * 40,
                width: 20,
                height: 20
            });
        }
    }
}

function drawPlayer(player) {
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x - player.width / 2, player.y + player.height);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height);
    ctx.closePath();
    ctx.fillStyle = player.color;
    ctx.fill();
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = '#39ff14';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.font = '20px Arial';
        ctx.fillStyle = bullet.player === 1 ? '#39ff14' : '#0000FF';
        ctx.fillText('I', bullet.x, bullet.y);
    });
}

function drawEnemyBullets() {
    enemyBullets.forEach(bullet => {
        ctx.font = '20px Arial';
        ctx.fillStyle = '#39ff14';
        ctx.fillText('I', bullet.x, bullet.y);
    });
}

function updateBullets() {
    bullets.forEach((bullet, index) => {
        bullet.y -= 5;
        if (bullet.y < 0) {
            bullets.splice(index, 1);
        }
    });

    enemyBullets.forEach((bullet, index) => {
        bullet.y += 5;
        if (bullet.y > canvas.height) {
            enemyBullets.splice(index, 1);
        }
    });
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        enemy.y += enemySpeed;
        if (Math.random() < 0.001) {
            enemyBullets.push({
                x: enemy.x + enemy.width / 2 - 5,
                y: enemy.y + enemy.height,
                width: 10,
                height: 20
            });
        }

        // Check for collision with player or bottom of the screen
        [player1, player2].forEach(player => {
            if (player && player.isAlive &&
                enemy.x < player.x + player.width &&
                enemy.x + enemy.width > player.x &&
                enemy.y < player.y + player.height &&
                enemy.y + enemy.height > player.y
            ) {
                // Player is hit
                player.isAlive = false;
                checkGameOver();
            }
        });

        if (enemy.y + enemy.height > canvas.height) {
            // Enemy reached bottom
            checkGameOver();
        }
    });
}

function checkGameOver() {
    if (!player1.isAlive && (!player2 || !player2.isAlive)) {
        gameOver();
    }
}

function shootBullet(player, playerId) {
    bullets.push({
        x: player.x,
        y: player.y - player.height,
        width: 10,
        height: 20,
        player: playerId
    });
}

function displayScoreAndLevel() {
    ctx.font = '20px Arial';
    ctx.fillStyle = '#39ff14';
    ctx.fillText('P1 Score: ' + score, canvas.width - 200, 30);
    if (player2) {
        ctx.fillText('P2 Score: ' + scoreP2, canvas.width - 200, 60);
    }
    ctx.fillText('Level: ' + level, canvas.width - 200, 90);
}

function gameOver() {
    clearInterval(gameInterval);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '50px Arial';
    ctx.fillStyle = '#39ff14';
    ctx.fillText('GAME OVER', canvas.width / 2 - 100, canvas.height / 2);
}

function levelUp() {
    level++;
    enemySpeed += 0.02;
    createEnemies();
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (player1.isAlive) {
        drawPlayer(player1);
    }
    if (player2 && player2.isAlive) {
        drawPlayer(player2);
    }
    drawEnemies();
    drawBullets();
    drawEnemyBullets();
    checkBulletCollision();
    updateBullets();
    updateEnemies();
    displayScoreAndLevel();
}

function checkBulletCollision() {
    // Player's bullet hits enemy
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                if (bullet.player === 1) {
                    score++;
                } else if (bullet.player === 2) {
                    scoreP2++;
                }
                bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);

                // If all enemies are eliminated, level up
                if (enemies.length === 0) {
                    levelUp();
                }
            }
        });
    });
  
 // Enemy's bullet hits player
 enemyBullets.forEach((bullet, bulletIndex) => {
    [player1, player2].forEach(player => {
        if (player && player.isAlive &&
            bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y) {
            player.isAlive = false;
            enemyBullets.splice(bulletIndex, 1);
            checkGameOver();
        }
    });
});
}

resetGame();
