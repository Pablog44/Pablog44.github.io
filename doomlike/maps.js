/***** maps.js *****/

// SONIDO DE INICIO DE MAPA
const mapStartSound = new Audio('mapStart.mp3');
mapStartSound.volume = 0.3;

// SONIDO DE JUEGO TERMINADO
const gameOverSound = new Audio('gameOver.mp3');
gameOverSound.volume = 0.3;

// Función para generar el primer mapa
function generateFirstMap() {
  const MAP_WIDTH = 15, MAP_HEIGHT = 15;
  const mapArray = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push(1); // Pared por defecto
    }
    mapArray.push(row);
  }
  // "Vaciar" parte del mapa: Barra horizontal (filas 1 a 4, columnas 3 a 11)
  for (let y = 1; y <= 4; y++) {
    for (let x = 3; x <= 11; x++) {
      mapArray[y][x] = 0;
    }
  }
  // Barra vertical (filas 4 a 13, columnas 6 a 8)
  for (let y = 4; y <= 13; y++) {
    for (let x = 6; x <= 8; x++) {
      mapArray[y][x] = 0;
    }
  }
  return mapArray;
}

// Función para generar el segundo mapa
function generateSecondMap() {
  const MAP_WIDTH = 15, MAP_HEIGHT = 15;
  const mapArray = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push(1);
    }
    mapArray.push(row);
  }
  // Vaciar zona central
  for (let y = 2; y <= 10; y++) {
    for (let x = 2; x < 13; x++) {
      mapArray[y][x] = 0;
    }
  }
  // Abrir zona inferior
  for (let y = 10; y <= 13; y++) {
    for (let x = 5; x <= 9; x++) {
      mapArray[y][x] = 0;
    }
  }
  return mapArray;
}

// Función para generar el tercer mapa
function generateThirdMap() {
  const MAP_WIDTH = 15, MAP_HEIGHT = 15;
  const mapArray = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push(1);
    }
    mapArray.push(row);
  }
  // Crear un camino diagonal y una gran zona abierta en el centro
  for (let i = 1; i < MAP_WIDTH - 1; i++) {
    mapArray[i][i] = 0;
    if (i + 1 < MAP_WIDTH - 1) {
      mapArray[i][i + 1] = 0;
    }
  }
  // Zona abierta en el centro
  for (let y = 5; y < 10; y++) {
    for (let x = 5; x < 10; x++) {
      mapArray[y][x] = 0;
    }
  }
  return mapArray;
}

// Función para generar el cuarto mapa
function generateFourthMap() {
  const MAP_WIDTH = 15, MAP_HEIGHT = 15;
  const mapArray = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push(1);
    }
    mapArray.push(row);
  }
  // Vaciar zona central
  for (let y = 2; y <= 12; y++) {
    for (let x = 2; x < 5; x++) {
      mapArray[y][x] = 0;
    }
  }
  // Abrir zona inferior
  for (let y = 6; y <= 8; y++) {
    for (let x = 5; x <= 9; x++) {
      mapArray[y][x] = 0;
    }
  }
  for (let y = 2; y <= 12; y++) {
    for (let x = 9; x < 13; x++) {
      mapArray[y][x] = 0;
    }
  }
  return mapArray;
}

// Función para generar el quinto mapa
function generateFifthMap() {
  const MAP_WIDTH = 15, MAP_HEIGHT = 15;
  const mapArray = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push(1);
    }
    mapArray.push(row);
  }

  for (let y = 2; y <= 13; y++) {
    for (let x = 2; x < 5; x++) {
      mapArray[y][x] = 0;
    }
  }

  for (let y = 11; y <= 13; y++) {
    for (let x = 5; x <= 13; x++) {
      mapArray[y][x] = 0;
    }
  }
  for (let y = 2; y < 11; y++) {
    for (let x = 9; x < 13; x++) {
      mapArray[y][x] = 0;
    }
  }
  return mapArray;
}

/**
 * Función para generar el sexto mapa.
 * En este ejemplo, se crea un gran espacio central, rodeado por muros en el borde
 * y con una cruz de muros en el centro.
 */
function generateSixthMap() {
  const MAP_WIDTH = 15, MAP_HEIGHT = 15;
  const mapArray = [];

  // Inicializar todo con paredes
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push(1);
    }
    mapArray.push(row);
  }

  for (let y = 1; y <= 4; y++) {
    for (let x = 1; x < 5; x++) {
      mapArray[y][x] = 0;
    }
  }

  for (let y = 2; y < 3; y++) {
    for (let x = 5; x <= 10; x++) {
      mapArray[y][x] = 0;
    }
  }
  for (let y = 4; y <= 10; y++) {
    for (let x = 2; x < 3; x++) {
      mapArray[y][x] = 0;
    }
  }
  for (let y = 1; y <= 4; y++) {
    for (let x = 10; x < 14; x++) {
      mapArray[y][x] = 0;
    }
  }
  for (let y = 4; y <= 10; y++) {
    for (let x = 12; x < 13; x++) {
      mapArray[y][x] = 0;
    }
  }
  for (let y = 10; y < 14; y++) {
    for (let x = 1; x < 5; x++) {
      mapArray[y][x] = 0;
    }
  }
  for (let y = 10; y < 14; y++) {
    for (let x = 10; x < 14; x++) {
      mapArray[y][x] = 0;
    }
  }
  for (let y = 12; y < 13; y++) {
    for (let x = 5; x <= 7; x++) {
      mapArray[y][x] = 0;
    }
  }
  for (let y = 9; y < 12; y++) {
    for (let x = 7; x < 8; x++) {
      mapArray[y][x] = 0;
    }
  }
  for (let y = 6; y < 9; y++) {
    for (let x = 6; x < 9; x++) {
      mapArray[y][x] = 0;
    }
  }

  return mapArray;
}

