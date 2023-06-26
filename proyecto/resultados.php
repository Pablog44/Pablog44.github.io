<?php
session_start();

if (!isset($_SESSION['usuario'])) {
    header("Location: index.html");
    exit;
}

require_once 'conexion.php';

$nombre_usuario = $_SESSION['usuario'];

// Consulta para la tabla 'partidas'
$sql_usuario = "SELECT aciertos, fecha FROM partidas WHERE usuario = ?";
$stmt_usuario = $conn->prepare($sql_usuario);
$stmt_usuario->bind_param('s', $nombre_usuario);
$stmt_usuario->execute();
$result_usuario = $stmt_usuario->get_result();

// Consulta para la tabla 'partidas2'
$sql_usuario2 = "SELECT aciertos, fecha FROM partidas2 WHERE usuario = ?";
$stmt_usuario2 = $conn->prepare($sql_usuario2);
$stmt_usuario2->bind_param('s', $nombre_usuario);
$stmt_usuario2->execute();
$result_usuario2 = $stmt_usuario2->get_result();

// Consulta para el top 25 de la tabla 'partidas'
$sql_top = "SELECT usuario, aciertos, fecha FROM partidas ORDER BY aciertos DESC LIMIT 25";
$result_top = $conn->query($sql_top);

// Consulta para el top 25 de la tabla 'partidas2'
$sql_top2 = "SELECT usuario, aciertos, fecha FROM partidas2 ORDER BY aciertos DESC LIMIT 25";
$result_top2 = $conn->query($sql_top2);

?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Resultados</title>
    <style>
        body {
            padding: 5px;
            background: url(5458940.jpg) no-repeat center center fixed;
            background-size: cover;
            font-family: Arial, sans-serif; 
        }
        table {
            border-collapse: collapse;
            border-collapse: collapse;
            width: calc(100% - 160px); 
            margin-left: 80px;
            margin-right: 80px; 
        }
        th, td {
            border: 1px solid black;
            padding: 8px;
            text-align: center;
        }
        h1 {
            text-align: center;
            color: #00008B; 
        }
        .container {
            margin-top: 40px; 
            margin-bottom: 60px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-left: 60px;
            margin-right: 60px; 
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
        }
        .container1 {
            margin-top: 140px; 
            margin-bottom: 60px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-left: 60px;
            margin-right: 60px; 
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
        }
        @media (max-width: 600px) {
            .container {
                width: 100%;
            }
        }
        .logo {
            position: absolute;
            top: 20px;
            left: 20px;
            width: 100px; 
        }
        .button-container {
            justify-content: center;
            align-items: center;
            display: flex;
            margin-top: 40px;
        }
        button {
            background-color: #00008B;
            color: #fff;
            font-size: 1.1rem;
            font-weight: bold;
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #119cff;
            color: white;
        }
        .footer {
            margin-top: 20px; /* Añade un margen superior para separarlo del contenido anterior */
            width: calc(100% - 20px);
            color: #212529;
            text-align: center;
            padding: 10px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1),0 0 10px black;
            text-align: center;
        }
        .footer button {
            margin: 0 20px;
        }
    </style>
    <link rel="icon" href="5 puntas v3.png" type="image/png">
    </head>
<body>
    <a href="app.php">
        <img src="5 puntas v3.png" class="logo" alt="Logo del sitio">
    </a>

    <div class="container1">
    <?php if ($result_usuario->num_rows > 0): ?>
        <h1>Resultados de <?php echo $nombre_usuario; ?> memorizando números</h1>
        <table>
            <tr>
                <th>Aciertos</th>
                <th>Fecha</th>
            </tr>
            <?php while($row = $result_usuario->fetch_assoc()): ?>
            <tr>
                <td><?php echo $row['aciertos']; ?></td>
                <td><?php 
                    $fecha = date_create_from_format('Y-m-d H:i:s', $row['fecha']);
                    if ($fecha === false) {
                        echo "Formato de fecha incorrecto";
                    } else {
                        echo $fecha->format('d/m/Y') . '<span style="margin-left: 20px;">' . $fecha->format('H:i') . '</span>';
                    }
                ?></td>
            </tr>
            <?php endwhile; ?>
        </table>
    <?php else: ?>
        <p>Todavia no hay resultados para mostrar.<a href='memoriza_numeros/memoriza_numeros.php'>Juega</a></p>
    <?php endif; ?>
