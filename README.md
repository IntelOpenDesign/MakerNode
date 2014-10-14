# README #

Although NodeJS is included on the Galileo and Edison builds, we do not provide tools to wirelessly configure, develop, deploy and debug projects using popular text editors and web browsers. Makernode is an set of tools and examples for the IOTDK that make it easy to get started with Javascript by letting developers choose their own IDE and browser, and supporting workflow that is familiar to the NodeJS community.  

Currently a WORK IN PROGRESS. The files here contain a working POC of wireless configuration and the binaries required to quickly convert the IOTDevkit build into a wireless configuration. 

We are planning to provide a build with the code from this repo included because the whole point of it is to simplify setup, but for now if you want to download the IOTDK, please [see the wiki](https://github.com/IntelOpenDesign/MakerNode/wiki) for instructions of how to setup your Galileo, get the linux build, and connect to the web. 

    git config --global http.sslVerify false
    cd
    git clone https://github.com/IntelOpenDesign/MakerNode MakerNode
    cd MakerNode
    npm install

This script will install the tools and configs you need:

    ./install_iot_libs.sh

Then to put the board into it's startup state run:
    
    sh/restore_factory_settings.sh
    reboot

The board will then restart in AP mode - at which point you can try our wifi configuration. The login and password defaults for the boards are "root" and "root" until you change them using the configuration tool. [Here is a video demo](https://vimeo.com/107971075) of the current configuration on vimeo. 


### Who do I talk to? ###

* seth.e.hunter@intel.com - developer and project manager
* carlos.montesinos@intel.com - developer and project manager
* adampasz@gmail.com  - nodejs lead programmer
* noura.howell@gmail.com  - front end developer


