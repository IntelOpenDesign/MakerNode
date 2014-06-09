#!/bin/sh

echo INIT_SUPPLICANT START

# killall hostapd
SUPPLICANT_FILE=/etc/wpa_supplicant.conf
INTERFACES_FILE=/etc/network/interfaces
wpa_passphrase $1 $2 > $SUPPLICANT_FILE

sed -i "4 i\\
        scan_ssid=1\\
        proto=WPA RSN\\
        key_mgmt=WPA-PSK\\
        pairwise=CCMP TKIP\\
        group=CCMP TKIP\\
" $SUPPLICANT_FILE
echo Updated $SUPPLICANT_FILE
#more $SUPPLICANT_FILE

if (( $# > 3 )); then
	cp ./conf/static_wlan.conf $INTERFACES_FILE
	sed -i "15 i\\
		address $3\\
		gateway $4\\
	" $INTERFACES_FILE
else
	cp ./conf/dynamic_wlan.conf $INTERFACES_FILE	
fi
echo Updated $INTERFACES_FILE

ifdown wlan0
ifup wlan0

echo INIT_SUPPLICANT END
