-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 18-06-2023 a las 21:35:06
-- Versión del servidor: 10.4.28-MariaDB
-- Versión de PHP: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `proyecto`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mensajes_personalizados`
--

CREATE TABLE `mensajes_personalizados` (
  `id` int(11) NOT NULL,
  `mensaje` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `mensajes_personalizados`
--

INSERT INTO `mensajes_personalizados` (`id`, `mensaje`) VALUES
(1, 'Saludos');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `partidas`
--

CREATE TABLE `partidas` (
  `id` int(11) NOT NULL,
  `usuario` varchar(255) NOT NULL,
  `aciertos` int(11) NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `partidas`
--

INSERT INTO `partidas` (`id`, `usuario`, `aciertos`, `fecha`) VALUES
(11, 'pepe', 7, '2023-05-26 22:11:31'),
(16, 'juan', 7, '2023-05-27 03:54:37'),
(17, 'juan', 0, '2023-05-27 03:57:07'),
(18, 'juan', 2, '2023-05-27 13:25:34'),
(19, 'jahoska', 2, '2023-05-27 13:34:33'),
(20, 'jahoska', 2, '2023-05-27 13:34:35'),
(21, 'jahoska', 7, '2023-05-27 15:30:36'),
(22, 'jahoska', 3, '2023-05-27 15:46:54'),
(36, 'joseluis33', 6, '2023-05-28 22:12:25'),
(37, 'joseluis33', 5, '2023-05-28 22:13:28'),
(38, 'joseluis44', 1, '2023-05-28 23:49:55'),
(41, 'juancarlos', 5, '2023-05-30 03:23:46'),
(42, 'joseluis33', 4, '2023-05-30 23:50:21'),
(43, 'joseluis44', 4, '2023-06-01 14:22:56'),
(44, 'joseluis44', 0, '2023-06-01 14:24:52'),
(45, 'joseluis44', 0, '2023-06-01 19:16:22'),
(46, 'joselu', 0, '2023-06-03 01:07:01'),
(47, 'joselu', 0, '2023-06-03 01:07:04'),
(48, 'joselu', 1, '2023-06-03 01:07:16'),
(49, 'joselu', 1, '2023-06-03 01:07:17'),
(50, 'joselu', 0, '2023-06-03 01:07:23'),
(51, 'joseluis44', 0, '2023-06-04 13:06:20'),
(52, 'joseluis44', 2, '2023-06-04 13:06:44'),
(56, 'jahoska', 6, '2023-06-05 00:54:06'),
(60, 'jahoska', 3, '2023-06-06 12:27:10'),
(61, 'juancarlos', 5, '2023-06-11 14:31:03'),
(62, 'juancarlos', 6, '2023-06-12 13:20:47'),
(63, 'juancarlos', 0, '2023-06-12 13:21:19'),
(64, 'juancarlos', 5, '2023-06-14 13:33:03'),
(66, 'pedronumero1', 7, '2023-06-14 16:47:57'),
(67, 'pedronumero1', 0, '2023-06-14 16:58:00'),
(68, 'jahoska', 3, '2023-06-14 23:03:56'),
(69, 'pepitogrillo', 1, '2023-06-15 02:01:55'),
(70, 'pepitogrillo', 0, '2023-06-15 23:44:58'),
(71, 'pepitogrillo', 0, '2023-06-16 00:04:22'),
(72, 'pepitogrillo', 1, '2023-06-16 02:24:37'),
(73, 'pepitogrillo', 3, '2023-06-16 02:39:38'),
(74, 'pepitogrillo', 0, '2023-06-16 03:16:24'),
(75, 'pepitogrillo', 5, '2023-06-16 03:17:36'),
(76, 'pepitogrillo', 0, '2023-06-16 03:20:00'),
(77, 'pepitogrillo', 0, '2023-06-16 03:31:43'),
(78, 'pepitogrillo', 0, '2023-06-16 03:31:59'),
(79, 'pepitogrillo', 0, '2023-06-16 03:32:07'),
(80, 'pepitogrillo', 0, '2023-06-16 03:32:22'),
(81, 'pepitogrillo', 0, '2023-06-16 03:32:26'),
(82, 'pepitogrillo', 2, '2023-06-16 03:32:47'),
(83, 'pepitogrillo', 0, '2023-06-16 03:33:17'),
(84, 'pepitogrillo', 2, '2023-06-16 03:34:13'),
(85, 'pepitogrillo', 3, '2023-06-16 03:35:21'),
(86, 'pepitogrillo', 0, '2023-06-16 03:35:50'),
(87, 'pepitogrillo', 0, '2023-06-16 03:38:10'),
(88, 'pepitogrillo', 0, '2023-06-16 03:38:23'),
(89, 'pepitogrillo', 0, '2023-06-16 03:38:38'),
(90, 'pepitogrillo', 0, '2023-06-16 03:38:48'),
(91, 'Dumbo', 2, '2023-06-16 03:43:41'),
(92, 'Dumbo', 0, '2023-06-16 03:47:35'),
(93, 'Dumbo', 0, '2023-06-16 03:48:49'),
(94, 'Dumbo', 0, '2023-06-16 03:49:03'),
(95, 'Dumbo', 0, '2023-06-16 03:49:11'),
(96, 'Dumbo', 0, '2023-06-16 03:56:49'),
(97, 'Dumbo', 0, '2023-06-16 03:56:56'),
(98, 'Dumbo', 0, '2023-06-16 03:58:27'),
(99, 'Dumbo', 0, '2023-06-16 03:58:45'),
(100, 'presentacionhtmlproyecto', 2, '2023-06-16 04:40:58'),
(101, 'Dumbo', 0, '2023-06-16 12:02:49'),
(102, 'pepitogrillo', 0, '2023-06-16 12:25:58'),
(103, 'Dumbo', 0, '2023-06-16 21:41:32'),
(104, 'forestgump', 0, '2023-06-16 21:44:53'),
(105, 'forestgump', 0, '2023-06-16 21:48:15'),
(106, 'forestgump', 0, '2023-06-17 02:09:59'),
(107, 'Dumbo', 0, '2023-06-18 15:17:46'),
(108, 'Dumbo', 2, '2023-06-18 16:47:19'),
(109, 'Dumbo', 0, '2023-06-18 17:14:02'),
(110, 'Dumbo', 0, '2023-06-18 17:14:20');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `partidas2`
--

CREATE TABLE `partidas2` (
  `id` int(11) NOT NULL,
  `usuario` varchar(255) NOT NULL,
  `aciertos` int(11) NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `partidas2`
--

INSERT INTO `partidas2` (`id`, `usuario`, `aciertos`, `fecha`) VALUES
(6, 'juan', 2, '2023-05-27 04:05:01'),
(7, 'juan', 0, '2023-05-27 12:59:12'),
(8, 'juan', 0, '2023-05-27 13:24:11'),
(9, 'juan', 2, '2023-05-27 13:24:58'),
(10, 'juan', 0, '2023-05-27 13:25:04'),
(11, 'jahoska', 4, '2023-05-27 15:29:16'),
(22, 'jahoska', 2, '2023-05-28 01:32:40'),
(23, 'jahoska', 3, '2023-05-28 01:33:13'),
(24, 'jahoska', 5, '2023-05-28 01:34:00'),
(25, 'jahoska', 3, '2023-05-28 01:34:30'),
(26, 'juan', 3, '2023-05-28 02:33:14'),
(27, 'juan', 0, '2023-05-28 02:33:19'),
(28, 'juan', 3, '2023-05-28 02:33:45'),
(29, 'juan', 3, '2023-05-28 02:34:13'),
(30, 'juan', 3, '2023-05-28 02:35:08'),
(31, 'juan', 1, '2023-05-28 02:35:19'),
(32, 'juan', 2, '2023-05-28 02:35:38'),
(33, 'juan', 2, '2023-05-28 02:36:02'),
(34, 'juan', 0, '2023-05-28 03:17:34'),
(52, 'joseluis33', 2, '2023-05-28 22:13:55'),
(53, 'joseluis33', 4, '2023-05-28 22:14:36'),
(54, 'joseluis44', 0, '2023-05-28 23:50:08'),
(55, 'joseluis44', 2, '2023-05-28 23:50:27'),
(56, 'joseluis44', 2, '2023-05-28 23:50:55'),
(57, 'joseluis44', 2, '2023-05-29 02:20:54'),
(58, 'joseluis44', 4, '2023-05-29 02:21:59'),
(62, 'juancarlos', 2, '2023-05-30 03:24:07'),
(63, 'jahoska', 3, '2023-05-31 01:42:50'),
(64, 'jahoska', 4, '2023-05-31 01:43:30'),
(65, 'jahoska', 2, '2023-05-31 01:43:53'),
(66, 'jahoska', 3, '2023-05-31 01:44:25'),
(67, 'jahoska', 3, '2023-05-31 01:44:47'),
(68, 'jahoska', 3, '2023-05-31 01:45:23'),
(69, 'jahoska', 0, '2023-05-31 01:45:29'),
(70, 'jahoska', 3, '2023-05-31 01:45:57'),
(71, 'jahoska', 4, '2023-05-31 01:46:44'),
(75, 'joseluis44', 0, '2023-06-01 14:26:01'),
(76, 'joseluis44', 3, '2023-06-01 14:26:29'),
(77, 'joselu', 3, '2023-06-03 01:07:55'),
(93, 'jahoska', 0, '2023-06-05 00:55:35'),
(94, 'jahoska', 3, '2023-06-05 00:56:04'),
(95, 'jahoska', 0, '2023-06-05 01:49:19'),
(96, 'jahoska', 0, '2023-06-05 01:51:03'),
(97, 'jahoska', 2, '2023-06-05 01:51:21'),
(98, 'jahoska', 4, '2023-06-05 01:52:01'),
(101, 'jahoska', 0, '2023-06-05 02:22:09'),
(104, 'jahoska', 0, '2023-06-06 12:22:45'),
(105, 'jahoska', 0, '2023-06-06 12:23:11'),
(106, 'jahoska', 3, '2023-06-06 12:23:39'),
(107, 'jahoska', 1, '2023-06-06 12:25:16'),
(108, 'juancarlos', 0, '2023-06-06 12:33:28'),
(109, 'juancarlos', 4, '2023-06-11 14:30:07'),
(110, 'juancarlos', 0, '2023-06-12 12:22:31'),
(111, 'juancarlos', 4, '2023-06-12 12:23:09'),
(112, 'juancarlos', 0, '2023-06-14 13:08:36'),
(113, 'juancarlos', 4, '2023-06-14 13:09:14'),
(116, 'jahoska', 0, '2023-06-14 14:34:33'),
(117, 'pedronumero1', 0, '2023-06-14 16:57:27'),
(118, 'pedronumero1', 2, '2023-06-14 16:58:30'),
(119, 'pedronumero1', 0, '2023-06-14 16:58:39'),
(120, 'pedronumero1', 3, '2023-06-14 16:59:06'),
(121, 'pedronumero1', 4, '2023-06-14 16:59:50'),
(122, 'pedronumero1', 0, '2023-06-14 17:13:03'),
(123, 'pedronumero1', 2, '2023-06-14 17:13:23'),
(124, 'pedronumero1', 3, '2023-06-14 17:13:58'),
(125, 'pedronumero1', 2, '2023-06-14 18:11:34'),
(126, 'jahoska', 6, '2023-06-14 23:13:25'),
(127, 'jahoska', 0, '2023-06-15 00:14:03'),
(128, 'jahoska', 0, '2023-06-15 00:15:35'),
(129, 'pepitogrillo', 4, '2023-06-15 01:56:40'),
(130, 'pepitogrillo', 0, '2023-06-15 03:49:05'),
(131, 'pepitogrillo', 0, '2023-06-15 23:21:17'),
(132, 'pepitogrillo', 0, '2023-06-15 23:34:43'),
(133, 'pepitogrillo', 2, '2023-06-15 23:54:10'),
(134, 'pepitogrillo', 2, '2023-06-16 00:04:11'),
(135, 'pepitogrillo', 1, '2023-06-16 00:12:38'),
(136, 'pepitogrillo', 0, '2023-06-16 00:34:00'),
(137, 'pepitogrillo', 0, '2023-06-16 02:24:43'),
(138, 'pepitogrillo', 1, '2023-06-16 02:25:05'),
(139, 'pepitogrillo', 0, '2023-06-16 02:30:52'),
(140, 'pepitogrillo', 2, '2023-06-16 02:31:16'),
(141, 'pepitogrillo', 1, '2023-06-16 02:37:23'),
(142, 'pepitogrillo', 4, '2023-06-16 02:38:15'),
(143, 'pepitogrillo', 0, '2023-06-16 03:06:38'),
(144, 'pepitogrillo', 0, '2023-06-16 03:06:44'),
(145, 'pepitogrillo', 1, '2023-06-16 03:07:09'),
(146, 'pepitogrillo', 0, '2023-06-16 03:07:21'),
(147, 'pepitogrillo', 1, '2023-06-16 03:07:33'),
(148, 'pepitogrillo', 2, '2023-06-16 03:08:32'),
(149, 'pepitogrillo', 1, '2023-06-16 03:08:53'),
(150, 'pepitogrillo', 1, '2023-06-16 03:12:33'),
(151, 'pepitogrillo', 2, '2023-06-16 03:13:14'),
(152, 'pepitogrillo', 0, '2023-06-16 03:14:09'),
(153, 'pepitogrillo', 0, '2023-06-16 03:14:18'),
(154, 'pepitogrillo', 0, '2023-06-16 03:15:29'),
(155, 'pepitogrillo', 0, '2023-06-16 03:15:56'),
(156, 'pepitogrillo', 0, '2023-06-16 03:16:38'),
(157, 'pepitogrillo', 1, '2023-06-16 03:30:58'),
(158, 'pepitogrillo', 0, '2023-06-16 03:31:32'),
(159, 'Dumbo', 3, '2023-06-16 03:44:34'),
(160, 'Dumbo', 0, '2023-06-16 03:50:07'),
(161, 'Dumbo', 0, '2023-06-16 03:52:30'),
(162, 'pepitogrillo', 0, '2023-06-16 03:53:10'),
(163, 'pepitogrillo', 0, '2023-06-16 03:53:17'),
(164, 'Dumbo', 0, '2023-06-16 03:55:52'),
(165, 'Dumbo', 0, '2023-06-16 03:56:36'),
(166, 'pepitogrillo', 0, '2023-06-16 03:57:29'),
(167, 'Dumbo', 0, '2023-06-16 03:58:36'),
(168, 'Dumbo', 0, '2023-06-16 12:02:38'),
(169, 'pepitogrillo', 0, '2023-06-16 12:25:51'),
(170, 'Dumbo', 0, '2023-06-16 14:44:18'),
(171, 'Dumbo', 2, '2023-06-16 14:44:43'),
(172, 'forestgump', 1, '2023-06-16 21:44:31'),
(173, 'forestgump', 0, '2023-06-16 21:45:09'),
(174, 'Dumbo', 0, '2023-06-18 12:06:02'),
(175, 'Dumbo', 2, '2023-06-18 16:47:59');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `usuario` varchar(50) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `contrasena` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `usuario`, `correo`, `contrasena`) VALUES
(2, 'pepe', 'pepeGONZALEZCUADRADO@HOTMAIL.COM', '$2y$10$sjRydYjRA979tyHljFntS./6OytS3FejkploL0uS5grZbC3AXZUjy'),
(3, 'juan', 'juanGONZALEZCUADRADO@HOTMAIL.COM', '$2y$10$8SdCFv0pWE95qaf30GZ8D.GyJpTCjQTDowBtTTQ5qfy/eij1ZORdW'),
(6, 'jahoska', 'jaho@gmail.com', '$2y$10$KRhTNILZ11PaLdievcxGO.pIRAi65GdVG0XAK1ayqieaWDfslxyZu'),
(7, 'joseluis33', 'joseONZALEZCUADRADO@HOTMAIL.COM', '$2y$10$1aI3MxA3lgAWKJjj.byGG.GWdylR0e5HxV6B8AXRdrJzi6PKHv2qS'),
(8, 'joseluis44', '123456@a.com', '$2y$10$hE07CUxvwaBT0ckB1wJzmu0jdoUYCGr.Jk39TsIF9fDt0iOUQIy0C'),
(9, 'joseluis44', 'pooGONZALEZCUADRADO@HOTMAIL.COM', '$2y$10$fGoTAQSOaHa0Id41UaRVWOmGwAoiz9L6xeNawW1IL3HerIOGJ45nK'),
(10, 'juancarlos', 'juancaCUADRADO@HOTMAIL.COM', '$2y$10$j9i4bCJP3t8HxilUUcaqOe5O3XlDuCBG7DT4y49SLiISVLyV4AZAK'),
(11, 'pepevirgo', 'pepe@virgo.es', '$2y$10$WcA7xDUkDjCQWaoaF.tRS.6reX6hvnz3owK7gR671KtswDNdzLfjS'),
(12, 'joselu', '123123@12.es', '$2y$10$hVSNkTbvIJuqaUrWAR83Tup5L3dXI4na5CuUHThr0cvibMGh5BgK2'),
(14, 'pedronumero1', 'pedronumber0ne@hotmail.com', '$2y$10$rkTcMbfkcBDyBmyag69d9eKlMFq6PhbGpmfMTUoIMXi8K4qN.EAyO'),
(15, 'pepitogrillo', 'pepito@grillo.es', '$2y$10$aQXYP2oU0GaOPQC7ffJBg.W2rSGj5Bei8K9sL6L3QC0see1mAC.Z.'),
(16, 'Dumbo', 'DUMBO@HOTMAIL.COM', '$2y$10$lm43eu844YdH7NbX0REDVe0S8BJIhqMUyjpMtJEmm/j7GXez38r/u'),
(17, 'presentacionhtmlproyecto', 'presentacionhtml@eso.es', '$2y$10$V7WaSoXXRNKnDphkQcjGquAMIDvE1oC/EC6XWbeMyp4JkFCoaAn8q'),
(18, 'forestgump', 'PABLOGONZALEZCUADRADO@HOTMAIL.COM', '$2y$10$borO136g4NdaQe9oMIogwuphI.5XpCSuShIn8Iznhm2y9tkeAix3G'),
(19, 'Admin', 'admin@HOTMAIL.COM', '$2y$10$isskqGiXH0KueD/P/PjlYuHex5/.JssP5Fi9HYLiaEUqBKZHM/XkS');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `mensajes_personalizados`
--
ALTER TABLE `mensajes_personalizados`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `partidas`
--
ALTER TABLE `partidas`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `partidas2`
--
ALTER TABLE `partidas2`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `correo` (`correo`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `mensajes_personalizados`
--
ALTER TABLE `mensajes_personalizados`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `partidas`
--
ALTER TABLE `partidas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=111;

--
-- AUTO_INCREMENT de la tabla `partidas2`
--
ALTER TABLE `partidas2`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=176;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
