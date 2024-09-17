<?php
// Türkiye saat dilimini ayarla
date_default_timezone_set('Europe/Istanbul');

// IP adresini al
$ipAddress = $_SERVER['REMOTE_ADDR'];

// Kullanıcı ajanını al
$userAgent = $_SERVER['HTTP_USER_AGENT'];

// Referansı al
$referer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : 'Direct';

// Tam URL'yi al
$requestUri = $_SERVER['REQUEST_URI'];

// Giriş zamanını al
$loginTime = date('Y-m-d H:i:s');

// Webhook URL'nizi buraya koyun
$webhookUrl = 'https://discord.com/api/webhooks/1285733312500859014/cypW1EHT_h8TCYc9Emf6-3pX9_n6TauCQwjIrDOwUZWoscqPcnkTksCQNsGKBCEjcFgO'; // Buraya Discord'dan aldığınız Webhook URL'sini ekleyin

// Webhook URL'sinin doğru olduğunu kontrol edin
if (empty($webhookUrl)) {
    die('Webhook URL\'si boş olamaz.');
}

// Mesaj verilerini hazırla
$message = [
    'content' => 'Yeni bir kullanıcı siteye girdi!',
    'embeds' => [
        [
            'title' => 'Kullanıcı Bilgileri',
            'fields' => [
                [
                    'name' => 'IP Adresi',
                    'value' => $ipAddress,
                    'inline' => true
                ],
                [
                    'name' => 'Kullanıcı Ajanı',
                    'value' => $userAgent,
                    'inline' => true
                ],
                [
                    'name' => 'Referans',
                    'value' => $referer,
                    'inline' => true
                ],
                [
                    'name' => 'Tam URL',
                    'value' => $requestUri,
                    'inline' => true
                ],
                [
                    'name' => 'Zaman',
                    'value' => $loginTime,
                    'inline' => true
                ]
            ],
            'footer' => [
                'text' => 'Bilgi: Siteye yeni bir giriş yapıldı.'
            ]
        ]
    ]
];

// Webhook isteği yap
$options = [
    'http' => [
        'header'  => 'Content-type: application/json',
        'method'  => 'POST',
        'content' => json_encode($message),
    ],
];

$context  = stream_context_create($options);
$result = file_get_contents($webhookUrl, false, $context);

// Sonuç kontrolü
if ($result === FALSE) {
    echo 'Webhook gönderimi başarısız oldu.';
} else {
    echo 'Webhook başarıyla gönderildi.';
}
?>
