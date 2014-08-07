# README #

Working to make it easy to write nodeJS code on the Intel Galileo and, later, Edison

# How to Use #

If you contact us (emails below), we can give you a premade build image with all the system files set up properly and our code already installed. Sorry, at this point we do not have a public place where we share releases. This is still a very early stage project.

Or, if you want to try installing it on a clean build image, or your own build image, here are some setup steps. One place to get a build image is from

http://telekinect.media.mit.edu/galileo/image-devtools-1.0.1-2.tar.bz2

which at the time of this writing is the build image we have been using. It comes pre-installed with our software dependencies. (TODO: List our software dependencies.)

# Setup Steps #

## Supplies needed ##
Intel Galileo Gen 2.

half size PCI-E Intel Centrino Advanced N 6235 wifi card
http://www.intel.com/content/www/us/en/wireless-products/centrino-advanced-n-6235.html

Full size to half size mini PCI-E bracket (this "extends" the wifi card to fit in the holder on the back of the board)
http://www.amazon.com/Height-Express-PCI-E-Bracket-Adapter/dp/B007VXJ9IS

a wifi antenna
http://www.amazon.com/Laptop-Wireless-PCI-E-Internal-Antenna/dp/B004ZHT2JE/ref=sr_1_7?s=electronics&ie=UTF8&qid=1389662898&sr=1-7&keywords=wireless+antenna+for+mini+pcie+wifi+card

Micro SD card that is FAT32 formatted
http://www.wikihow.com/Format-an-SD-Card

mini to regular USB cable

6 pin serial cable such as
http://www.amazon.com/Huhushop-TM-FT232RL-Adapter-Arduino/dp/B00HCZ4GTC/ref=sr_1_1?ie=UTF8&qid=1406139253&sr=8-1&keywords=6pin+FTDI+FT232RL+USB+to+Serial+Adapter+Module

## Step 1 - Physical Assembly ##

Screw the wifi card into the bracket. Insert it into the back of the Galileo board. It helps to put it in at about a 30 degree angle and then push down to snap it in place.

http://www.malinov.com/Home/sergey-s-blog/intelgalileo-addingwifi
http://www.hofrock.com/setting-up-wi-fi/

## Step 2 - Downloads ##
Download the build image of your choice, unzip it, get it onto the SD card.

Download the driver for your wifi card and put it at the top level of the SD card.
http://wireless.kernel.org/en/users/Drivers/iwlwifi

You might need to install one or both of these drivers onto your computer in order to talk to the Galileo over a serial connection:
http://www.ftdichip.com/Drivers/VCP/MacOSX/FTDIUSBSerialDriver_v2_2_18.dmg
http://www.prolific.com.tw/US/ShowProduct.aspx?p_id=229&pcid=41

## Step 3 - Firmware Upgrade ##
Download the latest Arduino IDE for Galileo from here:
https://communities.intel.com/docs/DOC-22226

Even if you already have an arduino IDE, and even if you already downloaded a package with the exact same name from this website, you should still download it again because Intel will release newer firmware without changing the version number.

You should give it a name that does NOT have a space. Spaces make it not work.

With the SD card NOT in the Galileo, power it on with the power plug and connect it to your computer with a mini USB cable.

Launch the arduino IDE you just downloaded.

Select Tools -> Board -> Intel Galileo Gen 2

Select Tools -> Serial Port --> the one corresponding to your board.

If you want you can try running a "blink" arduino example with the code from here:
http://arduino.cc/en/tutorial/blink

Go to Help -> Firmware Upgrade

It will "warn" you that you have to be connected to power, which you already are. Click OK.

It will tell you if there is newer firmware available than what you have on the board. If so, do the firmware upgrade. It will show an ugly loading bar and take a long time. Just be patient.

When it finishes, quit the arduino IDE and disconnect the USB cable.

## Step 4 - Serial Connection ##

Unplug the Galileo.

Insert the SD card.

Plug in the Galileo.

Connect over a serial cable.

See if you can find which device is the Galileo.

I do these commands:
    touch devices_without_galileo
    touch devices_with_galileo
(with the serial cable unplugged from computer)
    ls /dev/ > devices_without_galileo
(with the serial cable connecting Galileo and computer)
    ls /dev/ > devices_with_galileo
    diff devices_with_galileo devices_without_galileo

