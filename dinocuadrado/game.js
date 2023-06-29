let player = document.getElementById("player");
let obstacle = document.getElementById("obstacle");
let gameover = false;
let ducking = false;

function jump() {
    if (!ducking && player.classList != "animate") {
        player.classList.add("animate");
    }
    setTimeout(() => {
        player.classList.remove("animate");
    }, 500);
}

function duck() {
    player.classList.add('duck');
    ducking = true;
    setTimeout(() => {
        player.classList.remove('duck');
        ducking = false;
    }, 1000);
}

function reset() {
    obstacle.style.animation = "move 2s infinite linear";
    gameover = false;
}

let checkDead = setInterval(() => {
    let playerTop = parseInt(window.getComputedStyle(player).getPropertyValue("top"));
    let obstacleLeft = parseInt(window.getComputedStyle(obstacle).getPropertyValue("left"));
    let obstacleHeight = parseInt(window.getComputedStyle(obstacle).getPropertyValue("height"));
    let obstacleBottom = parseInt(window.getComputedStyle(obstacle).getPropertyValue("bottom"));

    if (obstacleLeft < 50 && obstacleLeft > 0 && playerTop >= 150 - obstacleBottom && playerTop < 200 - obstacleBottom) {
        obstacle.style.animation = "none";
        gameover = true;
        if (confirm("Game Over. Retry?")) {
            reset();
        }
    }
}, 10);

document.getElementById('jumpBtn').addEventListener('click', function () {
    if (!gameover) {
        jump();
    }
});

document.getElementById('duckBtn').addEventListener('click', function () {
    if (!gameover) {
        duck();
    }
});

window.addEventListener('keydown', function (e) {
    if (e.code == "Space" && !gameover) {
        e.preventDefault();
        jump();
    }
});

document.body.addEventListener('touchstart', function (e) {
    if (!gameover) {
        e.preventDefault();
        jump();
    }
});

setInterval(function () {
    obstacle.style.height = "50px";
    if (Math.random() < 0.5) {
        obstacle.style.bottom = "0px";
        obstacle.classList.remove('lower');
    } else {
        obstacle.style.bottom = "30px";
        obstacle.classList.add('lower');
    }
}, 2000);
