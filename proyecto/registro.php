<?php
include 'conexion.php';
session_start();

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $usuario = $_POST['usuario'];
    $correo = $_POST['correo'];
    $contrasena = $_POST['contrasena'];
    $confirmacion_contrasena = $_POST['confirmacion_contrasena'];

    if ($contrasena != $confirmacion_contrasena) {
        echo '<script type="text/javascript">alert("Las contraseñas no coinciden."); window.location.href = "registro.html";</script>';
        exit;
    }

    if (!preg_match("/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/", $contrasena)) {
        echo '<script type="text/javascript">alert("La contraseña debe tener al menos 8 caracteres y contener al menos una letra y un número."); window.location.href = "registro.html";</script>';
        exit;
    }

    // Verifica que el nombre de usuario no esté repetido.
    $sql = "SELECT * FROM usuarios WHERE usuario=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $usuario);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        echo '<script type="text/javascript">alert("El nombre de usuario ya está en uso."); window.location.href = "registro.html";</script>';
        exit;
    }

    $contrasena = password_hash($contrasena, PASSWORD_BCRYPT);

    $sql = "INSERT INTO usuarios (usuario, correo, contrasena) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sss", $usuario, $correo, $contrasena);

    if ($stmt->execute()) {
        $_SESSION['usuario'] = $usuario;
        echo '<script type="text/javascript">alert("Usuario registrado con éxito."); window.location.href = "app.php";</script>';
    } else {
        // No es recomendable mostrar el error real de la base de datos al usuario
        // echo "Error: " . $sql . "<br>" . $conn->error;
        echo '<script type="text/javascript">alert("Error al registrar el usuario."); window.location.href = "registro.html";</script>';
    }
}

$conn->close();
?>
