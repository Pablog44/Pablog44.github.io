// minimap.js
document.addEventListener("DOMContentLoaded", function () {
    // Se crea (o se obtiene) el elemento footer donde se mostrará el minimapa.
    let footer = document.getElementById("gameFooter");
    if (!footer) {
      footer = document.createElement("footer");
      footer.id = "gameFooter";
      // Estilos para que el footer se quede fijo en la parte inferior y tenga un fondo oscuro
      footer.style.position = "fixed";
      footer.style.bottom = "0";
      footer.style.left = "0";
      footer.style.width = "100%";
      footer.style.background = "#222";
      footer.style.color = "#fff";
      footer.style.padding = "5px";
      footer.style.textAlign = "center";
      document.body.appendChild(footer);
    }
  
    // Se crea el canvas del minimapa dentro del footer.
    const minimapCanvas = document.createElement("canvas");
    minimapCanvas.id = "minimapCanvas";
    // Puedes ajustar estas dimensiones según necesites
    minimapCanvas.width = 300;
    minimapCanvas.height = 300;
    footer.appendChild(minimapCanvas);
    const minimapCtx = minimapCanvas.getContext("2d");
  
    // Usamos las dimensiones del mapa definido globalmente
    const MAP_WIDTH = map[0].length;
    const MAP_HEIGHT = map.length;
    const cellSize = minimapCanvas.width / MAP_WIDTH; // tamaño de cada celda
  
    // Función para dibujar el minimapa y actualizarlo constantemente
    function drawMinimap() {
      // Limpiar el canvas
      minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  
      // Dibuja el mapa en planta: paredes en gris oscuro, suelo en gris claro
      for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
          if (map[y][x] === 1) {
            minimapCtx.fillStyle = "#555"; // pared
          } else {
            minimapCtx.fillStyle = "#ccc"; // suelo
          }
          minimapCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
  
      // Dibuja al jugador en azul
      minimapCtx.fillStyle = "blue";
      minimapCtx.beginPath();
      minimapCtx.arc(posX * cellSize, posY * cellSize, cellSize / 3, 0, Math.PI * 2);
      minimapCtx.fill();
  
      // Dibuja cada enemigo (si están vivos) en rojo
      minimapCtx.fillStyle = "red";
      for (let enemy of enemies) {
        if (enemy.alive) {
          minimapCtx.beginPath();
          minimapCtx.arc(enemy.x * cellSize, enemy.y * cellSize, cellSize / 3, 0, Math.PI * 2);
          minimapCtx.fill();
        }
      }
  
      // Dibuja la vida del jugador (por ahora, usamos una variable global playerLife o 100 por defecto)
      let playerLife = window.playerLife || 100;
      minimapCtx.fillStyle = "white";
      minimapCtx.font = "16px sans-serif";
      minimapCtx.fillText("Vida: " + playerLife, 10, minimapCanvas.height - 10);
  
      // Llama a esta función en cada frame
      requestAnimationFrame(drawMinimap);
    }
  
    drawMinimap();
  });
  