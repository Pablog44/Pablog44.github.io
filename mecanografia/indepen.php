
<?php
session_start();

// Verifica si el usuario está registrado. Si no, redirige a la página de inicio de sesión.
if (!isset($_SESSION['usuario'])) {
    header('Location: index.html'); // Asegúrate de que este sea el camino correcto hacia tu formulario de inicio de sesión.
    exit();
}
?>
<!DOCTYPE html>
<html>
<head>
<script>
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark-mode');
    }
</script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Aplicación de Mecanografía</title>
    <link rel="stylesheet" href="app.css">
    <link rel="icon" href="logo.png" type="image/png">
</head>
<body>
    <div class="container">
        <h1>Mecanografía</h1>
        <textarea id="displayArea" readonly></textarea>
        <input type="text" id="typingArea" />
        <button id="resetBtn">Reiniciar</button>
        <p id="scoreArea">Aciertos: 0 / Fallos: 0</p>
    </div>
    <footer class="footer">
    <button onclick="location.href='indepen.php'">Inicio</button>
        <button onclick="location.href='palabras.php'">Palabras</button>
        <button onclick="location.href='ejercicios.php'">Ejercicios</button>       
        <button onclick="location.href='palabrastiempo.php'">Palabras aleatorias</button>   
        <button onclick="location.href='tutexto.php'">Tu texto</button>  
        <button onclick="location.href='cerrar.php'">Cerrar Sesión</button>  
    </footer>
    <script src="indepen.js"></script>
</body>
</html>
