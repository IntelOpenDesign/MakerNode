#!/bin/sh

echo INIT_SUPPLICANT

wpa_passphrase $1 << EOF > /etc/wpa_supplicant.conf
$2
EOF

/etc/init.d/networking restart

ifdown wlan0
ifup wlan0 &
