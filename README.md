# README #

A nodejs workflow for Galileo Gen2 and Edison for the IOTDevkit. Will provide wireless wifi configuration, project skeletons, nodejs server examples, GPIO examples using galileo-io, and sublime plugins to facilitate easy deployment and debugging of projects. Currently a WORK IN PROGRESS. 

The current files contain a working POC of wireless configuration and the binaries required to quickly convert the IOTDevkit build into a wireless configuration. 

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


