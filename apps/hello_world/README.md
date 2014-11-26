# Summary
This is a simple "hello world" app. that demonstrates the major components of a MakerNode project (client, server and hardware).  The app. allows you to toggle an LED on your board by sending commands from any web browser.

# Running the App
You should be connected to your board via serial cable or SSH.  To start the server for your project, on your board, `cd` into this directory. Then, type:
````
node app.js
````
Open a web browser, and navigate to 
````
http://[the_name_of_your_board].local:3000
````
(You may also use the IP address.)

If everything is working correctly, you should see a simple web page, with 2 buttons for turning the 'pin 13' LED on and off on your board.

Note that the app. is configured to run on HTTP port 3000, so need to add ':3000' to the URL.  You may change the port in app.js:
````
var HTTP_PORT = 3000;
````

# Explanation of the Code
## Server
The server code in 'app.js' is responsible for the following:
1. Create an Express HTTP server that will display the web page. 
1. Create a Socket-IO server that listens for button click events emitted by the client.
1. Initialize the connection to the board, and write a 1 or 0 to the pin to toggle the LED.

## Client
In 'client/index.html', you will see the HTML for a simple web page.  There is also some inline JavaScript that initializes the socket on the client side, and emits messages to the server when the buttons are pressed.  
One key detail is the client-side Socket-IO library is generated "on-the-fly" when the Socket-IO server is running.  Hence, you will not see a file in the file system at this location in the 'client/' directory:
````
<script src="/socket.io/socket.io.js"></script>
````

# Dependencies
This app. has dependencies on 3 NPM modules -- [galielo-io](https://www.npmjs.org/package/galileo-io), [express](https://www.npmjs.org/package/express), and [socket-io](https://www.npmjs.org/package/socket.io). These should already have been installed for initial setup of your board.  You might also choose to install them globally on your board since you will probably want them for future projects.
````
npm install -g galileo-io
npm install -g socket-io
npm install -g express 
````

In 'app.js', there is also a relative path to include the utilities library for MakerNode:
````
var utils = require('../../lib/utils/galileo')();
````
This library includes a number of useful commands to simplify setting up the server, and interacting with your board.  You are encouraged to copy the files in 'lib/utils/' and use them for your own projects.



