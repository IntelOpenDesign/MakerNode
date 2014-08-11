#!/bin/sh

# Steve's configure_edison.py commands for setting hostname
# def changeName(newName):
#   #mDNS later
#   os.popen("hostname %s" % (newName))
#   os.popen("sed -i 's/^hostname.*/hostname %s/' /etc/init.d/run-startup" % (newName))
#   os.popen("sed -i 's/^ssid=.*/ssid=%s/' /etc/hostapd/hostapd.conf" % (newName+"_ap"))

hostname $1
echo $1 > /etc/hostname
#sed -i 's/^hostname.*/hostname $1/' /etc/init.d/run-startup

