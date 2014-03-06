Connect Anything
================

This is the front end that goes with a hardware backend and web server. The hardware has input and output pins, which are represented as sensor and actuator boxes in the two columns of the UI. Connecting a sensor to an actuator sends that values from the input pin to the output pin. The idea is to help hobbyists use the hardware and this web interface on their phone to easily hook things up and prototype creative physical inventions.

How to get up and running with this code
----------------------------------------

### Requirements
* node (I am on 0.10.5), nodejs-websocket
* Python (I am on 2.7.2)

### Server setup
In static/js/app.js, there are a few different values for cat.server_url that you should use in different cases:
* cat.server_url = 'ws://localhost:8001';
    - for when you just want to test on your local machine
    - no internet connection needed
* cat.server_url = 'ws://192.168.<x>.<y>:8001';
    - for when you want to test on other devices too
    - type ifconfig to find your computer's local IP address for <x> and <y>
* cat.server_url = 'ws://cat/';
    - for when you are hosting this code on the hardware

Note that the first two options both use port 8001 because test-server.js listens on port 8001.

### Running it
* To run with test-server.js, in this directory, on two command lines, get both going at the same time:
    - node test-server.js
    - python -m SimpleHTTPServer
* To run on the hardware, you need to change two lines static/js/app.js. Seach for "Galileo" in that file and the two place where you need to comment out one line and uncomment the other line will come up, as indicated by those comments. Also, you need to get this code onto the hardware, and make sure that any files you are using are in the list of assets (for example if you add an image file you need to add that file path to the list), and then running the back-end server code will also host this web page on its own wifi network that it is broadcasting. This is really Carlos' area of expertise, not mine.


### Viewing it
In Chrome, navigate to http://localhost:8000 on your local machine or your http://192.168.<x>.<y>:8000 on another device. (It's on port 8000 because python's Simple HTTP Server will automatically host it on port 8000, though there is an option to change this if needed.)

