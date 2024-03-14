const areaMostrar = document.getElementById("displayArea");
const areaTipear = document.getElementById("typingArea");
const areaPuntuacion = document.getElementById("scoreArea");
const botonReiniciar = document.getElementById("resetBtn");
const areaTiempo = document.getElementById("timeArea");
const nuevaAreaTexto = document.getElementById("newTextArea");
const botonTextoNuevo = document.getElementById("newTextBtn");

let textoActual = "";
let textoOriginal = ""; 
let cuentaCorrectas = 0;
let cuentaIncorrectas = 0;
let tiempoInicio;
let intervaloTemporizador;
let juegoTerminado = false;

botonTextoNuevo.addEventListener('click', function() {
    if (nuevaAreaTexto.value.length !== 0) {
        textoOriginal = nuevaAreaTexto.value;
        reiniciarJuegoConNuevoTexto();
        guardartextoNuevo();
    }
});

function reiniciarJuegoConNuevoTexto() {
    juegoTerminado = false;
    textoActual = textoOriginal;
    areaMostrar.innerText = textoActual;
    areaTipear.disabled = false;
    areaTipear.focus();
    tiempoInicio = new Date();

    cuentaCorrectas = 0;
    cuentaIncorrectas = 0;
    areaPuntuacion.textContent = 'Aciertos: 0 / Fallos: 0';
    areaTiempo.textContent = '';

    if (intervaloTemporizador) {
        clearInterval(intervaloTemporizador);
    }

    intervaloTemporizador = setInterval(function() {
        let ahora = new Date();
        let tiempoTranscurrido = (ahora - tiempoInicio) / 1000;
        areaTiempo.innerText = 'Tiempo: ' + tiempoTranscurrido.toFixed(1) + ' segundos';
    }, 100);
}

areaTipear.addEventListener("input", function(e) {
    const caracterTipeado = e.data;

    if (caracterTipeado === textoActual.charAt(0)) {
        textoActual = textoActual.slice(1);
        cuentaCorrectas++;
    } else {
        if (caracterTipeado !== ' ') {
            cuentaIncorrectas++;
        }
    }

    areaMostrar.innerText = textoActual;
    areaPuntuacion.textContent = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas;

    if (textoActual.length === 0) {
        juegoTerminado = true;
        mostrarPulsacionesPorMinuto();
        clearInterval(intervaloTemporizador);
        areaTipear.disabled = true;
    }
});

window.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        areaTipear.disabled = false;
        reiniciarJuego();
    }
});

botonReiniciar.addEventListener('click', function() {
    reiniciarJuego();
});

function reiniciarJuego() {
    juegoTerminado = false;
    textoActual = textoOriginal;
    areaMostrar.innerText = textoActual;

    cuentaCorrectas = 0;
    cuentaIncorrectas = 0;
    areaPuntuacion.textContent = 'Aciertos: 0 / Fallos: 0';
    areaTiempo.textContent = '';
    areaTipear.value = '';

    if (intervaloTemporizador) {
        clearInterval(intervaloTemporizador);
        intervaloTemporizador = null;
    }

    tiempoInicio = new Date();
    intervaloTemporizador = setInterval(function() {
        let ahora = new Date();
        let tiempoTranscurrido = (ahora - tiempoInicio) / 1000;
        areaTiempo.innerText = 'Tiempo: ' + tiempoTranscurrido.toFixed(1) + ' segundos';
    }, 100);

    areaTipear.focus();
}

function mostrarPulsacionesPorMinuto() {
    if (!juegoTerminado) {
        return;
    }

    let ahora = new Date();
    let tiempoTranscurrido = (ahora - tiempoInicio) / 60000; // Tiempo en minutos
    let pulsacionesPorMinuto = Math.floor(cuentaCorrectas / tiempoTranscurrido);
    areaPuntuacion.innerText = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas + ' / Ppm: ' + pulsacionesPorMinuto;
    guardarResultados(pulsacionesPorMinuto);
}

function guardartextoNuevo() {
    let xhr = new XMLHttpRequest();
    let url = 'guardartexto.php'; // URL del script PHP que procesará los datos
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    let data = `texto=${textoOriginal}`;
    xhr.send(data);
}

function guardarResultados(ppm) {
    if (!juegoTerminado) {
        return;
    }
    
    let xhr = new XMLHttpRequest();
    let url = 'guardarresultadostxt.php'; // URL del script PHP que procesará los datos
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    let data = `texto=${textoOriginal}&ppm=${ppm}&fallos=${cuentaIncorrectas}&fecha=${new Date().toISOString()}`;
    xhr.send(data);
}

window.onload = function() {
    reiniciarJuego();
    areaTipear.focus();
}
