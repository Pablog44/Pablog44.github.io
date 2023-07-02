const areaMostrar = document.getElementById("displayArea");
const areaTipear = document.getElementById("typingArea");
const areaPuntuacion = document.getElementById("scoreArea");
const botonReiniciar = document.getElementById("resetBtn");
const areaTiempo = document.getElementById("timeArea");
const nuevaAreaTexto = document.getElementById("newTextArea");
const botonTextoNuevo = document.getElementById("newTextBtn");

let textoActual = "";
let cuentaCorrectas = 0;
let cuentaIncorrectas = 0;
let tiempoInicio;
let totalCaracteres = 0;
let intervaloTemporizador;

let palabras = [
    /* tus palabras aquí */
];

function obtenerNuevaPalabra() {
    const indice = Math.floor(Math.random() * palabras.length);
    return palabras[indice];
}

function generarPalabras() {
    palabrasActuales = [];
    for (let i = 0; i < 20; i++) {
        palabrasActuales.push(obtenerNuevaPalabra());
    }
    textoActual = palabrasActuales.join(" ");
    areaMostrar.innerText = textoActual;
}

botonTextoNuevo.addEventListener('click', function() {
    if (nuevaAreaTexto.value.length !== 0) {
        palabras = nuevaAreaTexto.value.split(" ");
        nuevaAreaTexto.value = '';
    }
    reiniciarJuego();
    areaTipear.focus();
});

areaTipear.addEventListener("input", function(e) {
    const caracterTipeado = e.data;
    totalCaracteres++;

    if (caracterTipeado === ' ') {
        if (textoActual[0] === ' ') {
            textoActual = textoActual.substring(1);
            cuentaCorrectas++;
        } else {
            cuentaIncorrectas++;
        }
    } else if (caracterTipeado === textoActual[0]) {
        textoActual = textoActual.substring(1);
        cuentaCorrectas++;
    } else {
        cuentaIncorrectas++;
    }

    areaMostrar.innerText = textoActual;
    areaPuntuacion.textContent = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas;
    areaTipear.value = '';

    if (textoActual.length === 0) {
        mostrarPulsacionesPorMinuto();
        clearInterval(intervaloTemporizador);
    }
});

botonReiniciar.addEventListener('click', function() {
    mostrarPulsacionesPorMinuto();
    reiniciarJuego();
});

function reiniciarJuego() {
    cuentaCorrectas = 0;
    cuentaIncorrectas = 0;
    totalCaracteres = 0;
    generarPalabras();
    areaPuntuacion.textContent = 'Aciertos: 0 / Fallos: 0';
    areaTiempo.textContent = '';
    tiempoInicio = new Date();
    areaTipear.value = '';

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

    let netoCorrectos = cuentaCorrectas;
    let pulsacionesPorMinuto = Math.floor((netoCorrectos / tiempoTranscurrido) * 60);
    areaPuntuacion.innerText = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas + ' / Ppm: ' + pulsacionesPorMinuto;
}

window.onload = function() {
    reiniciarJuego();
    areaTipear.focus();
}
