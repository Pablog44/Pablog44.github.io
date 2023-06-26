<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>App</title>
    <link rel="stylesheet" type="text/css" href="styles.css">
    <script>
        function confirmDeletion() {
            if (window.confirm("¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.")) {
                location.href = 'delete_account.php';
            }
        }
    </script>
    <link rel="icon" href="5 puntas v3.png" type="image/png">
</head>
<body>
    <div class="container">
        <div class="greeting">
            <?php
            session_start();

            if (!isset($_SESSION['usuario'])) {
                header("Location: index.html");
                exit;
            }
            $nombre_usuario = $_SESSION['usuario'];

            // Obtener el mensaje personalizado de la base de datos
            include 'conexion.php';
            $stmt = $conn->prepare("SELECT mensaje FROM mensajes_personalizados WHERE id = 1");
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $mensaje = $row['mensaje'];

            echo "<h2>" . $mensaje . " " . $nombre_usuario . "</h2>";
            ?>
        </div>

        <div class="button-container">
            <button onclick="location.href='memoriza_numeros/memoriza_numeros.php'">Memoriza números</button>
            <button onclick="location.href='memoriza_palabras/memoriza_palabras.php'">Memoriza palabras</button>
            <button onclick="location.href='Resultados.php'">Resultados</button>
            <button onclick="location.href='logout.php'">Cerrar Sesión</button> 

            <?php if ($nombre_usuario !== 'admin'): ?>
                <button onclick="confirmDeletion()">Eliminar Cuenta</button>
            <?php else: ?>
                <form action="delete_account.php" method="post">
                    <input type="text" name="usuario_a_eliminar" placeholder="Nombre de usuario a eliminar">
                    <input type="submit" value="Eliminar Cuenta de Usuario">
                </form>
                <form action="cambiar_mensaje.php" method="post">
                    <input type="text" name="mensaje_nuevo" placeholder="Nuevo mensaje de saludo">
                    <input type="submit" value="Cambiar mensaje">
                </form>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
