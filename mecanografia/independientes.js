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

    // Guardar los resultados en Firestore en la colección "resultados2"
    guardarResultados(pulsacionesPorMinuto, cuentaIncorrectas);
}
function guardarResultados(ppm, fallos) {
    // Verificar si Firebase ha sido inicializado
    if (!firebase.apps.length) {
        console.log("Firebase no ha sido inicializado. No se guardará el resultado.");
        return; // Salir de la función si Firebase no está inicializado
    }

    const user = firebase.auth().currentUser;

    if (user) {
        const db = firebase.firestore();
        db.collection("resultados2").add({
            uid: user.uid,
            ppm: ppm,
            fallos: fallos,
            fecha: firebase.firestore.Timestamp.fromDate(new Date())
        }).then(function(docRef) {
            console.log("Documento escrito con ID: ", docRef.id);
        }).catch(function(error) {
            console.error("Error añadiendo el documento: ", error);
        });
    } else {
        console.log("No hay usuario autenticado para guardar los resultados");
    }
}
