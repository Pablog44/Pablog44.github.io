const palabras = [
    "var variableName; - Declara una variable con alcance de función o global",
    "let variableName; - Declara una variable con alcance de bloque",
    "const constantName = value; - Declara una constante con alcance de bloque",
    "function functionName() {} - Define una función",
    "() => {} - Define una función flecha, útil para funciones anónimas y el manejo de 'this'",
    "if (condition) {} - Estructura de control para ejecutar código si se cumple una condición",
    "for (initialization; condition; increment) {} - Bucle for, ejecuta código múltiples veces hasta que una condición deja de cumplirse",
    "array.forEach(element => {}) - Método que llama a una función para cada elemento de un array",
    "JSON.parse(jsonString) - Convierte un string JSON en un objeto JavaScript",
    "JSON.stringify(object) - Convierte un objeto JavaScript en una cadena JSON",
    "document.querySelector(selector) - Selecciona el primer elemento del DOM que coincida con el selector",
    "addEventListener('event', function) - Adjunta un manejador de eventos a un elemento del DOM",
    "window.localStorage - Permite almacenar datos de manera local en el navegador del usuario",
    "Promise - Representa el resultado eventual de una operación asíncrona",
    "async function functionName() {} - Define una función asíncrona que devuelve una promesa",
    "await - Pausa la ejecución de una función asíncrona y espera la resolución de la Promise",
    "console.log(message) - Imprime un mensaje en la consola del navegador, útil para depuración",
    "typeof variable - Determina el tipo de una variable",
    "Array.isArray(variable) - Verifica si una variable es un array",
    "String(variable) - Convierte una variable a tipo string",
    "Number(variable) - Convierte una variable a tipo número",
    "Boolean(variable) - Convierte una variable a tipo booleano",
    "null - Representa la ausencia intencional de cualquier valor de objeto",
    "undefined - Indica que una variable no ha sido asignada",
    "NaN - Representa 'No es un Número', resultado de operaciones matemáticas indefinidas"
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
    for (let i = 0; i < 2; i++) {
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
