<?php
session_start();

if (!isset($_SESSION['usuario'])) {
    header("Location: ../index.html");
    exit;
}

$nombre_usuario = $_SESSION['usuario'];
$mensaje = $nombre_usuario . ", tienes que memorizar el orden de los numeros";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Juego de Memoria</title>
    <link rel="stylesheet" href="memoriza_numeros.css">
    <link rel="icon" href="../5 puntas v3.png" type="image/png">
</head>
<body>
    <a href="../app.php" class="logo">
       <img src="../5 puntas v3.png" alt="Logo del sitio" style="width: 100px; height: auto;">
    </a>
    <div class="center">
        <h3><?php echo $mensaje; ?></h3>
    </div>
    <div class="container">
        <h1>Juego de Memoria</h1>
        
        <div id="numeros"></div>
        <br>
        <input type="text" id="respuesta">
        <button id="botonComprobar" onclick="comprobarRespuesta()">Comprobar</button>
        <button id="botonReintentar" onclick="reiniciarJuego()" style="display: none;">Volver a intentarlo</button>
        <p id="resultado"></p>
        <p id="numerosCorrectos"></p>  <!-- Agrega esta línea -->
        <div id="fireworksContainer" class="fireworks-container"></div>
    </div>
    <script src="memoriza_numeros.js"></script>
    <footer class="footer">
        <button onclick="location.href='../app.php'" >Inicio</button>
        <button onclick="location.href='../memoriza_palabras/memoriza_palabras.php'" >Memoriza palabras</button>
        <button onclick="location.href='../Resultados.php'">Resultados</button>
    </footer>
</body>
</html>