There are a few different tools for connecting over serial, depending on the OS. (TODO: recommend some.) I'm just going to say what I do for using screen on Mac OSX.

    screen /dev/cu.usbserial-A5026SRI 115200

(The baud rate is 115200)

At the end of this step you should be on a command line in the Galileo.

Log in as the root user with the password "root"

## Step 5 - install wifi driver ##

Find the wifi driver you copied onto the SD card in the /media/ directory, unzip it, and copy it to /lib/firmware

These commands copied from
http://www.malinov.com/Home/sergey-s-blog/intelgalileo-addingwifi

    root@clanton:/tmp# tar xzvf /media/mmcblk0p1/iwlwifi-6000g2b-ucode-18.168.6.1.tgz
    iwlwifi-6000g2b-ucode-18.168.6.1/
    iwlwifi-6000g2b-ucode-18.168.6.1/iwlwifi-6000g2b-6.ucode
    iwlwifi-6000g2b-ucode-18.168.6.1/README.iwlwifi-6000g2b-ucode
    iwlwifi-6000g2b-ucode-18.168.6.1/LICENSE.iwlwifi-6000g2b-ucode
    root@clanton:/tmp# cp iwlwifi-6000g2b-ucode-18.168.6.1/iwlwifi-6000g2b-6.ucode /lib/firmware/
    root@clanton:/tmp#

## Step 6 - Connect to Wifi ##

Again, copying instructions from
http://www.malinov.com/Home/sergey-s-blog/intelgalileo-addingwifi

    wpa_passphrase MyWiFi << EOF > /etc/wpa_supplicant.conf
    > MyPassPhrase
    > EOF

Add "auto wlan0" to /etc/network/interfaces so it will try to connect to wifi automatically.

    vi /etc/network/interfaces

Add the line "auto wlan0" right after the "#Wireless interfaces" line

Restart networking

    /etc/init.d/networking restart

In my experience sometimes also doing this is necessary to get it on wifi:

    ifdown wlan0
    ifup wlan0

To confirm that you are on wifi, ping something

    ping www.google.com

## Step 7 - Clone Git Repo ##

If you aren't a member of the repo, contact us so we can add you. It's private right now. (TODO: make git repo public so anyone can download it)

    git config --global http.sslVerify false
    cd
    git clone https://<username>@bitbucket.org/adampasz/makernode-dev.git maker

If you can figure out a better way than to do that sketchy git config step, that would be awesome and please let us know.

## Step 8 - System Configuration ##

    cd /home/maker/app

Our conf files for hosting the access point, udhcp, and dns
    cp conf/hostapd.conf /etc/hostapd.conf
    cp conf/udhcpd.conf /etc/udhcpd.conf
    cp conf/dnsd.conf /etc/dnsd.conf

So that sketch.elf won't run on startup:
    mv /etc/init.d/galileod.sh /etc/

So that our node server will run on startup:
    vi /etc/inittab
Add this line to the end:
    mkr:5:once:/home/maker/app/maker-node.sh start

So that you will have a unique SSID for the wifi hotspot,
    vi /etc/hostapd.conf
Change the line ssid=MakerNode to have the ssid name of your choice

## Step 9 - Download Node Modules ##

    cd /home/maker/app
    npm install

This could take a while because Galileo is slow and you are installing a lot.

## Step 10 - Start our Code ##

    cd /home/maker/app
    chmod u+x *.sh
    ./restore_factory_settings
    reboot

## Step 11 - See our Demo ##

After it reboots, connect to the wifi hotspot with the SSID you chose.

Navigate to 192.168.0.10 in your browser.

For the first page, enter any nonempty strings.

For the second page, enter any nonempty strings.

For the third page, enter the SSID and password for the WPA2 wifi network you want the board to connec to.

Wait a few minutes. Over the serial connection, you can watch the board reboot and make sure it successfully connects to this wifi network. "ifdown wlan0" and "ifup wlan0" might be needed.

When it's back up and running, the web page should redirect to the Test 13 Pin page.

That's all for now, folks! More coming soon.

### Who do I talk to? ###

* adampasz@gmail.com
* noura.howell@gmail.com
* carlos.montesinos@intel.com
