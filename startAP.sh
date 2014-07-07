ifconfig wlan0 up
wpa_cli -iwlan0 "terminate" &
hostapd -B /etc/hostapd.conf &
ifconfig wlan0 192.168.0.10 &
busybox dnsd -i 192.168.0.10 -p 53 -c /etc/dnsd.conf &
busybox udhcpd /etc/udhcpd.conf &
