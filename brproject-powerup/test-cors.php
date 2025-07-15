<?php
header('Access-Control-Allow-Origin: https://trello.com');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

echo json_encode([
    'status' => 'success',
    'message' => 'CORS configurado corretamente',
    'headers' => getallheaders()
]);
?>