</div>

<div class="container">
    <?php if ($result_usuario2->num_rows > 0): ?>
        <h1>Resultados de <?php echo $nombre_usuario; ?> memorizando palabras</h1>
        <table>
            <tr>
                <th>Aciertos</th>
                <th>Fecha</th>
            </tr>
            <?php while($row = $result_usuario2->fetch_assoc()): ?>
            <tr>
                <td><?php echo $row['aciertos']; ?></td>
                <td><?php 
                    $fecha = date_create_from_format('Y-m-d H:i:s', $row['fecha']);
                    if ($fecha === false) {
                        echo "Formato de fecha incorrecto";
                    } else {
                        echo $fecha->format('d/m/Y') . '<span style="margin-left: 20px;">' . $fecha->format('H:i') . '</span>';
                    }
                ?></td>
            </tr>
            <?php endwhile; ?>
        </table>
    <?php else: ?>
        <p>Todavia no hay resultados para mostrar.<a href='memoriza_palabras/memoriza_palabras.php'>Juega</a></p>
    <?php endif; ?>
</div>
    <div class="container">
        <h1>Top 25 memoriza numeros</h1>
        <table>
            <tr>
                <th>Rank</th>
                <th>Usuario</th>
                <th>Aciertos</th>
                <th>Fecha</th>
            </tr>
            <?php $rank = 1; while($row = $result_top->fetch_assoc()): ?>
            <tr>
                <td><?php echo $rank++; ?></td>
                <td><?php echo $row['usuario']; ?></td>
                <td><?php echo $row['aciertos']; ?></td>
                <td><?php 
                    $fecha = date_create_from_format('Y-m-d H:i:s', $row['fecha']);
                    if ($fecha === false) {
                        echo "Formato de fecha incorrecto";
                    } else {
                        echo $fecha->format('d/m/Y') . '<span style="margin-left: 20px;">' . $fecha->format('H:i') . '</span>';
                    }
                ?></td>
            </tr>
            <?php endwhile; ?>
        </table>
    </div>

    <div class="container">
        <h1>Top 25 memoriza palabras</h1>
        <table>
            <tr>
                <th>Rank</th>
                <th>Usuario</th>
                <th>Aciertos</th>
                <th>Fecha</th>
            </tr>
            <?php $rank = 1; while($row = $result_top2->fetch_assoc()): ?>
            <tr>
                <td><?php echo $rank++; ?></td>
                <td><?php echo $row['usuario']; ?></td>
                <td><?php echo $row['aciertos']; ?></td>
                <td><?php 
                    $fecha = date_create_from_format('Y-m-d H:i:s', $row['fecha']);
                    if ($fecha === false) {
                        echo "Formato de fecha incorrecto";
                    } else {
                        echo $fecha->format('d/m/Y') . '<span style="margin-left: 20px;">' . $fecha->format('H:i') . '</span>';

                    }
                ?></td>
            </tr>
            <?php endwhile; ?>
        </table>
    </div>
    <div class="button-container">
    </div>
    <footer class="footer">

<button onclick="location.href='app.php'">Inicio</button>
<button onclick="location.href='memoriza_numeros/memoriza_numeros.php'">Memoriza números</button>
<button onclick="location.href='memoriza_palabras/memoriza_palabras.php'" >Memoriza palabras</button>
<button onclick="location.href='Resultados.php'">Resultados</button>
</footer>
</body>
</html>
