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
    "plátano", "puerta", "queso", "retrato", "relámpago", "rojo", "rosa", "rosado", "sal", "saxofón",
    "silla", "sirena", "sofá", "sol", "sueño", "tijera", "tormenta", "tortilla", "trabajo", "tristeza",
    "tú", "uva", "unicornio", "vampiro", "ventana", "verde", "vida", "viaje", "violeta", "yo"
];


let currentWords = [];
let correctCount = 0;
let wrongCount = 0;

function getNewWord() {
    const index = Math.floor(Math.random() * palabras.length);
    return palabras[index];
}

function generateWords() {
    for (let i = 0; i < 4; i++) {
        currentWords.push(getNewWord());
    }
    displayArea.innerText = currentWords.join(" ");
}

function handleInput(e) {
    if (!e.data) return; // Handles backspace key
    const typedChar = e.data;

    // handle space (word end)
    if (typedChar === ' ') {
        if (currentWords[0].length === 0) {
            correctCount++;
            currentWords.shift();
            currentWords.push(getNewWord());
        } else {
            wrongCount++;
        }
    } else if (typedChar === currentWords[0][0]) {
        currentWords[0] = currentWords[0].substring(1);
        correctCount++;
    } else {
        wrongCount++;
    }

    displayArea.innerText = currentWords.join(" ");
    scoreArea.textContent = 'Aciertos: ' + correctCount + ' / Fallos: ' + wrongCount;
    typingArea.value = '';
}

window.onload = function() {
    generateWords();
    typingArea.focus(); // Automatically selects the text input area
}

const displayArea = document.getElementById("displayArea");
const typingArea = document.getElementById("typingArea");
const scoreArea = document.getElementById('scoreArea');

typingArea.addEventListener("input", handleInput);