// Definimos un array con la información de cada nivel/mapa
const allMaps = [
  {
    layout: generateFirstMap, 
    enemies: [
      { x: 5.5,  y: 2.5,  alive: true },
      { x: 7.5,  y: 10.5, alive: true },
      { x: 10.5, y: 4.5,  alive: true }
    ],
    playerStart: {
      x: 7.5,
      y: 3.5,
      angle: 0
    }
  },
  {
    layout: generateSecondMap,
    enemies: [
      { x: 4.5, y: 4.5, alive: true },
      { x: 9.5, y: 8.5, alive: true }
    ],
    playerStart: {
      x: 2.5,
      y: 2.5,
      angle: 0
    }
  },
  {
    layout: generateThirdMap,
    enemies: [
      { x: 6.5, y: 6.5, alive: true },
      { x: 8.5, y: 8.5, alive: true },
      { x: 4.5, y: 4.5, alive: true }
    ],
    playerStart: {
      x: 7.5,
      y: 7.5,
      angle: Math.PI / 4
    }
  },
  {
    layout: generateFourthMap,
    enemies: [
      { x: 3.5,  y: 3.5, alive: true }
    ],
    playerStart: {
      x: 7.5,
      y: 7.5,
      angle: Math.PI
    }
  },
  {
    layout: generateFifthMap,
    enemies: [
      { x: 10.5, y: 10.5, alive: true },
      { x: 4.5,  y: 6.5,  alive: true },
      { x: 3.5,  y: 7.5,  alive: true },
      { x: 3.5,  y: 3.5,  alive: true }
    ],
    playerStart: {
      x: 9.5,
      y: 9.5,
      angle: 0
    }
  },
  // Mapa 6: el nuevo mapa
  {
    layout: generateSixthMap,
    enemies: [
      { x: 2.5,  y: 2.5,   alive: true },
      { x: 12.5, y: 2.5,   alive: true },
      { x: 2.5,  y: 12.5,  alive: true },
      { x: 6.5,  y: 6.5,   alive: true },
      { x: 7.5,  y: 7.5,   alive: true },
      { x: 12.5, y: 12.5,  alive: true }
    ],
    playerStart: {
      x: 11.5,
      y: 11.5,
      angle: 0
    }
  }
];

// Índice del mapa/nivel actual
window.currentMapIndex = 0;

/**
 * Función para inicializar (o cambiar a) un mapa en concreto.
 * Sobrescribe las variables globales: window.map, window.enemies, posX, posY, angle, etc.
 * Además, se vacían los arrays de proyectiles del jugador y de los enemigos.
 * Al inicio de cada mapa se reproduce el sonido de inicio.
 */
window.initMap = function(index) {
  // Evitamos pasarnos de rango
  if (index < 0 || index >= allMaps.length) {
    console.warn("Índice de mapa fuera de rango");
    return;
  }
  window.currentMapIndex = index;
  
  // Vaciamos los proyectiles existentes (del jugador y de los enemigos)
  if (window.bullets) {
    window.bullets.length = 0;
  }
  if (window.enemyBullets) {
    window.enemyBullets.length = 0;
  }
  
  // Cargamos el layout
  window.map = allMaps[index].layout(); 
  
  // Copiamos/enlazamos la lista de enemigos al global 'window.enemies'
  window.enemies = allMaps[index].enemies.map(e => ({ ...e }));
  
  // Actualizamos posición y ángulo del jugador
  posX   = allMaps[index].playerStart.x;
  posY   = allMaps[index].playerStart.y;
  angle  = allMaps[index].playerStart.angle;
  
  // Reproducir el sonido de inicio del mapa al 50% de volumen
  mapStartSound.currentTime = 0;
  mapStartSound.play();
};

/**
 * Función para avanzar al siguiente mapa.
 * Por ejemplo, puedes llamarla cuando maten a todos los enemigos de un mapa.
 */
window.nextMap = function() {
  const nextIndex = window.currentMapIndex + 1;
  if (nextIndex < allMaps.length) {
    window.initMap(nextIndex);
  } else {
    // Evitar crear múltiples overlays si ya existe uno
    if (document.getElementById('game-over-overlay')) return;

    // Reproducir sonido de juego terminado
    gameOverSound.currentTime = 0;
    gameOverSound.play();

    // Crear overlay para mensaje de "Juego terminado" y botón "Reiniciar"
    const overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = 9999;

    // Mensaje "Juego terminado"
    const message = document.createElement('div');
    message.textContent = 'Juego terminado';
    message.style.color = '#fff';
    message.style.fontSize = '48px';
    message.style.marginBottom = '20px';
    overlay.appendChild(message);

    // Botón "Reiniciar"
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Reiniciar';
    restartButton.style.padding = '10px 20px';
    restartButton.style.fontSize = '24px';
    restartButton.style.cursor = 'pointer';
    restartButton.addEventListener('click', function() {
      // Detener el sonido de juego terminado para evitar que se solape con el de inicio
      gameOverSound.pause();
      gameOverSound.currentTime = 0;
      
      // Elimina el overlay, restablece la vida y reinicia el juego desde el primer mapa
      document.body.removeChild(overlay);
      playerLife = 100;
      window.initMap(0);
    });
    overlay.appendChild(restartButton);

    // Añadir el overlay al body
    document.body.appendChild(overlay);
  }
};
