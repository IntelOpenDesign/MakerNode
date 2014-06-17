ifconfig wlan0 up
wpa_cli -iwlan0 "terminate" &
hostapd -B /etc/hostapd/hostapd.conf &
ifconfig wlan0 192.168.0.10 &
/home/root/busybox_custom dnsd -i 192.168.0.10 -c /etc/dnsd.conf &
/home/root/busybox_custom udhcpd /etc/udhcpd.conf &
