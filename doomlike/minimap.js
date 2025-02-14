document.addEventListener("DOMContentLoaded", function () {
  let footer = document.getElementById("gameFooter");
  if (!footer) {
    footer = document.createElement("footer");
    footer.id = "gameFooter";
    footer.style.position = "fixed";
    footer.style.bottom = "0";
    footer.style.left = "0";
    footer.style.width = "100%";
    footer.style.height = "15vh";
    footer.style.background = "#222";
    footer.style.boxSizing = "border-box";
    footer.style.display = "flex";
    footer.style.justifyContent = "space-between";
    footer.style.alignItems = "center";
    footer.style.padding = "0 5px";
    document.body.appendChild(footer);
  }

  // ─── D-PAD (IZQUIERDA) ───
  const dpadContainer = document.createElement("div");
  dpadContainer.style.flex = "0 0 auto";
  dpadContainer.style.display = "flex";
  dpadContainer.style.alignItems = "center";
  const dpadSize = footer.clientHeight * 0.8;
  const dpad = document.createElement("div");
  dpad.style.display = "grid";
  dpad.style.gridTemplateColumns = "repeat(3, 1fr)";
  dpad.style.gridTemplateRows = "repeat(3, 1fr)";
  dpad.style.width = dpadSize + "px";
  dpad.style.height = dpadSize + "px";
  dpad.style.gap = "2px";

  function createBtn(label, gridCol, gridRow) {
    const btn = document.createElement("button");
    btn.innerHTML = label;
    btn.style.fontSize = "1rem";
    btn.style.cursor = "pointer";
    btn.style.gridColumn = gridCol;
    btn.style.gridRow = gridRow;
    return btn;
  }

  const btnUp = createBtn("▲", "2 / 3", "1 / 2");
  const btnLeft = createBtn("◀", "1 / 2", "2 / 3");
  const btnDown = createBtn("▼", "2 / 3", "3 / 4");
  const btnRight = createBtn("▶", "3 / 4", "2 / 3");

  dpad.appendChild(btnUp);
  dpad.appendChild(btnLeft);
  dpad.appendChild(btnDown);
  dpad.appendChild(btnRight);
  dpadContainer.appendChild(dpad);

  // ─── MINIMAPA (CENTRO) ───
  const minimapContainer = document.createElement("div");
  minimapContainer.style.flex = "0 0 auto";
  minimapContainer.style.display = "flex";
  minimapContainer.style.alignItems = "center";
  const minimapSize = footer.clientHeight * 0.8;
  const minimapCanvas = document.createElement("canvas");
  minimapCanvas.width = minimapSize;
  minimapCanvas.height = minimapSize;
  minimapCanvas.style.background = "#000";
  minimapContainer.appendChild(minimapCanvas);
  const minimapCtx = minimapCanvas.getContext("2d");

  // ─── BOTÓN DE DISPARO (DERECHA) ───
  const shootContainer = document.createElement("div");
  shootContainer.style.flex = "0 0 auto";
  shootContainer.style.display = "flex";
  shootContainer.style.alignItems = "center";
  const shootBtn = document.createElement("button");
  shootBtn.innerHTML = "Disparar";
  shootBtn.style.width = "12vh";
  shootBtn.style.height = "12vh";
  shootBtn.style.borderRadius = "50%";
  shootBtn.style.fontSize = "1rem";
  shootBtn.style.cursor = "pointer";
  shootContainer.appendChild(shootBtn);

  footer.appendChild(dpadContainer);
  footer.appendChild(minimapContainer);
  footer.appendChild(shootContainer);

  // ─── EVENTOS DE LOS BOTONES ───
  function addButtonEvents(button, key) {
    button.addEventListener("touchstart", function(e) {
      e.preventDefault();
      window.keys[key] = true;
    });
    button.addEventListener("touchend", function(e) {
      e.preventDefault();
      window.keys[key] = false;
    });
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

  // ─── DIBUJAR MINIMAPA ───
  const MAP_WIDTH = (window.map && window.map[0]) ? window.map[0].length : 15;
  const MAP_HEIGHT = window.map ? window.map.length : 15;
  const cellSize = minimapCanvas.width / MAP_WIDTH;

  function drawMinimap() {
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

    // Dibuja el mapa: paredes = gris oscuro, suelo = gris claro
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const isWall = (window.map && window.map[y][x] === 1);
        minimapCtx.fillStyle = isWall ? "#555" : "#ccc";
        minimapCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Jugador en azul
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

    // Enemigos en rojo
    minimapCtx.fillStyle = "red";
    (window.enemies || []).forEach(enemy => {
      if (enemy.alive) {
        minimapCtx.beginPath();
        minimapCtx.arc(enemy.x * cellSize, enemy.y * cellSize, cellSize / 3, 0, Math.PI * 2);
        minimapCtx.fill();
      }
    });

    // Vida del jugador
    const life = window.playerLife || 100;
    minimapCtx.fillStyle = "white";
    minimapCtx.font = "16px sans-serif";
    minimapCtx.fillText("Vida: " + life, 10, minimapCanvas.height - 10);

    requestAnimationFrame(drawMinimap);
  }
  drawMinimap();
});
