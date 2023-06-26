// Declara variables
let numeros = [];
let cantidadNumeros = 3;
let tiempoVisible = 3000;
let aciertos = 0;
// Genera una serie de números aleatorios y muestra estos números
function generarNumeros() {
    numeros = [];
    for (let i = 0; i < cantidadNumeros; i++) {
        numeros.push(Math.floor(Math.random() * 10));
    }
    mostrarNumeros();
}
// Muestra los números generados y luego los oculta después de un cierto período de tiempo
function mostrarNumeros() {
    document.getElementById('numeros').innerText = numeros.join(' ');

    // Deshabilita el botón y el input
    document.getElementById('botonComprobar').disabled = true;
    document.getElementById('respuesta').disabled = true;
    // Limpia el texto y habilita el botón y el input después de un cierto período de tiempo
    setTimeout(() => {
        document.getElementById('numeros').innerText = '';
        document.getElementById('botonComprobar').disabled = false;
        document.getElementById('respuesta').disabled = false;
        document.getElementById('respuesta').focus();
    }, tiempoVisible);
}
// Comprueba si la tecla presionada es 'Enter'
document.getElementById('respuesta').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        comprobarRespuesta();
    }
});
// Comprueba si la respuesta dada es correcta
function comprobarRespuesta() {
    let respuesta = document.getElementById('respuesta').value;

    if (respuesta === numeros.join('')) {
        aciertos++;
        cantidadNumeros++;
        showFireworks();

        document.getElementById('respuesta').value = '';
        generarNumeros();
        setTimeout(hideFireworks, 1000);
        setTimeout(hideButtons, 1000); 
// Si la respuesta es incorrecta, muestra el número de aciertos y los números correctos       
    } else {
        document.getElementById('resultado').innerText = 'Has conseguido ' + aciertos + ' aciertos';
        document.getElementById('numerosCorrectos').innerText = 'Los números correctos eran: ' + numeros.join(' '); // Mostrar números correctos
        document.getElementById('botonComprobar').style.display = 'none';
        document.getElementById('botonReintentar').style.display = 'inline-block';
        guardarPartida(aciertos);
    }
}
// Muestra fuegos artificiales al adivinar correctamente
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
// Reinicia el juego
function reiniciarJuego() {
    aciertos = 0;
    cantidadNumeros = 3;
    document.getElementById('resultado').innerText = '';
    document.getElementById('numerosCorrectos').innerText = ''; // Borrar los números correctos
    document.getElementById('respuesta').value = '';
    document.getElementById('botonComprobar').style.display = 'inline-block';
    document.getElementById('botonComprobar').disabled = false;
    document.getElementById('respuesta').disabled = false;
    document.getElementById('botonReintentar').style.display = 'none';
    generarNumeros();
}
// Guarda la partida actual 
function guardarPartida(aciertos) {
    fetch('../guardar_partida.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `aciertos=${aciertos}`
    }).then(response => response.text())
      .then(data => console.log(data))
      .catch((error) => console.error('Error:', error));
}
// Inicia el juego generando los primeros números
generarNumeros();
