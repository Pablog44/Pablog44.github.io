const sequence = 'qazwsxedcrfvtgbyhnujmik,ol.pñ-';
let generatedText = '';
let correctCount = 0;
let wrongCount = 0;
let currentIndex = 0;

const displayArea = document.getElementById('displayArea');
const typingArea = document.getElementById('typingArea');
const scoreArea = document.getElementById('scoreArea');
const resetBtn = document.getElementById('resetBtn');

window.onload = function() {
    generateText(5); // This number will determine how many times the sequence is repeated
    displayText();
    typingArea.focus();
}

function generateText(repetitions) {
    for (let i = 0; i < repetitions; i++) {
        generatedText += sequence;
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
    generateText(5);
    displayText();
    typingArea.focus();

});
