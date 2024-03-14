<?php
session_start();
include 'conexion.php';

// Verifica si el usuario es administrador
if (!isset($_SESSION['es_admin']) || $_SESSION['es_admin'] != 1) {
    header('Location: index.html');
    exit();
}

if (isset($_POST['actualizar_mensaje'])) {
    $nuevo_mensaje = $_POST['nuevo_mensaje'];


    file_put_contents('mensaje_bienvenida.txt', $nuevo_mensaje);

    // Redirecciona de nuevo al panel de administración
    header('Location: panel_administrador.php');
    exit();
}
?>
