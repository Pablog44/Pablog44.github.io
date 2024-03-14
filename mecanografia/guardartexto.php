<?php
session_start();
include 'conexion.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $texto = $_POST['texto'];
    $nombre_usuario = $_SESSION['usuario'] ?? 'invitado';

    // Primero, verifica si el texto ya existe en la base de datos
    $sql_verificar = "SELECT * FROM textos WHERE nombre_usuario = ? AND texto = ?";
    $stmt_verificar = $conn->prepare($sql_verificar);
    $stmt_verificar->bind_param("ss", $nombre_usuario, $texto);
    $stmt_verificar->execute();
    $resultado = $stmt_verificar->get_result();

    if ($resultado->num_rows > 0) {
        echo "El texto ya existe y no se guardará nuevamente.";
    } else {
        // El texto no existe, procede a insertarlo
        $sql_insertar = "INSERT INTO textos (nombre_usuario, texto) VALUES (?, ?)";
        $stmt_insertar = $conn->prepare($sql_insertar);
        $stmt_insertar->bind_param("ss", $nombre_usuario, $texto);
        $stmt_insertar->execute();

        if ($stmt_insertar->affected_rows > 0) {
            echo "Texto guardado con éxito";
        } else {
            echo "Error al guardar el texto";
        }
    }
}
?>
