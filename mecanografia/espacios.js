const alphabet = 'abcdefghijklmnñopqrstuvwxyz-.,';
let generatedText = '';
let correctCount = 0;
let wrongCount = 0;

const displayArea = document.getElementById('displayArea');
const typingArea = document.getElementById('typingArea');
const scoreArea = document.getElementById('scoreArea');
const resetBtn = document.getElementById('resetBtn');

window.onload = function() {
    generateText(15);
    displayText();
    typingArea.focus();  
}

function generateCharacter() {
    if (Math.random() < 0.15) { // genera un espacio aproximadamente cada 7 caracteres
        return ' ';
    } else {
        return alphabet[Math.floor(Math.random() * alphabet.length)];
    }
}

function generateText(length) {
    for (let i = 0; i < length; i++) {
        generatedText += generateCharacter();
    }
}

function displayText() {
    displayArea.value = generatedText;
}

typingArea.addEventListener('keydown', function checkInput(event) {
    const currentKey = event.key;
    const currentChar = generatedText[0];

    if (currentKey === currentChar) {
        correctCount++;
        generatedText = generatedText.slice(1);
        generatedText += generateCharacter();
        displayText();
        typingArea.value = '';
    } else {
        wrongCount++;
    }

    scoreArea.textContent = 'Aciertos: ' + correctCount + ' / Fallos: ' + wrongCount;
});

resetBtn.addEventListener('click', function resetText() {
    generatedText = '';
    typingArea.value = '';
    correctCount = 0;
    wrongCount = 0;
    scoreArea.textContent = 'Aciertos: ' + correctCount + ' / Fallos: ' + wrongCount;
    generateText(15);
    displayText();
    typingArea.focus();
});
