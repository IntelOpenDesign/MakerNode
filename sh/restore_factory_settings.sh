#!/bin/sh
pushd ~/MakerNode
sh/set_hostname.sh clanton
echo root:root | chpasswd
rm /var/lib/connman/wifi.config
cp conf/default_appstate.conf conf/appstate.conf
cp conf/default_boardstate.conf conf/boardstate.conf
popd
