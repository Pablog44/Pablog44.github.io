<?php
session_start();
include 'conexion.php';

if(isset($_SESSION['usuario']) && $_SESSION['usuario'] === 'admin' && isset($_POST['mensaje_nuevo'])) {
    $mensaje_nuevo = $_POST['mensaje_nuevo'];

    // Actualizar el mensaje en la base de datos
    $stmt = $conn->prepare("UPDATE mensajes_personalizados SET mensaje = ? WHERE id = 1");
    $stmt->bind_param("s", $mensaje_nuevo);
    $stmt->execute();
}

header('Location: app.php');  // Redirige al administrador de vuelta a app.php
exit;
?>
