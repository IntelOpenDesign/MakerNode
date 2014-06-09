#!/bin/sh

echo INIT_SUPPLICANT

wpa_passphrase $1 << EOF > /etc/wpa_supplicant.conf
$2
EOF

ifdown wlan0

/etc/init.d/networking restart
