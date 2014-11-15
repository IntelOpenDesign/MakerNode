#!/bin/sh

# Tools
echo "installing hostapd, libnl 1.1, rsync, vim, and busybox-i586 binaries"
cd iotkd_libs
cp libnl.so.1 /usr/lib
cp hostapd /usr/bin
cp hostapd_cli /usr/bin
cp busybox-i586 /usr/bin
cp rsync /usr/bin
cp vim /usr/bin
cd ..

# Access point configuration
echo "Configuring device to act as wifi access point."
cp conf/hostapd.conf /etc
cp conf/udhcpd.conf /etc
cp conf/dnsd.conf /etc
cp conf/maker-node.service /etc/systemd/system/multi-user.target.wants
cp conf/reset-ap.service /etc/systemd/system/multi-user.target.wants

#Ensure shell scripts can be run
chmod u+x sh/*
