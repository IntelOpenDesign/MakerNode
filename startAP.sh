# connmand conflicts with dnsd on port 53, and we don't need it in setup mode
killall connmand

ifconfig wlan0 up
wpa_cli -iwlan0 "terminate" &

#start access point
hostapd -B /etc/hostapd.conf &
ifconfig wlan0 192.168.0.10 &

# start dns server so you don't need to type ip address in browser
busybox dnsd -i 192.168.0.10 -p 53 -c /etc/dnsd.conf &
busybox udhcpd /etc/udhcpd.conf &
