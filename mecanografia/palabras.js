const words = [
    "hola", "que", "tal", "como", "esta", "yo", "muy", "bien", "tu", "otro", "dia", "soleado", "calor", "frio",
    "fuego", "hielo", "detras", "delante", "arriba", "abajo", "champu", "cepillo", "coleta", "nublado","vida",
    "salud","mundo","amor","odio","felicidad","tristeza","alegría","envidia","miedo","esperanza","sueño",
    "viaje","cine","libro","música","juego","deporte","naturaleza","mar","sol","luna","cielo","estrella",
    "ciudad","país","casa","perro","gato","auto","comida","agua","aire","fuego","tierra","dinero",
    "amigo","familia","trabajo"
];

const displayArea = document.getElementById("displayArea");
const typingArea = document.getElementById("typingArea");
const scoreArea = document.getElementById('scoreArea');

let currentWords = [];
let correctCount = 0;
let wrongCount = 0;

function getNewWord() {
    const index = Math.floor(Math.random() * words.length);
    return words[index];
}

function generateWords() {
    for (let i = 0; i < 4; i++) {
        currentWords.push(getNewWord());
    }
    displayArea.innerText = currentWords.join(" ");
}

function handleInput(e) {
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

typingArea.addEventListener("input", handleInput);
