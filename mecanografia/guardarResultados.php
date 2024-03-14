<?php
session_start();
include 'conexion.php'; // Archivo de configuración con las credenciales de la base de datos

if (isset($_SESSION['usuario']) && isset($_POST['secuencia']) && isset($_POST['ppm']) && isset($_POST['fallos'])) {
    $secuencia = $_POST['secuencia'];
    $usuario = $_SESSION['usuario']; // Obteniendo el nombre de usuario de la sesión
    $ppm = $_POST['ppm'];
    $fallos = $_POST['fallos'];
    $fecha = date("Y-m-d"); // Fecha actual sin hora

    // Conexión a la base de datos
    $conn = new mysqli($servername, $username, $password, $dbname);

    // Verificar conexión
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    // Preparar y ejecutar la consulta
    $stmt = $conn->prepare("INSERT INTO resultadosejercicios (secuencia, nombre_usuario, ppm, fallos, fecha) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("isiis", $secuencia, $usuario, $ppm, $fallos, $fecha);
    if ($stmt->execute()) {
        echo json_encode(["message" => "Record guardado con éxito"]);
    } else {
        echo json_encode(["message" => "Error al guardar el record", "error" => $stmt->error]);
    }

    $stmt->close();
    $conn->close();
} else {
    echo json_encode(["message" => "Datos incompletos o usuario no autorizado"]);
}
?>
