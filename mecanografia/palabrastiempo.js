const palabras = [
    "abajo", "agua", "aire", "alegre", "almohada", "amarillo", "amigo", "amor", "arco", "arriba", "auto",
    "azul", "azulejo", "batería", "bien", "blanco", "bocadillo", "bueno", "bruja", "cama", "casa", "casco",
    "cepillo", "cine", "cielo", "ciudad", "coleta", "comida", "como", "cortina", "casa", "cafetera", "calor",
    "cama", "cascada", "casco", "cactus", "café", "champu", "cielo", "ciudad", "coche", "color", "como",
    "comida", "correr", "dedo", "delante", "deporte", "detrás", "dia", "dinero", "duende", "ego",
    "enfrente", "envidia", "escalera", "esperanza", "espada", "estrella", "familia", "felicidad", "fuego",
    "frio", "gato", "guitarra", "gris", "hada", "hielo", "hola", "juego", "kiwi", "luna", "leche", "libro",
    "margarita", "mar", "miedo", "morado", "mundo", "música", "muy", "naranja", "naturaleza", "negro",
    "nube", "nublado", "odio", "otro", "papel", "pan", "peseta", "piano", "piedra", "pimienta", "pintura",
    "plátano", "puerta", "queso", "retrato", "retro", "rojo", "rosa", "rosado", "sal", "saxofón",
    "silla", "sirena", "sofá", "sol", "sueño", "tijera", "tormenta", "tortilla", "trabajo", "tristeza",
    "tú", "uva", "unicornio", "vampiro", "ventana", "verde", "vida", "viaje", "violeta", "yo"
];

// Elementos del DOM
const areaMostrar = document.getElementById("displayArea");
const areaTipear = document.getElementById("typingArea");
const areaPuntuacion = document.getElementById("scoreArea");
const botonReiniciar = document.getElementById("resetBtn");
const areaTiempo = document.getElementById("timeArea");

// Variables de juego
let palabrasActuales = [];
let cuentaCorrectas = 0;
let cuentaIncorrectas = 0;
let tiempoInicio;
let totalCaracteres = 0;
let intervaloTemporizador;

// Función para obtener una palabra aleatoria del array
function obtenerNuevaPalabra() {
    const indice = Math.floor(Math.random() * palabras.length);
    return palabras[indice];
}

// Función para generar el conjunto de palabras para el juego actual
function generarPalabras() {
    palabrasActuales = [];
    for (let i = 0; i < 19; i++) {
        palabrasActuales.push(obtenerNuevaPalabra() + " ");
    }
    palabrasActuales.push(obtenerNuevaPalabra() + ".");
    areaMostrar.innerText = palabrasActuales.join("");
}

// Función para reiniciar el juego
function reiniciarJuego() {
    palabrasActuales = [];
    cuentaCorrectas = 0;
    cuentaIncorrectas = 0;
    totalCaracteres = 0;
    generarPalabras();
    areaPuntuacion.textContent = 'Aciertos: 0 / Fallos: 0';
    areaTiempo.textContent = '';
    tiempoInicio = new Date();
    areaTipear.value = '';
    areaTipear.focus();

    if (intervaloTemporizador) {
        clearInterval(intervaloTemporizador);
    }

    intervaloTemporizador = setInterval(function() {
        let ahora = new Date();
        let tiempoTranscurrido = (ahora - tiempoInicio) / 1000;
        areaTiempo.innerText = 'Tiempo: ' + tiempoTranscurrido.toFixed(1) + ' segundos';
    }, 100);
}

// Función para manejar las entradas del usuario
function manejarEntrada(e) {
    const caracterTipeado = e.data;
    totalCaracteres++;

    if (caracterTipeado === palabrasActuales[0][0]) {
        palabrasActuales[0] = palabrasActuales[0].substring(1);
        cuentaCorrectas++;
        if (palabrasActuales[0].length === 0) {
            palabrasActuales.shift();
        }
    } else {
        cuentaIncorrectas++;
    }

    areaMostrar.innerText = palabrasActuales.join("");
    areaPuntuacion.textContent = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas;
    areaTipear.value = '';

    // Verificar si todas las palabras han sido completadas
    if (palabrasActuales.length === 0) {
        mostrarPulsacionesPorMinuto();
        clearInterval(intervaloTemporizador);
    }
}

// Función para mostrar las pulsaciones por minuto y guardar los resultados
function mostrarPulsacionesPorMinuto() {
    let ahora = new Date();
    let tiempoTranscurrido = (ahora - tiempoInicio) / 1000;

    let netoCorrectos = cuentaCorrectas;
    let pulsacionesPorMinuto = Math.floor((netoCorrectos / tiempoTranscurrido) * 60);
    areaPuntuacion.innerText = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas + ' / Ppm: ' + pulsacionesPorMinuto;

    // Obtén el usuario actual
    const user = firebase.auth().currentUser;

    if (user) {
        // Usuario está autenticado, guardamos sus resultados
        guardarResultados(user.uid, pulsacionesPorMinuto, cuentaIncorrectas, firebase.firestore.Timestamp.fromDate(new Date()));
    } else {
        console.log("No hay usuario autenticado para guardar los resultados");
    }
}

// Función para guardar los resultados del usuario en Firestore
function guardarResultados(uid, ppm, fallos, fecha) {
    const db = firebase.firestore();
    db.collection("resultados").add({
        uid: uid,
        ppm: ppm,
        fallos: fallos,
        fecha: fecha
    }).then(function(docRef) {
        console.log("Documento escrito con ID: ", docRef.id);
    }).catch(function(error) {
        console.error("Error añadiendo el documento: ", error);
    });
}

// Event listeners para el input de tipeo y el botón de reinicio
areaTipear.addEventListener("input", manejarEntrada);
botonReiniciar.addEventListener('click', reiniciarJuego);
areaTipear.addEventListener("keyup", function(e) {
    if (e.keyCode === 13) { // Verificar si la tecla presionada es Enter
        reiniciarJuego();
    }
});

// Inicializar el juego cuando la página se carga
window.onload = function() {
    reiniciarJuego();
};
