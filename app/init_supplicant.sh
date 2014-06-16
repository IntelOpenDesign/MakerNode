#!/bin/sh

# killall hostapd
FILE=/etc/wpa_supplicant.conf
wpa_passphrase $1 $2 > $FILE

sed -i "4 i\\
        scan_ssid=1\\
        proto=WPA RSN\\
        key_mgmt=WPA-PSK\\
        pairwise=CCMP TKIP\\
        group=CCMP TKIP\\
" $FILE
echo Updated $FILE
more $FILE

# /etc/init.d/networking restart
# TODO: /sbin/reboot
