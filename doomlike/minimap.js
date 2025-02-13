document.addEventListener("DOMContentLoaded", function () {
  // Se crea (o se obtiene) el footer para el minimapa y controles móviles
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
    footer.style.color = "#fff";
    footer.style.padding = "5px";
    footer.style.boxSizing = "border-box";
    footer.style.display = "flex";
    footer.style.flexDirection = "column";
    footer.style.alignItems = "center";
    document.body.appendChild(footer);
  }

  // Se crea el canvas del minimapa (70% de la altura del footer)
  const minimapCanvas = document.createElement("canvas");
  minimapCanvas.id = "minimapCanvas";
  minimapCanvas.width = footer.clientWidth;
  minimapCanvas.height = footer.clientHeight * 0.7;
  minimapCanvas.style.background = "#000";
  footer.appendChild(minimapCanvas);
  const minimapCtx = minimapCanvas.getContext("2d");

  // Se crea el contenedor de controles móviles (30% del footer)
  const mobileControls = document.createElement("div");
  mobileControls.id = "mobileControls";
  mobileControls.style.width = "100%";
  mobileControls.style.height = "30%";
  mobileControls.style.display = "flex";
  mobileControls.style.justifyContent = "space-between";
  mobileControls.style.alignItems = "center";
  footer.appendChild(mobileControls);

  // Se crea la cruz direccional (D-pad)
  const dpad = document.createElement("div");
  dpad.id = "dpad";
  dpad.style.display = "grid";
  dpad.style.gridTemplateColumns = "50px 50px 50px";
  dpad.style.gridTemplateRows = "50px 50px 50px";
  dpad.style.gap = "5px";
  // Botón arriba
  const btnUp = document.createElement("button");
  btnUp.id = "btn-up";
  btnUp.innerHTML = "▲";
  btnUp.style.gridColumn = "2 / 3";
  btnUp.style.gridRow = "1 / 2";
  // Botón izquierda
  const btnLeft = document.createElement("button");
  btnLeft.id = "btn-left";
  btnLeft.innerHTML = "◀";
  btnLeft.style.gridColumn = "1 / 2";
  btnLeft.style.gridRow = "2 / 3";
  // Botón abajo
  const btnDown = document.createElement("button");
  btnDown.id = "btn-down";
  btnDown.innerHTML = "▼";
  btnDown.style.gridColumn = "2 / 3";
  btnDown.style.gridRow = "3 / 4";
  // Botón derecha
  const btnRight = document.createElement("button");
  btnRight.id = "btn-right";
  btnRight.innerHTML = "▶";
  btnRight.style.gridColumn = "3 / 4";
  btnRight.style.gridRow = "2 / 3";
  // Se agregan los botones al D-pad
  dpad.appendChild(btnUp);
  dpad.appendChild(btnLeft);
  dpad.appendChild(btnDown);
  dpad.appendChild(btnRight);
  mobileControls.appendChild(dpad);

  // Se crea el botón de disparo
  const shootBtn = document.createElement("button");
  shootBtn.id = "shootBtn";
  shootBtn.innerHTML = "Disparar";
  shootBtn.style.width = "70px";
  shootBtn.style.height = "70px";
  shootBtn.style.borderRadius = "50%";
  mobileControls.appendChild(shootBtn);

  // Función para añadir eventos táctiles y de mouse a cada botón direccional
  function addButtonEvents(button, key) {
    button.addEventListener("touchstart", function(e) {
      e.preventDefault();
      window.keys[key] = true;
    });
    button.addEventListener("touchend", function(e) {
      e.preventDefault();
      window.keys[key] = false;
    });
    // Soporte para mouse en pruebas de escritorio
    button.addEventListener("mousedown", function(e) {
      e.preventDefault();
      window.keys[key] = true;
    });
    button.addEventListener("mouseup", function(e) {
      e.preventDefault();
      window.keys[key] = false;
    });
  }

  // Se añaden eventos a los botones del D-pad
  addButtonEvents(btnUp, "ArrowUp");
  addButtonEvents(btnLeft, "ArrowLeft");
  addButtonEvents(btnDown, "ArrowDown");
  addButtonEvents(btnRight, "ArrowRight");

  // Evento para el botón de disparo
  shootBtn.addEventListener("touchstart", function(e) {
    e.preventDefault();
    if (typeof shootBullet === "function") {
      shootBullet();
    }
  });
  shootBtn.addEventListener("mousedown", function(e) {
    e.preventDefault();
    if (typeof shootBullet === "function") {
      shootBullet();
    }
  });

  // ─── DIBUJO DEL MINIMAPA ─────────────────────────────
  // Se usan las dimensiones del mapa global
  const MAP_WIDTH = map[0].length;
  const MAP_HEIGHT = map.length;
  const cellSize = minimapCanvas.width / MAP_WIDTH;
  function drawMinimap() {
    minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    // Dibuja el mapa: paredes en gris oscuro, suelos en gris claro
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        minimapCtx.fillStyle = (map[y][x] === 1) ? "#555" : "#ccc";
        minimapCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
    // Dibuja al jugador en azul
    minimapCtx.fillStyle = "blue";
    minimapCtx.beginPath();
    minimapCtx.arc(posX * cellSize, posY * cellSize, cellSize / 3, 0, Math.PI * 2);
    minimapCtx.fill();
    // Dibuja a cada enemigo (si están vivos) en rojo
    minimapCtx.fillStyle = "red";
    for (let enemy of enemies) {
      if (enemy.alive) {
        minimapCtx.beginPath();
        minimapCtx.arc(enemy.x * cellSize, enemy.y * cellSize, cellSize / 3, 0, Math.PI * 2);
        minimapCtx.fill();
      }
    }
    // Dibuja la vida del jugador
    let playerLife = window.playerLife || 100;
    minimapCtx.fillStyle = "white";
    minimapCtx.font = "16px sans-serif";
    minimapCtx.fillText("Vida: " + playerLife, 10, minimapCanvas.height - 10);
    requestAnimationFrame(drawMinimap);
  }
  drawMinimap();
});
