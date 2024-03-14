<?php
session_start();
include 'conexion.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $nombre_usuario = $_SESSION['usuario'] ?? 'invitado';
    $texto = $_POST['texto'];
    $ppm = $_POST['ppm'];
    $fallos = $_POST['fallos'];

    // Crear la fecha en el servidor para asegurarse de que tenga el formato correcto
    $fecha = date("Y-m-d");

    // Verificar la fecha antes de insertar
    echo "Fecha a insertar: " . $fecha;

    $sql = "INSERT INTO resultadostext (nombre_usuario, texto, ppm, fallos, fecha) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssiis", $nombre_usuario, $texto, $ppm, $fallos, $fecha);
    $stmt->execute();

    if ($stmt->affected_rows > 0) {
        echo "Resultado guardado con éxito";
    } else {
        echo "Error al guardar el resultado: " . $stmt->error;
    }
}
?>
