/***** minimap.js *****/
document.addEventListener("DOMContentLoaded", function () {
  const minimapCanvas = document.getElementById("minimapCanvas");
  if (!minimapCanvas) return; // Si no existe, salimos

  const minimapCtx = minimapCanvas.getContext("2d");

  function drawMinimap() {
    // Con cada frame, actualizamos según el mapa actual
    const MAP_WIDTH = (window.map && window.map[0]) ? window.map[0].length : 15;
    const MAP_HEIGHT = window.map ? window.map.length : 15;
    const cellSize = minimapCanvas.width / MAP_WIDTH;

    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    // Dibujar cada celda del mapa
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const isWall = (window.map && window.map[y][x] === 1);
        minimapCtx.fillStyle = isWall ? "#555" : "#ccc"; // pared vs pasillo
        minimapCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Jugador (círculo azul)
    const playerX = (window.posX || 0) * cellSize;
    const playerY = (window.posY || 0) * cellSize;
    const playerRadius = cellSize / 3;

    minimapCtx.fillStyle = "blue";
    minimapCtx.beginPath();
    minimapCtx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2);
    minimapCtx.fill();

    // Flecha naranja indicando la dirección del jugador
    const angle = window.angle || 0; // Obtener el ángulo del jugador desde game.js
    const arrowLength = cellSize / 2; // Longitud de la flecha
    const arrowTipX = playerX + Math.cos(angle) * (playerRadius + arrowLength);
    const arrowTipY = playerY + Math.sin(angle) * (playerRadius + arrowLength);

    minimapCtx.strokeStyle = "orange";
    minimapCtx.fillStyle = "orange";
    minimapCtx.lineWidth = 2;

    // Dibujar la línea de la flecha
    minimapCtx.beginPath();
    minimapCtx.moveTo(playerX, playerY); // Desde el centro del jugador
    minimapCtx.lineTo(arrowTipX, arrowTipY); // Hasta la punta de la flecha
    minimapCtx.stroke();

    // Dibujar la punta de la flecha (triángulo pequeño)
    const arrowHeadSize = cellSize / 6;
    minimapCtx.beginPath();
    minimapCtx.moveTo(arrowTipX, arrowTipY);
    minimapCtx.lineTo(
      arrowTipX - Math.cos(angle + Math.PI / 6) * arrowHeadSize,
      arrowTipY - Math.sin(angle + Math.PI / 6) * arrowHeadSize
    );
    minimapCtx.lineTo(
      arrowTipX - Math.cos(angle - Math.PI / 6) * arrowHeadSize,
      arrowTipY - Math.sin(angle - Math.PI / 6) * arrowHeadSize
    );
    minimapCtx.closePath();
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
    const lifeLabel = document.getElementById("lifeLabel");
    if (lifeLabel) {
      const life = window.playerLife || 100;
      lifeLabel.textContent = "Vida: " + life;
    }

    requestAnimationFrame(drawMinimap);
  }

  drawMinimap();
});
