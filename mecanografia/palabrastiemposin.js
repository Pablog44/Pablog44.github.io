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
const areaMostrar = document.getElementById("displayArea2");
const areaTipear = document.getElementById("typingArea");
const areaPuntuacion = document.getElementById("scoreArea");
const botonReiniciar = document.getElementById("resetBtn");
const areaTiempo = document.getElementById("timeArea");

// Variables de juego
let textoJuego = '';
let indiceActual = 0;
let cuentaIncorrectas = 0;
let errores = [];
let tiempoInicio;
let intervaloTemporizador;
let juegoFinalizado = false;

function obtenerNuevaPalabra() {
    const indice = Math.floor(Math.random() * palabras.length);
    return palabras[indice];
}

function generarTextoJuego() {
    let palabrasTexto = [];
    for (let i = 0; i < 20; i++) { // Generamos 20 palabras
        palabrasTexto.push(obtenerNuevaPalabra());
    }
    // Asegúrate de que el punto se concatene directamente después de la última palabra
    textoJuego = palabrasTexto.join(" ") + "."; // Elimina el espacio antes del punto
    mostrarPalabrasYErrores();
}

function mostrarPalabrasYErrores() {
    let textoVisible = textoJuego.substring(indiceActual)
        .replace(/ /g, '<span style="color: white;">_</span>'); // Reemplaza los espacios con guiones bajos blancos para visualización
    areaMostrar.innerHTML = errores.join("") + textoVisible;
}

function reiniciarJuego() {
    juegoFinalizado = false; // Restablece el estado del juego
    textoJuego = '';
    indiceActual = 0;
    cuentaIncorrectas = 0;
    errores = [];
    generarTextoJuego();
    actualizarPuntuacion(); // Es seguro llamarla aquí porque acabamos de restablecer juegoFinalizado a false
    areaTiempo.textContent = '';
    tiempoInicio = new Date();
    areaTipear.value = '';
    areaTipear.focus();
    areaTipear.disabled = false;

    if (intervaloTemporizador) {
        clearInterval(intervaloTemporizador);
    }

    intervaloTemporizador = setInterval(function() {
        let ahora = new Date();
        let tiempoTranscurrido = (ahora - tiempoInicio) / 1000;
        areaTiempo.innerText = 'Tiempo: ' + tiempoTranscurrido.toFixed(1) + ' segundos';
    }, 100);
}
function actualizarPuntuacion() {
    if (!juegoFinalizado) { // Solo actualiza si el juego no ha finalizado
        areaPuntuacion.textContent = 'Aciertos: ' + indiceActual + ' / Fallos: ' + cuentaIncorrectas;
    }
}

function manejarEntrada(e) {
    const caracterTipeado = e.data;

    if (errores.length > 0) {
        e.preventDefault();
        if (caracterTipeado) {
            errores.push('<span class="error">X</span>');
            cuentaIncorrectas++;
        }
    } else {
        if (caracterTipeado === textoJuego[indiceActual]) {
            indiceActual++;
            if (caracterTipeado === '.' || indiceActual === textoJuego.length) {
                finalizarJuego();
            }
        } else {
            cuentaIncorrectas++;
            errores.push('<span class="error">X</span>');
        }
    }

    mostrarPalabrasYErrores();
    actualizarPuntuacion();
    areaTipear.value = ''; // Limpia el área de entrada después de cada tecla presionada
}


function finalizarJuego() {
    juegoFinalizado = true; // Actualiza el estado a finalizado
    clearInterval(intervaloTemporizador); // Detiene el temporizador
    mostrarPulsacionesPorMinuto();
    areaTipear.disabled = true; // Deshabilita el área de entrada
}

function manejarRetroceso(e) {
    if (e.key === 'Backspace') {
        e.preventDefault();
        areaTipear.value = '';

        // Si hay errores, permite borrarlos independientemente del valor de indiceActual
        if (errores.length > 0) {
            errores.pop();
            cuentaIncorrectas = Math.max(0, cuentaIncorrectas - 1);
        // Permite retroceder en el texto si no hay errores y no se ha llegado al inicio del texto
        } else if (indiceActual > 0 && textoJuego[indiceActual - 1] !== '.') {
            indiceActual = Math.max(0, indiceActual - 1);
        }

        mostrarPalabrasYErrores();
        actualizarPuntuacion();
    }
}

function mostrarPulsacionesPorMinuto() {
    let ahora = new Date();
    let tiempoTranscurrido = (ahora - tiempoInicio) / 1000; // Tiempo en segundos
    let ppm = Math.floor((indiceActual / tiempoTranscurrido) * 60); // Calcula las ppm

    // Actualiza el área de puntuación para mostrar las ppm
    areaPuntuacion.textContent = 'Aciertos: ' + indiceActual + ' / Fallos: ' + cuentaIncorrectas + ' / Ppm: ' + ppm;
    
    const user = firebase.auth().currentUser;
    if (user) {
        // Usuario está autenticado, guardamos sus resultados
        guardarResultados(user.uid, ppm, firebase.firestore.Timestamp.fromDate(new Date())); // Usa la variable 'ppm' aquí
    } else {
        console.log("No hay usuario autenticado para guardar los resultados");
    }
}


// Event listeners para manejar la entrada de texto y el botón de reinicio
areaTipear.addEventListener("input", manejarEntrada);
botonReiniciar.addEventListener('click', reiniciarJuego);

// Event listener para manejar la tecla de retroceso
areaTipear.addEventListener("keydown", manejarRetroceso);

// Event listener para la tecla Enter a nivel de documento
document.addEventListener("keyup", function(e) {
    if (e.key === "Enter" || e.keyCode === 13) {
        e.preventDefault();
        reiniciarJuego();
    }
});

// Función para guardar los resultados del usuario en Firestore
function guardarResultados(uid, ppm, fecha) {
    const db = firebase.firestore();
    db.collection("resultados3").add({
        uid: uid,
        ppm: ppm,
        fecha: fecha
    }).then(function(docRef) {
        console.log("Documento escrito con ID: ", docRef.id);
    }).catch(function(error) {
        console.error("Error añadiendo el documento: ", error);
    });
}

window.onload = function() {
    reiniciarJuego();
};