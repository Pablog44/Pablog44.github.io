<?php
session_start();
include 'conexion.php';

if (isset($_SESSION['usuario']) && $_SERVER["REQUEST_METHOD"] == "POST") {
    $usuario = $_SESSION['usuario'];
    $pulsaciones = $_POST['pulsaciones'];
    $fallos = $_POST['fallos']; 
    $fecha = date("Y-m-d"); 

    // Cambia el nombre de la tabla a 'independientes'
    $sql = "INSERT INTO independientes (usuario, fecha, pulsaciones, fallos) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssii", $usuario, $fecha, $pulsaciones, $fallos);

    if ($stmt->execute()) {
        echo json_encode(["message" => "Record guardado con éxito en 'independientes'"]);
    } else {
        echo json_encode(["message" => "Error al guardar el record", "error" => $stmt->error]);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode(["message" => "No autorizado"]);
}
?>
