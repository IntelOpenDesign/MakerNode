#!/bin/sh

echo "installing hostapd, libnl 1.1, and busybox-i586 binaries"
cd iotkd_libs/
cp libnl.so.1 /usr/lib
cp hostapd /usr/bin
cp hostapd_cli /usr/bin
cp busybox-i586 /usr/bin
cp rsync /usr/bin
