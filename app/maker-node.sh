#!/bin/sh
start() {
        echo "Starting MakerNode Server..."
        pushd $MAKER_NODE_APP_DIR
        node ./index.js
        popd
}

stop() {
        echo "Stopping MakerNode Server..."
        #need more graceful implementation. :)
        killall node
}

restart() {
        echo "Restarting MakerNode Server..."
        stop
        start
}

status() {
        echo "Do something here..."
}

help() {
        echo $"Usage: $0 {start|stop|restart|status|help}"
}

if [ "$#" -ne 1 ]
then
        help
        exit 1
fi

# call arguments verbatim:
$@
