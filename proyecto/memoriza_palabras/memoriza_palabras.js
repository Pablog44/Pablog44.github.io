// Declara una lista de palabras y algunas variables iniciales
const words = [
    "hola", "que", "tal", "como", "esta", "yo", "muy", "bien", "tu", "otro", "dia", "soleado", "calor", "frio",
    "fuego", "hielo", "detras", "delante", "arriba", "abajo", "champu", "cepillo", "coleta", "nublado","vida",
    "salud","mundo","amor","odio","felicidad","tristeza","alegría","envidia","miedo","esperanza","sueño",
    "viaje","cine","libro","música","juego","deporte","naturaleza","mar","sol","luna","cielo","estrella",
    "ciudad","país","casa","perro","gato","auto","comida","agua","aire","fuego","tierra","dinero",
    "amigo","familia","trabajo"
];
let buttonCounter = 1;
let currentWords = [];
let currentLevel = 3;
let currentIndex = 0;
let aciertos = 0; 
// Inicia el juego
function startGame() {
    document.getElementById("retryButton").classList.add("hidden");
    document.getElementById("scoreDisplay").classList.add("hidden");
    currentIndex = 0;
    currentLevel = 3;
    aciertos = 0;
    document.getElementById("retryButton").onclick = function() {
        document.getElementById("wordDisplay").innerText = "";
        startGame();
    }
    showWords();
}
// Elige palabras aleatorias y las muestra durante un tiempo, luego las oculta
function showWords() {
    currentWords = getRandomWords(currentLevel);
    buttonCounter = 1;  // Resetear buttonCounter a 1
    document.getElementById("wordDisplay").innerText = currentWords.join(" ");
    setTimeout(() => {
        document.getElementById("wordDisplay").innerText = "";
        showButtons();
    }, 3000);
}
// Muestra los botones con las palabras en un orden aleatorio
function showButtons() {
    const buttonContainer = document.getElementById("buttonContainer");
    buttonContainer.innerHTML = "";
    buttonContainer.classList.remove("hidden");

    const shuffledWords = shuffleArray(currentWords.slice());
    shuffledWords.forEach((word) => {
        const button = document.createElement("button");
        button.innerText = word;
        button.onclick = () => {
            button.innerText = buttonCounter;
            buttonCounter++;
            checkAnswer(currentWords.indexOf(word));
        };
        buttonContainer.appendChild(button);
    });
}
// Comprueba si la respuesta dada es correcta
function checkAnswer(index) {
    if (index === currentIndex) {
        currentIndex++;
        if (currentIndex === currentLevel) {
            showFireworks();
            setTimeout(hideFireworks, 1000);
            setTimeout(hideButtons, 1000); 
            currentLevel++;
            currentIndex = 0;
            aciertos++; 
            setTimeout(showWords, 1000);
        }
    } else {
        document.getElementById("wordDisplay").innerText = currentWords.join(" ");
        document.getElementById("buttonContainer").classList.add("hidden");
        document.getElementById("retryButton").classList.remove("hidden");
        document.getElementById("scoreDisplay").innerText = "has conseguido " + aciertos + " aciertos" ;
        document.getElementById("scoreDisplay").classList.remove("hidden");
        guardarPartida(aciertos); // Llama a la función guardarPartida cuando el juego termine
    }
}
// Muestra fuegos artificiales
function showFireworks() {
    const container = document.getElementById("fireworksContainer");
    for (let i = 0; i < 100; i++) {
        const firework = document.createElement("div");
        firework.className = "firework";
        if (Math.random() < 0.5) {
            firework.classList.add("red");
        }
        firework.style.left = Math.random() * 100 + "vw";
        firework.style.animationDuration = Math.random() * 1 + 0.5 + "s";
        firework.style.animationDelay = Math.random() * 1 + "s";
        firework.style.bottom = Math.random() * 100 + "vh";
        container.appendChild(firework);
    }
}
// Limpia el contenedor de fuegos artificiales
function hideFireworks() {
    const container = document.getElementById("fireworksContainer");
    container.innerHTML = "";
}
// Limpia el contenedor de botones
function hideButtons() {
    const buttonContainer = document.getElementById("buttonContainer");
    buttonContainer.innerHTML = "";
}
// Elige palabras aleatorias de la lista
function getRandomWords(count) {
    const shuffledWords = shuffleArray(words.slice());
    return shuffledWords.slice(0, count);
}
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
// Guarda la puntuación del juego enviando una petición a un archivo PHP
function guardarPartida(aciertos) {  
    fetch('../guardar_partida2.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `aciertos=${aciertos}` 
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text();
    })
    .then(data => console.log(data))
    .catch((error) => console.error('Error:', error));
}
// Inicia el juego
startGame();