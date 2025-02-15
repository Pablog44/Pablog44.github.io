/***** maps.js *****/

// Aquí definimos funciones para generar mapas. 
// (Puedes ajustarlas o crear mapas directamente en arrays)

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
    // "Vaciar" parte del mapa como en tu código original
    // Barra horizontal: filas 1 a 4, columnas 3 a 11
    for (let y = 1; y <= 4; y++) {
      for (let x = 3; x <= 11; x++) {
        mapArray[y][x] = 0;
      }
    }
    // Barra vertical: filas 4 a 13, columnas 6 a 8
    for (let y = 4; y <= 13; y++) {
      for (let x = 6; x <= 8; x++) {
        mapArray[y][x] = 0;
      }
    }
    return mapArray;
  }
  
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
    // Ejemplo de "vaciar" algunas zonas distintas
    for (let y = 2; y < 10; y++) {
      for (let x = 2; x < 13; x++) {
        mapArray[y][x] = 0;
      }
    }

    for (let y = 10; y <= 14; y++) {
        for (let x = 5; x <= 9; x++) {
          mapArray[y][x] = 0;
        }
      }

    return mapArray;
  }
  
  // Definimos un array con la información de cada nivel/mapa
  // (puedes crear tantos objetos como niveles quieras)
  const allMaps = [
    {
      // El layout será la función que genera el mapa
      layout: generateFirstMap, 
      
      // Enemigos para este mapa
      enemies: [
        { x: 5.5,  y: 2.5,  alive: true },
        { x: 7.5,  y: 10.5, alive: true },
        { x: 10.5, y: 4.5,  alive: true }
      ],
      
      // Posición y ángulo inicial del jugador
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
        // ... tantos enemigos como quieras
      ],
      playerStart: {
        x: 2.5,
        y: 2.5,
        angle: 0
      }
    }
  ];
  
  // Índice del mapa/nivel actual
  window.currentMapIndex = 0;
  
  /**
   * Función para inicializar (o cambiar a) un mapa en concreto.
   * Sobrescribe las variables globales: window.map, window.enemies, posX, posY, angle, etc.
   */
  window.initMap = function(index) {
    // Evitamos pasarnos de rango
    if (index < 0 || index >= allMaps.length) {
      console.warn("Índice de mapa fuera de rango");
      return;
    }
    window.currentMapIndex = index;
    
    // Cargamos el layout
    window.map = allMaps[index].layout(); 
    
    // Copiamos/enlazamos la lista de enemigos al global 'window.enemies'
    // Si quieres que no sea la misma referencia, usa: 
    //   window.enemies = JSON.parse(JSON.stringify(allMaps[index].enemies))
    window.enemies = allMaps[index].enemies.map(e => ({ ...e }));
  
    // Actualizamos posición y ángulo del jugador
    posX   = allMaps[index].playerStart.x;
    posY   = allMaps[index].playerStart.y;
    angle  = allMaps[index].playerStart.angle;
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
      console.log("¡No hay más mapas! Juego completado.");
      // Aquí podrías reiniciar o mostrar algún mensaje final
    }
  };
  