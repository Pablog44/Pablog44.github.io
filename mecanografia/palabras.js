const palabras = [
    "hola", "que", "tal", "como", "esta", "yo", "muy", "bien", "tu", "otro", "dia", "soleado", "calor", "frio",
    "fuego", "hielo", "detras", "delante", "arriba", "abajo", "champu", "cepillo", "coleta", "nublado","vida",
    "salud","mundo","amor","odio","felicidad","tristeza","alegría","envidia","miedo","esperanza","sueño",
    "viaje","cine","libro","música","juego","deporte","naturaleza","mar","sol","luna","cielo","estrella",
    "ciudad","país","casa","perro","gato","auto","comida","agua","aire","fuego","tierra","dinero",
    "amigo","familia","trabajo",
    "piedra", "papel", "tijera", "rosa", "margarita", "cactus", "nube", "tormenta", "relámpago", "café", 
    "té", "azúcar", "sal", "pimienta", "bocadillo", "queso", "pan", "leche", "uva", "manzana", "naranja", 
    "plátano", "kiwi", "morado", "azul", "verde", "amarillo", "rojo", "blanco", "negro", "gris", "rosado",
    "cortina", "puerta", "ventana", "escalera", "silla", "sofá", "cama", "almohada", "edredón", "pintura",
    "retrato", "guitarra", "piano", "batería", "saxofón", "violín", "flauta", "arco", "flecha", "escudo",
    "espada", "casco", "armadura", "dragón", "hada", "sirena", "unicornio", "duende", "bruja", "vampiro"
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