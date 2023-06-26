<?php
session_start();

if (!isset($_SESSION['usuario'])) {
    echo "Usuario no autenticado";
    exit;
}

include 'conexion.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $usuario = $_SESSION['usuario'];
    $aciertos = $_POST['aciertos'];

    $sql = "INSERT INTO partidas (usuario, aciertos) VALUES (?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $usuario, $aciertos);
    
    if ($stmt->execute()) {
        echo "Partida guardada con éxito.";
    } else {
        echo "Error: " . $sql . "<br>" . $conn->error;
    }
}

$conn->close();
?>
