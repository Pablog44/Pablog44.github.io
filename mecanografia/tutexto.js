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
let intervaloTemporizador;

botonTextoNuevo.addEventListener('click', function() {
    if (textoActual.length === 0 && nuevaAreaTexto.value.length !== 0) {
        textoActual = nuevaAreaTexto.value;
        areaMostrar.innerText = textoActual;
        nuevaAreaTexto.value = '';
        // Enfocarse en el área de tipeo para abrir el teclado en dispositivos móviles.
        areaTipear.focus();
        // Inicio del tiempo cuando se presiona enter y se tienen palabras para procesar
        tiempoInicio = new Date();
        if (intervaloTemporizador) {
            clearInterval(intervaloTemporizador);
        }
        intervaloTemporizador = setInterval(function() {
            let ahora = new Date();
            let tiempoTranscurrido = (ahora - tiempoInicio) / 1000;
            areaTiempo.innerText = 'Tiempo: ' + tiempoTranscurrido.toFixed(1) + ' segundos';
        }, 100);
    }
});

areaTipear.addEventListener("input", function(e) {
    const caracterTipeado = e.data;

    if (caracterTipeado === textoActual.charAt(0)) {
        textoActual = textoActual.slice(1);
        cuentaCorrectas++;
    } else {
        if (caracterTipeado !== ' ') { // Ignorar los espacios adicionales introducidos
            cuentaIncorrectas++;
        }
    }

    areaMostrar.innerText = textoActual;
    areaPuntuacion.textContent = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas;

    // Verificar si todas las palabras han sido completadas
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
    textoActual = "";
    cuentaCorrectas = 0;
    cuentaIncorrectas = 0;
    areaPuntuacion.textContent = 'Aciertos: 0 / Fallos: 0';
    areaTiempo.textContent = '';
    areaTipear.value = '';
    nuevaAreaTexto.value = '';
    areaTipear.focus();
}

function mostrarPulsacionesPorMinuto() {
    let ahora = new Date();
    let tiempoTranscurrido = (ahora - tiempoInicio) / 60000; // Tiempo en minutos

    let pulsacionesPorMinuto = Math.floor(cuentaCorrectas / tiempoTranscurrido);
    areaPuntuacion.innerText = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas + ' / Ppm: ' + pulsacionesPorMinuto;
}

window.onload = function() {
    reiniciarJuego();
    areaTipear.focus();
}
