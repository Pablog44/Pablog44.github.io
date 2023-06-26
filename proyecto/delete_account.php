<?php
session_start();
include 'conexion.php';

if(isset($_SESSION['usuario'])) {
    // Si 'usuario_a_eliminar' está definido, no está vacío y el usuario actual es 'admin', eliminar la cuenta especificada
    if(isset($_POST['usuario_a_eliminar']) && !empty($_POST['usuario_a_eliminar']) && $_SESSION['usuario'] === 'admin' && $_POST['usuario_a_eliminar'] !== 'admin') {
        $usuario = $_POST['usuario_a_eliminar'];

        // Preparar y ejecutar la consulta para eliminar las entradas de 'partidas'
        $stmt = $conn->prepare("DELETE FROM partidas WHERE usuario = ?");
        $stmt->bind_param("s", $usuario);
        $stmt->execute();

        // Preparar y ejecutar la consulta para eliminar las entradas de 'partidas2'
        $stmt = $conn->prepare("DELETE FROM partidas2 WHERE usuario = ?");
        $stmt->bind_param("s", $usuario);
        $stmt->execute();

        // Preparar y ejecutar la consulta para eliminar la cuenta de usuario
        $stmt = $conn->prepare("DELETE FROM usuarios WHERE usuario = ?");
        $stmt->bind_param("s", $usuario);
        $stmt->execute();

        $conn->close();
        header('Location: app.php');  // Redirige al usuario a user.php
        exit;
    }

    // Si el usuario actual no es 'admin', eliminar su propia cuenta
    if ($_SESSION['usuario'] !== 'admin') {
        $usuario = $_SESSION['usuario'];

        // Preparar y ejecutar la consulta para eliminar las entradas de 'partidas'
        $stmt = $conn->prepare("DELETE FROM partidas WHERE usuario = ?");
        $stmt->bind_param("s", $usuario);
        $stmt->execute();

        // Preparar y ejecutar la consulta para eliminar las entradas de 'partidas2'
        $stmt = $conn->prepare("DELETE FROM partidas2 WHERE usuario = ?");
        $stmt->bind_param("s", $usuario);
        $stmt->execute();

        // Preparar y ejecutar la consulta para eliminar la cuenta de usuario
        $stmt = $conn->prepare("DELETE FROM usuarios WHERE usuario = ?");
        $stmt->bind_param("s", $usuario);
        $stmt->execute();

        unset($_SESSION['usuario']);  // Elimina la variable de sesión 'usuario'
        session_destroy();  // Destruye toda la información asociada con la sesión actual
    }
}

$conn->close();
header('Location: index.html');  // Redirige al usuario a index.html
exit;
?>
