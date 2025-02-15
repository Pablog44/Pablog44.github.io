document.addEventListener("DOMContentLoaded", function () {
  const minimapCanvas = document.getElementById("minimapCanvas");
  if (!minimapCanvas) return; // Si no existe, salimos
  const minimapCtx = minimapCanvas.getContext("2d");

  const MAP_WIDTH = (window.map && window.map[0]) ? window.map[0].length : 15;
  const MAP_HEIGHT = window.map ? window.map.length : 15;
  const cellSize = minimapCanvas.width / MAP_WIDTH;

  const lifeLabel = document.getElementById("lifeLabel");

  function drawMinimap() {
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    // Dibujar cada celda del mapa
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const isWall = (window.map && window.map[y][x] === 1);
        minimapCtx.fillStyle = isWall ? "#555" : "#ccc"; // pared vs pasillo
        minimapCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

        // Bordes
        minimapCtx.strokeStyle = "#000";
        minimapCtx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Jugador (círculo azul)
    minimapCtx.fillStyle = "blue";
    minimapCtx.beginPath();
    minimapCtx.arc(
      (window.posX || 0) * cellSize,
      (window.posY || 0) * cellSize,
      cellSize / 3,
      0,
      Math.PI * 2
    );
    minimapCtx.fill();

    // Enemigos (círculos rojos)
    minimapCtx.fillStyle = "red";
    (window.enemies || []).forEach(enemy => {
      if (enemy.alive) {
        minimapCtx.beginPath();
        minimapCtx.arc(enemy.x * cellSize, enemy.y * cellSize, cellSize / 3, 0, Math.PI * 2);
        minimapCtx.fill();
      }
    });

    // Actualizar vida fuera del minimapa
    if (lifeLabel) {
      const life = window.playerLife || 100;
      lifeLabel.textContent = "Vida: " + life;
    }

    requestAnimationFrame(drawMinimap);
  }

  drawMinimap();
});
