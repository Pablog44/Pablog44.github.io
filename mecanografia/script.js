const alphabet = 'abcdefghijklmnñopqrstuvwxyz-.,';
let generatedText = '';
let correctCount = 0;
let wrongCount = 0;
let currentIndex = 0;

const displayArea = document.getElementById('displayArea');
const typingArea = document.getElementById('typingArea');
const scoreArea = document.getElementById('scoreArea');
const resetBtn = document.getElementById('resetBtn');

window.onload = function() {
    generateText(15);
    displayText();
    typingArea.focus();  
}

function generateText(length) {
    for (let i = 0; i < length; i++) {
        generatedText += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
}

function displayText() {
    displayArea.textContent = generatedText.slice(currentIndex, currentIndex + 15);
}

typingArea.addEventListener('keydown', function checkInput(event) {
    const currentKey = event.key;
    const currentChar = generatedText[currentIndex];

    if (currentKey === currentChar) {
        correctCount++;
        currentIndex++;
        displayText();
        typingArea.value = '';
    } else {
        wrongCount++;
    }

    if(currentIndex === generatedText.length) {
        currentIndex = 0;
        generatedText = '';
        generateText(5);
        displayText();
    }

    scoreArea.textContent = 'Aciertos: ' + correctCount + ' / Fallos: ' + wrongCount;
});

resetBtn.addEventListener('click', function resetText() {
    generatedText = '';
    typingArea.value = '';
    correctCount = 0;
    wrongCount = 0;
    currentIndex = 0;
    scoreArea.textContent = 'Aciertos: ' + correctCount + ' / Fallos: ' + wrongCount;
    generateText(15);
    displayText();
    typingArea.focus();
});
