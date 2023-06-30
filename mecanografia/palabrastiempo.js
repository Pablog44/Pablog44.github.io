const palabras = [
    "hola", "que", "tal", "como", "esta", "yo", "muy", "bien", "tu", "otro", "dia", "soleado", "calor", "frio",
    "fuego", "hielo", "detras", "delante", "arriba", "abajo", "champu", "cepillo", "coleta", "nublado","vida",
    "salud","mundo","amor","odio","felicidad","tristeza","alegría","envidia","miedo","esperanza","sueño",
    "viaje","cine","libro","música","juego","deporte","naturaleza","mar","sol","luna","cielo","estrella",
    "ciudad","país","casa","perro","gato","auto","comida","agua","aire","fuego","tierra","dinero",
    "amigo","familia","trabajo"
];

const areaMostrar = document.getElementById("displayArea");
const areaTipear = document.getElementById("typingArea");
const areaPuntuacion = document.getElementById("scoreArea");
const botonReiniciar = document.getElementById("resetBtn");
const areaTiempo = document.getElementById("timeArea");

let palabrasActuales = [];
let cuentaCorrectas = 0;
let cuentaIncorrectas = 0;
let tiempoInicio;
let totalCaracteres = 0;
let intervaloTemporizador;

function obtenerNuevaPalabra() {
    const indice = Math.floor(Math.random() * palabras.length);
    return palabras[indice];
}

function generarPalabras() {
    for (let i = 0; i < 20; i++) {
        palabrasActuales.push(obtenerNuevaPalabra());
    }
    // Añadir un punto después de la última palabra
    palabrasActuales[palabrasActuales.length - 1] += ".";
    areaMostrar.innerText = palabrasActuales.join(" ");
}

function manejarEntrada(e) {
    const caracterTipeado = e.key;
    totalCaracteres++;

    if (caracterTipeado === ' ' || caracterTipeado === '.') {
        if (palabrasActuales[0].length === 0 || (caracterTipeado === '.' && palabrasActuales[0] === '.')) {
            palabrasActuales.shift();
            cuentaCorrectas++;
        } else {
            cuentaIncorrectas++;
        }
    } else if (caracterTipeado === palabrasActuales[0][0]) {
        palabrasActuales[0] = palabrasActuales[0].substring(1);
        cuentaCorrectas++;
    } else {
        cuentaIncorrectas++;
    }

    areaMostrar.innerText = palabrasActuales.join(" ");
    areaPuntuacion.textContent = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas;
    areaTipear.value = '';

    // Verificar si todas las palabras han sido completadas
    if (palabrasActuales.length === 0) {
        mostrarPulsacionesPorMinuto();
        clearInterval(intervaloTemporizador);
    }
}


window.onload = function() {
    reiniciarJuego();
    areaTipear.focus();
}

areaTipear.addEventListener("keydown", manejarEntrada);

botonReiniciar.addEventListener('click', function() {
    mostrarPulsacionesPorMinuto();
    reiniciarJuego();
});

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
    typingArea.focus();

    if (intervaloTemporizador) {
        clearInterval(intervaloTemporizador);
    }

    intervaloTemporizador = setInterval(function() {
        let ahora = new Date();
        let tiempoTranscurrido = (ahora - tiempoInicio) / 1000;
        areaTiempo.innerText = 'Tiempo: ' + tiempoTranscurrido.toFixed(1) + ' segundos';
    }, 100);
}

function mostrarPulsacionesPorMinuto() {
    let ahora = new Date();
    let tiempoTranscurrido = (ahora - tiempoInicio) / 1000;

    let netoCorrectos = cuentaCorrectas ;
    let pulsacionesPorMinuto = Math.floor((netoCorrectos / tiempoTranscurrido) * 60);
    areaPuntuacion.innerText = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas + ' / Ppm: ' + pulsacionesPorMinuto;
}
