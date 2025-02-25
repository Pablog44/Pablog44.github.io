document.addEventListener("DOMContentLoaded", function () {
  // ─── CREAR O RECUPERAR EL FOOTER ───
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

  // Botones de la cruzeta
  const btnUp    = createBtn("▲", "2 / 3", "1 / 2");
  const btnLeft  = createBtn("◀", "1 / 2", "2 / 3");
  const btnDown  = createBtn("▼", "2 / 3", "3 / 4");
  const btnRight = createBtn("▶", "3 / 4", "2 / 3");

  dpad.appendChild(btnUp);
  dpad.appendChild(btnLeft);
  dpad.appendChild(btnDown);
  dpad.appendChild(btnRight);
  dpadContainer.appendChild(dpad);

  // ─── MINIMAPA + VIDA (CENTRO) ───
  const middleContainer = document.createElement("div");
  middleContainer.style.flex = "0 0 auto";
  middleContainer.style.display = "flex";
  middleContainer.style.alignItems = "center";
  middleContainer.style.gap = "1rem";

  const minimapSize = footer.clientHeight * 0.8;
  const minimapCanvas = document.createElement("canvas");
  minimapCanvas.id = "minimapCanvas"; 
  minimapCanvas.width = minimapSize;
  minimapCanvas.height = minimapSize;
  minimapCanvas.style.background = "#000";

  const lifeContainer = document.createElement("div");
  lifeContainer.id = "lifeContainer";
  lifeContainer.style.color = "white";
  lifeContainer.style.fontFamily = "sans-serif";
  lifeContainer.style.fontSize = "1rem";

  const lifeLabel = document.createElement("span");
  lifeLabel.id = "lifeLabel"; 
  lifeContainer.appendChild(lifeLabel);

  middleContainer.appendChild(minimapCanvas);
  middleContainer.appendChild(lifeContainer);

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

  // ─── AÑADIR CONTENEDORES AL FOOTER ───
  footer.appendChild(dpadContainer);
  footer.appendChild(middleContainer);
  footer.appendChild(shootContainer);

  // ─── EVENTOS DE LOS BOTONES DE LA CRUZETA ───
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
  // Los botones laterales (izquierda y derecha) se usan para desplazarse
  addButtonEvents(btnLeft,  "ArrowLeft");
  addButtonEvents(btnRight, "ArrowRight");
  // Los botones de arriba y abajo se ocultarán en móvil
  addButtonEvents(btnUp,    "ArrowUp");
  addButtonEvents(btnDown,  "ArrowDown");

  // ─── EVENTOS DEL BOTÓN DE DISPARO ───
  shootBtn.addEventListener("touchstart", function(e) {
    e.preventDefault();
    if (typeof window.shootBullet === "function") window.shootBullet();
  });
  shootBtn.addEventListener("mousedown", function(e) {
    e.preventDefault();
    if (typeof window.shootBullet === "function") window.shootBullet();
  });

  // ─── BOTONES DE ROTACIÓN (SOLO EN VISTA MÓVIL) ───
  // Se crea un contenedor posicionado justo encima del footer.
  const rotateContainer = document.createElement("div");
  rotateContainer.id = "rotateContainer";
  rotateContainer.style.position = "fixed";
  rotateContainer.style.bottom = "15vh"; // justo sobre el footer
  rotateContainer.style.left = "0";
  rotateContainer.style.width = "100%";
  rotateContainer.style.height = "10vh"; // altura configurable
  rotateContainer.style.display = "none"; // por defecto se oculta; se mostrará solo en móvil
  rotateContainer.style.justifyContent = "space-around";
  rotateContainer.style.alignItems = "center";
  rotateContainer.style.background = "#333"; // fondo opcional
  document.body.appendChild(rotateContainer);

  const btnRotateLeft = document.createElement("button");
  btnRotateLeft.innerHTML = "Girar Izquierda";
  btnRotateLeft.style.fontSize = "1rem";
  btnRotateLeft.style.cursor = "pointer";

  const btnRotateRight = document.createElement("button");
  btnRotateRight.innerHTML = "Girar Derecha";
  btnRotateRight.style.fontSize = "1rem";
  btnRotateRight.style.cursor = "pointer";

  rotateContainer.appendChild(btnRotateLeft);
  rotateContainer.appendChild(btnRotateRight);

  function addRotationButtonEvents(button, key) {
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
  addRotationButtonEvents(btnRotateLeft, "rotateLeft");
  addRotationButtonEvents(btnRotateRight, "rotateRight");

  // ─── MEDIA QUERIES (MOSTRAR ROTACIÓN Y OCULTAR ARRIBA/ABAJO EN MÓVIL) ───
  // Se agregan estilos dinámicos para que el contenedor de rotación aparezca solo en vista móvil
  // y se oculten los botones de arriba y abajo de la cruzeta.
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
    @media (max-width: 768px) {
      #rotateContainer {
        display: flex !important;
      }
      /* Oculta los botones de arriba y abajo para que la cruzeta sirva solo para mover lateralmente */
      button:nth-child(1),
      button:nth-child(3) {
        /* Asumiendo que en el grid el primer y tercer botón son "▲" y "▼" respectivamente */
        display: none;
      }
    }
  `;
  document.head.appendChild(styleEl);
});
