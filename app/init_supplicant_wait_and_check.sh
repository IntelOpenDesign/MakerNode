#!/bin/sh

echo INIT_SUPPLICANT

wpa_passphrase $1 << EOF > /etc/wpa_supplicant.conf
$2
EOF

ifdown wlan0

/etc/init.d/networking restart

MINUTES=5
COUNT=1
while [ $COUNT -lt $MINUTES ]; do
    echo WAITING MINUTE $COUNT OF $MINUTES
    let COUNT+=1
    sleep 1m
done

echo TRYING TO MAKE SURE WE GET ON WIFI
MAX_COUNTER=4
COUNTER=1
while [ $COUNTER -lt $MAX_COUNTER ]; do
    if ifconfig | grep -A1 'wlan0' | grep 'inet'| awk -F' ' '{ print $2 }' | awk -F':' '{ print $2 }'
    then
        echo WE ARE ON WIFI
        let COUNTER=$MAX_COUNTER
    else
        echo WE ARE NOT ON WIFI
        let COUNTER+=1
    fi
    ifdown wlan0
    ifup wlan0
    sleep 10
done

