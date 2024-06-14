const palabras = [

        { espanol: "yo", ingles: "I", frances: "je", catalan: "jo", italiano: "io" },
        { espanol: "tú", ingles: "you", frances: "tu", catalan: "tu", italiano: "tu" },
        { espanol: "él", ingles: "he", frances: "il", catalan: "ell", italiano: "lui" },
        { espanol: "ella", ingles: "she", frances: "elle", catalan: "ella", italiano: "lei" },
        { espanol: "ello", ingles: "it", frances: "il", catalan: "això", italiano: "esso" },
        { espanol: "nosotros", ingles: "we", frances: "nous", catalan: "nosaltres", italiano: "noi" },
        { espanol: "ellos", ingles: "they", frances: "ils", catalan: "ells", italiano: "loro" },
        { espanol: "me", ingles: "me", frances: "moi", catalan: "mi", italiano: "mi" },
        { espanol: "le", ingles: "him", frances: "lui", catalan: "li", italiano: "lui" },
        { espanol: "la", ingles: "her", frances: "elle", catalan: "li", italiano: "lei" },
        { espanol: "nos", ingles: "us", frances: "nous", catalan: "nosaltres", italiano: "noi" },
        { espanol: "les", ingles: "them", frances: "les", catalan: "els", italiano: "loro" },
        { espanol: "mi", ingles: "my", frances: "mon", catalan: "el meu", italiano: "mio" },
        { espanol: "tu", ingles: "your", frances: "ton", catalan: "el teu", italiano: "tuo" },
        { espanol: "su", ingles: "his", frances: "son", catalan: "el seu", italiano: "suo" },
        { espanol: "su", ingles: "its", frances: "son", catalan: "el seu", italiano: "suo" },
        { espanol: "nuestro", ingles: "our", frances: "notre", catalan: "el nostre", italiano: "nostro" },
        { espanol: "su", ingles: "their", frances: "leur", catalan: "el seu", italiano: "loro" },
        { espanol: "qué", ingles: "what", frances: "quoi", catalan: "què", italiano: "che" },
        { espanol: "quién", ingles: "who", frances: "qui", catalan: "qui", italiano: "chi" },
        { espanol: "dónde", ingles: "where", frances: "où", catalan: "on", italiano: "dove" },
        { espanol: "cuándo", ingles: "when", frances: "quand", catalan: "quan", italiano: "quando" },
        { espanol: "por qué", ingles: "why", frances: "pourquoi", catalan: "per què", italiano: "perché" },
        { espanol: "cómo", ingles: "how", frances: "comment", catalan: "com", italiano: "come" },
        { espanol: "cuál", ingles: "which", frances: "lequel", catalan: "què", italiano: "quale" },
        { espanol: "cuyo", ingles: "whose", frances: "à qui", catalan: "de qui", italiano: "di chi" },
        { espanol: "este", ingles: "this", frances: "ceci", catalan: "aquest", italiano: "questo" },
        { espanol: "ese", ingles: "that", frances: "cela", catalan: "això", italiano: "quello" },
            { ingles: "these", espanol: "estos", frances: "ces", catalan: "aquests", italiano: "questi" },
            { ingles: "those", espanol: "esos", frances: "ceux", catalan: "aquells", italiano: "quelli" },
            { ingles: "here", espanol: "aquí", frances: "ici", catalan: "aquí", italiano: "qui" },
            { ingles: "there", espanol: "allí", frances: "là", catalan: "allà", italiano: "lì" },
            { ingles: "all", espanol: "todo", frances: "tout", catalan: "tot", italiano: "tutto" },
            { ingles: "some", espanol: "algunos", frances: "certains", catalan: "alguns", italiano: "alcuni" },
            { ingles: "no", espanol: "no", frances: "non", catalan: "no", italiano: "no" },
            { ingles: "any", espanol: "cualquier", frances: "aucun", catalan: "qualsevol", italiano: "qualsiasi" },
            { ingles: "every", espanol: "cada", frances: "chaque", catalan: "cada", italiano: "ogni" },
            { ingles: "each", espanol: "cada uno", frances: "chaque", catalan: "cadascun", italiano: "ciascuno" },
            { ingles: "few", espanol: "pocos", frances: "peu", catalan: "pocs", italiano: "pochi" },
            { ingles: "many", espanol: "muchos", frances: "beaucoup", catalan: "molts", italiano: "molti" },
            { ingles: "much", espanol: "mucho", frances: "beaucoup", catalan: "molt", italiano: "molto" },
            { ingles: "little", espanol: "poco", frances: "peu", catalan: "poc", italiano: "poco" },
            { ingles: "more", espanol: "más", frances: "plus", catalan: "més", italiano: "più" },
            { ingles: "most", espanol: "la mayoría", frances: "la plupart", catalan: "la majoria", italiano: "la maggior parte" },
            { ingles: "other", espanol: "otro", frances: "autre", catalan: "altre", italiano: "altro" },
            { ingles: "such", espanol: "tal", frances: "tel", catalan: "tal", italiano: "tale" },
            { ingles: "even", espanol: "incluso", frances: "même", catalan: "fins i tot", italiano: "anche" },
            { ingles: "not", espanol: "no", frances: "pas", catalan: "no", italiano: "non" },
            { ingles: "then", espanol: "entonces", frances: "alors", catalan: "llavors", italiano: "poi" },
            { ingles: "if", espanol: "si", frances: "si", catalan: "si", italiano: "se" },
            { ingles: "because", espanol: "porque", frances: "parce que", catalan: "perquè", italiano: "perché" },
            { ingles: "as", espanol: "como", frances: "comme", catalan: "com", italiano: "come" },
            { ingles: "until", espanol: "hasta", frances: "jusqu'à", catalan: "fins", italiano: "fino a" },
            { ingles: "while", espanol: "mientras", frances: "tandis que", catalan: "mentre", italiano: "mentre" },
            { ingles: "of", espanol: "de", frances: "de", catalan: "de", italiano: "di" },
            { ingles: "at", espanol: "en", frances: "à", catalan: "a", italiano: "a" },
            { ingles: "in", espanol: "en", frances: "dans", catalan: "a", italiano: "in" },
            { ingles: "on", espanol: "en", frances: "sur", catalan: "a", italiano: "su" },
            { ingles: "with", espanol: "con", frances: "avec", catalan: "amb", italiano: "con" },
            { ingles: "by", espanol: "por", frances: "par", catalan: "per", italiano: "da" },
            { ingles: "about", espanol: "sobre", frances: "sur", catalan: "sobre", italiano: "su" },
            { ingles: "against", espanol: "contra", frances: "contre", catalan: "contra", italiano: "contro" },
            { ingles: "between", espanol: "entre", frances: "entre", catalan: "entre", italiano: "tra" },
            { ingles: "into", espanol: "en", frances: "dans", catalan: "dins", italiano: "in" },
            { ingles: "through", espanol: "a través de", frances: "à travers", catalan: "a través de", italiano: "attraverso" },
            { ingles: "during", espanol: "durante", frances: "pendant", catalan: "durant", italiano: "durante" },
            { ingles: "before", espanol: "antes de", frances: "avant", catalan: "abans de", italiano: "prima di" },
            { ingles: "after", espanol: "después de", frances: "après", catalan: "després de", italiano: "dopo" },
            { ingles: "above", espanol: "encima de", frances: "au-dessus de", catalan: "sobre", italiano: "sopra" }
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
    db.collection("resultados3").add({
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
