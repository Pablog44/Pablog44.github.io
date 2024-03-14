<?php
session_start();

if(isset($_SESSION['usuario'])) {
    unset($_SESSION['usuario']);  // Eliminar la variable de sesión 'usuario'
}

header('Location: index.html');  // Redirigir al usuario a index.html
exit;
?>