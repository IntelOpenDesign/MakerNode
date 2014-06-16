# README #

Dev repo. for Intel Labs projects

### Downloading Node Modules ###
```
#!bash
cd app
npm install
```

"" What image am I supposed to have on the Galileo? Where can I find that? """

### Configuring the Galileo to run the node js server on boot. ###
Copy this repo to the Galileo into a new directory called /home/maker.

""" A noob wouldn't know how to copy over SSH or serial. An example SCP terminal command could be helpful """
""" When I copied over the files, my interpetation of the instructions got me to having /home/maker/makernode-dev/app but luckily I was paying attention and saw this didn't match the instructions lower down about mkr:5:.... so I reorganized my files to make it match that """

Connect to the Galileo via a serial cable, and open a terminal with Putty, Screen or your tool of choice.
IMPORTANT: Do not try this without a serial connection! If you accidentally take down the access point, 
you will no longer be able to ssh into the Galileo.

Make the following changes to the bottom of /etc/inittab
(i.e. comment out 2 lines and add one line)
```
# grst:5:respawn:/opt/cln/galileo/galileo_sketch_reset -v
# cald:5:respawn:/etc/init.d/clloader.sh
mkr:5:once:/home/maker/app/maker-node.sh start
```

Now, enter the following commands (in the terminal that's connected to the galileo):
```
#!bash
cd /home/maker/app 
chmod u+x maker-node.sh

```

Restart the board.
```
/sbin/reboot
```

""" Is it supposed to take a long time to reboot? I think mine might be frozen.... """
""" Eventually I pulled the plug on the Galileo and restarted my computer. I reconnected over serial to the Galileo. I did ps but did not see any of the desired processes. Maybe the /sbin/reboot didn't go too well. Also I realized I forgot to do npm install at the very beginning. I just did it for the repo on my computer, but now the Galileo is not broadcasting a wifi hotspot anymore and I don't know how to transfer files over a serial connection.... """

After reboot has completed, you should be able to connect to the Acess Point.   

List the running processes in the terminal.
```
ps
```
If everything is running correctly, the end of the list should look something like this:
```
 1364 root      1856 S    {maker-node.sh} /bin/sh /home/maker/app/maker-node.s 
 1365 root     54116 R    node ./index.js 
 1371 root       848 S    /home/root/busybox_custom dnsd -i 192.168.0.10 -c /e 
 1373 root       856 S    /home/root/busybox_custom udhcpd /etc/udhcpd.conf 
 1376 root      3756 S    hostapd -B /etc/hostapd/hostapd.conf 
 1379 root      1264 R    ps
 ```
Congratulations! The node server is running.

If you connect to the AP, you can also try loading the client in a browser:
http://192.168.0.10/#/

### Who do I talk to? ###

* adampasz@gmail.com
* carlos.montesinos@intel.com
