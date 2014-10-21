# README #

A set of tools to wirelessly configure, develop, deploy and debug projects on Galileo Gen2 and Edison using standard text editors and web browsers. Makernode is an set of tools and examples for the Intel IOTDK that make it easy to get started with Javascript or Python by letting developers choose customize their existing toolsets.  

The files here contain a work-in-progress POC of wireless configuration and the binaries required to quickly convert the IOTDevkit build into a wirelessly configured build. 

So far have tested primarily on OSX and Linux which have bonjour services preinstalled. For Windows please install [Bonjour for Windows from here](http://support.apple.com/kb/dl999). 

We are planning to provide a build with the code from this repo included because the whole point of it is to simplify setup, but for now if you want to try it, download the IOTDK, please [see the wiki](https://github.com/IntelOpenDesign/MakerNode/wiki) for instructions of how to setup your Galileo, get the linux build, and connect to the web. The login and password defaults for the boards are "root" and "root". 

Once your galileo is connected to the web, go to the home directory on the console and:

    git config --global http.sslVerify false
    cd
    git clone https://github.com/IntelOpenDesign/MakerNode MakerNode
    cd MakerNode
    npm install

This script will install the tools and configs you need:

    ./install_iot_libs.sh

To put the board back into startup mode, call the following script inside the `sh/` folder. 
    
    restore_factory_settings.sh

The board will then restart in AP mode - at which point you can try our wifi configuration. To do this, select the wifi network Makernode-5char (5char will be replaced by the last 5 char of your Mac address, printed on a sticker on the top of your Ethernet port on the board). This is to distiguish it from other boards at hackathons. 

In the future you can simply press the "reset" button on the galileo board for 5 seconds. There is a service that will reset the board to factory settings and reboot back into access point mode. This takes about 1 minute. 

[Here is a video demo](https://vimeo.com/107971075) of the configuration from Oct 4 on vimeo. 

Issues: 

-Access point mode works well in most cases, during hackathons we have found that there are two many overlapping channels in the 2.4 ghz range. We are looking into using the 5 ghz bandwidth on the centrino cards. 


### Who do I talk to? ###

* seth.e.hunter@intel.com - developer and project manager
* carlos.montesinos@intel.com - developer and project manager
* adampasz@gmail.com  - nodejs lead programmer
* noura.howell@gmail.com  - front end developer
