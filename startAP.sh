ifconfig wlp1s0 up
wpa_cli -iwlp1s0 "terminate" &
hostapd -B /etc/hostapd.conf &
ifconfig wlp1s0 192.168.0.10 &
busybox-i586 dnsd -i 192.168.0.10 -p 53 -c /etc/dnsd.conf &
busybox-i586 udhcpd /etc/udhcpd.conf &
