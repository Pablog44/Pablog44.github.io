let player = document.getElementById("player");
let obstacle = document.getElementById("obstacle");
let gameover = false;

function jump() {
    if (player.classList != "animate") {
        player.classList.add("animate");
    }
    setTimeout(() => {
        player.classList.remove("animate");
    }, 500);
}

let checkDead = setInterval(() => {
    let playerTop = parseInt(window.getComputedStyle(player).getPropertyValue("top"));
    let obstacleLeft = parseInt(window.getComputedStyle(obstacle).getPropertyValue("left"));

    if(obstacleLeft < 50 && obstacleLeft > 0 && playerTop >= 150){
        obstacle.style.animation = "none";
        gameover = true;
        alert("Game Over. Retry?");
    }
}, 10);

window.addEventListener('keydown', function (e) {
    if(e.code == "Space" && !gameover){
        jump();
    }
});

window.addEventListener('touchstart', function (e) {
    if(!gameover){
        jump();
    }
});
