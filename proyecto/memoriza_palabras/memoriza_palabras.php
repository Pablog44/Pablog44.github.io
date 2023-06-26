<?php
session_start();

if (!isset($_SESSION['usuario'])) {
    header("Location: ../index.html");
    exit;
}
// Accede al nombre de usuario almacenado en la sesión
$nombre_usuario = $_SESSION['usuario'];

?>
<html lang="en">
<head>
    
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="memoriza_palabras.css">
    <title>Juego de Memoria</title>
</head>
<body>
<a href="../app.php">
        <img class="logo" src="../5 puntas v3.png" alt="Logo del sitio"> <!-- Aquí es donde se añade el logo -->
    </a>
    <div class="center">
            <h3> <?php echo $nombre_usuario ?>, tienes que memorizar las palabras y despues hacer click a los botones en orden</h3>
    </div>
    <div class="container">
        <h1>Juego de Memoria</h1>

        <div id="wordDisplay" class="word-display"></div>
        <div id="buttonContainer" class="button-container hidden"></div>
        <button id="retryButton" class="retry-button hidden" onclick="startGame()">Vuelve a intentarlo</button>
        <div id="scoreDisplay" class="score-display hidden"></div>
        <div id="fireworksContainer" class="fireworks-container"></div>
    </div>
    <script src="memoriza_palabras.js"></script>
    <footer class="footer">

      <button onclick="location.href='../app.php'">Inicio</button>
      <button onclick="location.href='../memoriza_numeros/memoriza_numeros.php'">Memoriza numeros</button>
      <button onclick="location.href='../Resultados.php'">Resultados</button>
    </footer>

</body>
</html>
