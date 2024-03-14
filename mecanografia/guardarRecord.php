<?php
session_start();
include 'conexion.php';

if (isset($_SESSION['usuario']) && $_SERVER["REQUEST_METHOD"] == "POST") {
    $usuario = $_SESSION['usuario'];
    $pulsaciones = $_POST['pulsaciones'];
    $fallos = $_POST['fallos']; 
    $fecha = date("Y-m-d"); 

    $sql = "INSERT INTO records (usuario, fecha, pulsaciones, fallos) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssii", $usuario, $fecha, $pulsaciones, $fallos); 
    if ($stmt->execute()) {
        echo json_encode(["message" => "Record guardado con éxito"]);
    } else {
        echo json_encode(["message" => "Error al guardar el record", "error" => $stmt->error]);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode(["message" => "No autorizado"]);
}
?>
