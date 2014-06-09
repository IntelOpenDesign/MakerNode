#!/bin/sh
rm /etc/wpa_supplicant.conf
cp conf/default_appstate.conf conf/appstate.conf
cp conf/default_boardstate.conf conf/boardstate.conf
