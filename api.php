<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost", "root", "", "sincroad");

$dominio = $_GET['dominio'] ?? 'MERCADONA';
$sql = "SELECT * FROM usuarios WHERE dominio_origen = '$dominio'";
$result = $conn->query($sql);

$usuarios = [];
while($row = $result->fetch_assoc()) {
    $usuarios[] = $row;
}

echo json_encode($usuarios);
?>