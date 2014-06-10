Connect Anything
================

This is the front end that goes with a hardware backend and web server. The hardware has input and output pins, which are represented as sensor and actuator boxes in the two columns of the UI. Connecting a sensor to an actuator sends that values from the input pin to the output pin. The idea is to help hobbyists use the hardware and this web interface on their phone to easily hook things up and prototype creative physical inventions.

How to get up and running with this code
----------------------------------------

### Requirements
* node (I am on 0.10.5), nodejs-websocket
* Python (I am on 2.7.2)

### Server setup
Change the server settings near the top of static/js/app.js depending on your use case.
* If you are testing on the hardware, just change cat.on_hardware to true and you should be good to go.
* If you are hosting test-server.js on your local machine, then cat.on_hardware should be false. To test only on your local machine, and no other devices, no internet connection is required and you can set cat.test_server_url = 'ws://localhost:8001'. If you want to use other devices too, you need internet, and change the <localhost> part to be your local machine's internet IP address, which you can find with the ifconfig command.

### Running it
* To run with test-server.js, in this directory, on two command lines, get both going at the same time:
    - node test-server.js
    - python -m SimpleHTTPServer
* to run it on the hardware, you have to get these files on the board. The board broadcasts its own local wifi network, which hosts the server and this website. You have to list your static files in the server's code to get them hosted. Ask Carlos about this deployment process.


### Viewing it
Supporting Chrome only
* If you're using test-server.js, navigate to http://localhost:8000 on your local machine or your http://<local IP address>:800. (It's on port 8000 because python's Simple HTTP Server will automatically host it on port 8000, though there is an option to change this if needed.)
* If you're using the hardware, connect to the Connect Anything network broadcast by the board, then then going to any URL should redirect you to it.
