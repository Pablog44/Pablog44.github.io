document.addEventListener("DOMContentLoaded", function () {
  // ─── CREACIÓN DEL FOOTER Y CONTENEDORES ─────────────────────────────
  let footer = document.getElementById("gameFooter");
  if (!footer) {
    footer = document.createElement("footer");
    footer.id = "gameFooter";
    footer.style.position = "fixed";
    footer.style.bottom = "0";
    footer.style.left = "0";
    footer.style.width = "100%";
    footer.style.height = "15vh"; // 15% de la altura de la pantalla
    footer.style.background = "#222";
    footer.style.boxSizing = "border-box";
    footer.style.display = "flex";
    footer.style.justifyContent = "space-between";
    footer.style.alignItems = "center";
    footer.style.padding = "0 5px";
    document.body.appendChild(footer);
  }

  // Contenedor para la cruz direccional (D-pad) – IZQUIERDA
  const dpadContainer = document.createElement("div");
  dpadContainer.style.flex = "0 0 auto";
  dpadContainer.style.display = "flex";
  dpadContainer.style.alignItems = "center";
  const dpadSize = footer.clientHeight * 0.8;
  const dpad = document.createElement("div");
  dpad.id = "dpad";
  dpad.style.display = "grid";
  dpad.style.gridTemplateColumns = "repeat(3, 1fr)";
  dpad.style.gridTemplateRows = "repeat(3, 1fr)";
  dpad.style.width = dpadSize + "px";
  dpad.style.height = dpadSize + "px";
  dpad.style.gap = "2px";
  
  // Se crean los botones de dirección
  const btnUp = document.createElement("button");
  btnUp.id = "btn-up";
  btnUp.innerHTML = "▲";
  btnUp.style.gridColumn = "2 / 3";
  btnUp.style.gridRow = "1 / 2";
  const btnLeft = document.createElement("button");
  btnLeft.id = "btn-left";
  btnLeft.innerHTML = "◀";
  btnLeft.style.gridColumn = "1 / 2";
  btnLeft.style.gridRow = "2 / 3";
  const btnDown = document.createElement("button");
  btnDown.id = "btn-down";
  btnDown.innerHTML = "▼";
  btnDown.style.gridColumn = "2 / 3";
  btnDown.style.gridRow = "3 / 4";
  const btnRight = document.createElement("button");
  btnRight.id = "btn-right";
  btnRight.innerHTML = "▶";
  btnRight.style.gridColumn = "3 / 4";
  btnRight.style.gridRow = "2 / 3";
  
  [btnUp, btnLeft, btnDown, btnRight].forEach(btn => {
    btn.style.fontSize = "1rem";
    btn.style.cursor = "pointer";
  });
  
  dpad.appendChild(btnUp);
  dpad.appendChild(btnLeft);
  dpad.appendChild(btnDown);
  dpad.appendChild(btnRight);
  dpadContainer.appendChild(dpad);
  
  // Contenedor central para el minimapa
  const minimapContainer = document.createElement("div");
  minimapContainer.style.flex = "0 0 auto";
  minimapContainer.style.display = "flex";
  minimapContainer.style.alignItems = "center";
  const minimapSize = footer.clientHeight * 0.8;
  const minimapCanvas = document.createElement("canvas");
  minimapCanvas.id = "minimapCanvas";
  minimapCanvas.width = minimapSize;
  minimapCanvas.height = minimapSize;
  minimapCanvas.style.background = "#000";
  minimapContainer.appendChild(minimapCanvas);
  const minimapCtx = minimapCanvas.getContext("2d");
  
  // Contenedor para el botón de disparo – DERECHA
  const shootContainer = document.createElement("div");
  shootContainer.style.flex = "0 0 auto";
  shootContainer.style.display = "flex";
  shootContainer.style.alignItems = "center";
  const shootBtn = document.createElement("button");
  shootBtn.id = "shootBtn";
  shootBtn.innerHTML = "Disparar";
  shootBtn.style.width = "12vh";
  shootBtn.style.height = "12vh";
  shootBtn.style.borderRadius = "50%";
  shootBtn.style.fontSize = "1rem";
  shootBtn.style.cursor = "pointer";
  shootContainer.appendChild(shootBtn);
  
  // Se agrega al footer en el orden: D-pad (izquierda), minimapa (centro), botón de disparo (derecha)
  footer.appendChild(dpadContainer);
  footer.appendChild(minimapContainer);
  footer.appendChild(shootContainer);
  
  // ─── Funciones de eventos para controles táctiles y de mouse ───
  function addButtonEvents(button, key) {
    button.addEventListener("touchstart", function(e) {
      e.preventDefault();
      window.keys[key] = true;
    });
    button.addEventListener("touchend", function(e) {
      e.preventDefault();
      window.keys[key] = false;
    });
    // Soporte para mouse
    button.addEventListener("mousedown", function(e) {
      e.preventDefault();
      window.keys[key] = true;
    });
    button.addEventListener("mouseup", function(e) {
      e.preventDefault();
      window.keys[key] = false;
    });
  }
  addButtonEvents(btnUp, "ArrowUp");
  addButtonEvents(btnLeft, "ArrowLeft");
  addButtonEvents(btnDown, "ArrowDown");
  addButtonEvents(btnRight, "ArrowRight");
  
  shootBtn.addEventListener("touchstart", function(e) {
    e.preventDefault();
    if (typeof shootBullet === "function") shootBullet();
  });
  shootBtn.addEventListener("mousedown", function(e) {
    e.preventDefault();
    if (typeof shootBullet === "function") shootBullet();
  });
  
  // ─── DIBUJO DEL MINIMAPA ───
  // Se asume que las variables globales "map", "posX", "posY" y "enemies" están definidas en el juego.
  const MAP_WIDTH = map[0].length;
  const MAP_HEIGHT = map.length;
  const cellSize = minimapCanvas.width / MAP_WIDTH;
  function drawMinimap() {
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    // Dibuja el mapa: paredes en gris oscuro y suelos en gris claro
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        minimapCtx.fillStyle = (map[y][x] === 1) ? "#555" : "#ccc";
        minimapCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
    // Dibuja al jugador en azul
    minimapCtx.fillStyle = "blue";
    minimapCtx.beginPath();
    minimapCtx.arc(window.posX * cellSize, window.posY * cellSize, cellSize / 3, 0, Math.PI * 2);
    minimapCtx.fill();
    // Dibuja a cada enemigo (si están vivos) en rojo
    minimapCtx.fillStyle = "red";
    for (let enemy of window.enemies || []) {
      if (enemy.alive) {
        minimapCtx.beginPath();
        minimapCtx.arc(enemy.x * cellSize, enemy.y * cellSize, cellSize / 3, 0, Math.PI * 2);
        minimapCtx.fill();
      }
    }
    // Dibuja la vida del jugador (usa window.playerLife o 100 por defecto)
    let playerLife = window.playerLife || 100;
    minimapCtx.fillStyle = "white";
    minimapCtx.font = "16px sans-serif";
    minimapCtx.fillText("Vida: " + playerLife, 10, minimapCanvas.height - 10);
    requestAnimationFrame(drawMinimap);
  }
  drawMinimap();
});
