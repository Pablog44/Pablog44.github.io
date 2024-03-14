const alphabet = 'abcdefghijklmnñopqrstuvwxyz-.,';
let generatedText = '';
let correctCount = 0;
let wrongCount = 0;
let currentIndex = 0;
let startTime;
let interval;

const displayArea = document.getElementById('displayArea');
const typingArea = document.getElementById('typingArea');
const scoreArea = document.getElementById('scoreArea');
const resetBtn = document.getElementById('resetBtn');
const timeArea = document.getElementById('timeArea');

window.onload = function() {
    resetText();
    typingArea.focus();  
}

function generateText(length) {
    generatedText = '';
    for (let i = 0; i < length; i++) {
        generatedText += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
}

function displayText() {
    displayArea.textContent = generatedText.slice(currentIndex);
}

typingArea.addEventListener('input', function checkInput(event) {
    const currentKey = event.data;
    const currentChar = generatedText[currentIndex];

    if (currentKey === currentChar) {
        correctCount++;
        currentIndex++;
        if(currentIndex < generatedText.length) {
            displayText();
        } else {
            clearInterval(interval); // Detener el temporizador
            showResults(); // Mostrar resultados
            generateText(50);
            displayText();
            currentIndex = 0;
            resetText(); // Reiniciar el juego
        }
    } else {
        wrongCount++;
    }

    typingArea.value = '';
    scoreArea.textContent = 'Aciertos: ' + correctCount + ' / Fallos: ' + wrongCount;
});

resetBtn.addEventListener('click', resetText);

function resetText() {
    generateText(50);
    displayText();
    correctCount = 0;
    wrongCount = 0;
    currentIndex = 0;
    scoreArea.textContent = 'Aciertos: 0 / Fallos: 0';
    startTime = new Date();
    if(interval) clearInterval(interval);
    interval = setInterval(updateTime, 100); // Actualizar el tiempo cada 100 ms
    typingArea.focus();
}

function updateTime() {
    let currentTime = new Date();
    let elapsed = (currentTime - startTime) / 1000;
    timeArea.textContent = 'Tiempo: ' + elapsed.toFixed(1) + ' segundos';
}

function stopTimer() {
    clearInterval(interval);
}

function showResults() {
    let currentTime = new Date();
    let elapsed = (currentTime - startTime) / 1000;
    let ppm = (correctCount / elapsed) * 60;
    scoreArea.textContent += ' / Ppm: ' + ppm.toFixed(0); // Agregar ppm al área de puntuación
}
