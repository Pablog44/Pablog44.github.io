const areaMostrar = document.getElementById("displayArea");
const areaTipear = document.getElementById("typingArea");
const areaPuntuacion = document.getElementById("scoreArea");
const botonReiniciar = document.getElementById("resetBtn");
const areaTiempo = document.getElementById("timeArea");

const secuencias = [
    "qazwsxedcrfvtgbyhnujmik,ol.pñ-",
    "fjghfjghfjgh",
    "ñalskdjfñalskdjfñalskdjfññssllaaddkkffjjgghh",
    "fdfdjkjkdsdsklklsasalñlñ",
    "ñkñkadadljljsfsfñlkjasdf"
];

let indiceSecuenciaActual = 0;
let secuenciaActual = "";
let cuentaCorrectas = 0;
let cuentaIncorrectas = 0;
let tiempoInicio;
let intervaloTemporizador;
let juegoTerminado = false;

window.onload = function() {
    reiniciarJuego();
};

botonReiniciar.addEventListener('click', reiniciarJuego);
areaTipear.addEventListener("input", manejarEntrada);
document.addEventListener("keydown", function(e) {
    if (e.keyCode === 13) { // Verificar si la tecla presionada es Enter 
        reiniciarJuego();
    }
});

function reiniciarJuego() {
    juegoTerminado = false;
    secuenciaActual = "";
    cuentaCorrectas = 0;
    cuentaIncorrectas = 0;
    generarSecuencias();
    areaPuntuacion.textContent = 'Aciertos: 0 / Fallos: 0';
    areaTiempo.textContent = '';
    tiempoInicio = new Date();
    areaTipear.value = '';
    areaTipear.removeAttribute('disabled');
    areaTipear.focus();

    if (intervaloTemporizador) {
        clearInterval(intervaloTemporizador);
    }

    intervaloTemporizador = setInterval(actualizarTiempo, 100);
}

function generarSecuencias() {
    secuenciaActual = obtenerNuevaSecuencia();
    areaMostrar.innerText = secuenciaActual;
}

function obtenerNuevaSecuencia() {
    return secuencias[indiceSecuenciaActual].repeat(3);
}

function manejarEntrada(e) {
    if (juegoTerminado) {
        if (e.inputType === "insertText") {
            e.preventDefault();
        }
        return;
    }

    const caracterTipeado = areaTipear.value.slice(-1);

    if (caracterTipeado === secuenciaActual.charAt(0)) {
        secuenciaActual = secuenciaActual.substring(1);
        cuentaCorrectas++;
    } else {
        cuentaIncorrectas++;
    }

    areaMostrar.innerText = secuenciaActual;
    areaPuntuacion.textContent = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas;

    if (secuenciaActual.length === 0) {
        mostrarPulsacionesPorMinuto();
        clearInterval(intervaloTemporizador);
    }

    areaTipear.value = '';
}

function mostrarPulsacionesPorMinuto() {
    let ahora = new Date();
    let tiempoTranscurridoMinutos = (ahora - tiempoInicio) / 60000; // Tiempo en minutos
    let tiempoTranscurridoSegundos = (ahora - tiempoInicio) / 1000; // Tiempo en segundos

    juegoTerminado = true;
    areaTipear.setAttribute('disabled', true);

    let pulsacionesPorMinuto = Math.floor(cuentaCorrectas / tiempoTranscurridoMinutos);

    areaTiempo.innerText = 'Tiempo Final: ' + tiempoTranscurridoMinutos.toFixed(2) + ' minutos / ' + tiempoTranscurridoSegundos.toFixed(1) + ' segundos';
    areaPuntuacion.innerText = 'Aciertos: ' + cuentaCorrectas + ' / Fallos: ' + cuentaIncorrectas + ' / Ppm: ' + pulsacionesPorMinuto;

    enviarDatosAlServidor(indiceSecuenciaActual, pulsacionesPorMinuto, cuentaIncorrectas);
}


function actualizarTiempo() {
    let ahora = new Date();
    let tiempoTranscurrido = (ahora - tiempoInicio) / 1000;
    areaTiempo.innerText = 'Tiempo: ' + tiempoTranscurrido.toFixed(1) + ' segundos';
}

function enviarDatosAlServidor(secuencia, ppm, fallos) {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "guardarResultados.php", true);
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xhr.send("secuencia=" + secuencia + "&ppm=" + ppm + "&fallos=" + fallos);
}

document.getElementById("secuencia1Btn").addEventListener('click', function() { cambiarSecuencia(0); });
document.getElementById("secuencia2Btn").addEventListener('click', function() { cambiarSecuencia(1); });
document.getElementById("secuencia3Btn").addEventListener('click', function() { cambiarSecuencia(2); });
document.getElementById("secuencia4Btn").addEventListener('click', function() { cambiarSecuencia(3); });
document.getElementById("secuencia5Btn").addEventListener('click', function() { cambiarSecuencia(4); });

function cambiarSecuencia(indice) {
    indiceSecuenciaActual = indice;
    reiniciarJuego();
}
