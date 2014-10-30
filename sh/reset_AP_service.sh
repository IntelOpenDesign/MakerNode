#!/bin/sh
start() {
        echo "Starting Button Monitor..."
        pushd /home/root/MakerNode/
		    sh/reset_button_monitor.sh
        popd
}

stop() {
        echo "Stopping Button Monitor..."
        #TODO: need more graceful implementation. :)
		kill $(echo -n > /home/root/MakerNode/sh/reset.pid)
}

restart() {
        echo "Restarting Button Monitor..."
        stop
        start
}

status() {
        echo "Still monitoring..."
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
