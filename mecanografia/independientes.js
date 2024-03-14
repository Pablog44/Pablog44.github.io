const palabras = [
    "a", "b", "q", "w", "r", "l", "t", "y", "u", "i", "o",
    "p", "g", "s", "d", "f", "h", "j", "k", "ñ", "z", "x",
    "c", "v", ",", "n", "m", ".", "-"
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
let intervaloTemporizador;

function obtenerNuevaPalabra() {
    const indice = Math.floor(Math.random() * palabras.length);
    return palabras[indice];
}

function generarPalabras() {
    palabrasActuales = [];
    for (let i = 0; i < 50; i++) { // Generar 50 caracteres
        palabrasActuales.push(obtenerNuevaPalabra());
    }
    areaMostrar.innerText = palabrasActuales.join("");
}

window.onload = function() {
    reiniciarJuego();
    areaTipear.focus();
};

function manejarEntrada(e) {
    const caracterTipeado = e.data;

    if (palabrasActuales.length === 0) {
        return; // No hacer nada si el juego ya ha terminado
    }

    if (caracterTipeado === palabrasActuales[0]) {
        cuentaCorrectas++;
        palabrasActuales.shift();
    } else {
        cuentaIncorrectas++;
    }

    areaMostrar.innerText = palabrasActuales.join("");
    areaPuntuacion.textContent = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas;
    areaTipear.value = '';

    if (palabrasActuales.length === 0) {
        mostrarPulsacionesPorMinuto();
        clearInterval(intervaloTemporizador);
    }
}

areaTipear.addEventListener("input", manejarEntrada);
areaTipear.addEventListener("keyup", function(e) {
    if (e.keyCode === 13) { // Verificar si la tecla presionada es Enter 
      reiniciarJuego();
    }
  });

botonReiniciar.addEventListener('click', function() {
    reiniciarJuego();
});

function reiniciarJuego() {
    palabrasActuales = [];
    cuentaCorrectas = 0;
    cuentaIncorrectas = 0;
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
    let pulsacionesPorMinuto = Math.floor((cuentaCorrectas / tiempoTranscurrido) * 60);
    areaPuntuacion.innerText = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas + ' / Ppm: ' + pulsacionesPorMinuto;
    guardarRecord(pulsacionesPorMinuto, cuentaIncorrectas);
}
function guardarRecord(pulsacionesPorMinuto, fallos) {
    fetch('guardarindepen.php', { // Cambia a 'guardarindepen.php'
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `pulsaciones=${pulsacionesPorMinuto}&fallos=${fallos}`
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}