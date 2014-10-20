#!/bin/sh

echo "Reset button mapped to reset Wifi to AP mode after a 5 second long press..."

declare -i count=0
declare -i max=4
declare -i waitL=20
declare -i waitCount=0

inWaitMode=false
gpioPressed="0"
input_reset_gpio=
output_reset_gpio=
board=

#get the distribution of Linux
issue=$(cat /etc/issue | awk '{print $1;}' | tr -d "\n")
echo "linux distribution is: $issue"

if [ "$issue" == "iot-devkit" ]; then
	#method for iotdk dist. by SSG (full gcc)
	board=$(cat /sys/devices/virtual/dmi/id/board_name)
	echo "board name is: $board"
else
	#method for standard version of linux dist. by NDG
	type dmidecode > /dev/null 2>&1 || die "dmidecode not installed"
	board=$(dmidecode -s baseboard-product-name)
	echo "board name is: $board"
fi

#get the GPIO pins for the button
case "$board" in
    "Galileo")
        input_reset_gpio=52
        output_reset_gpio=53
        ;;
    "GalileoGen2")
        input_reset_gpio=63
        output_reset_gpio=47
        ;;
esac


startAPMode()
{
  echo "USER pressed reset for 5 seconds....."
  ~/MakerNode/sh/restore_factory_settings.sh
  echo "Board returned to original setting and is now in AP mode"
}

#output the pid of this process to file (no longer needed)
echo $$ > reset.pid

#make sure the GPIO is exported, on the iotdk only R3 pins are exported
echo -n $output_reset_gpio > /sys/class/gpio/export
echo -n $input_reset_gpio > /sys/class/gpio/export

#check button press of buttons
keepgoing=true
while $keepgoing

do
	if [ "$inWaitMode" == false ]; then


		gpioIn=`cat /sys/class/gpio/gpio${output_reset_gpio}/value`
		gpioOut=`cat /sys/class/gpio/gpio${input_reset_gpio}/value`

		if [[ "$gpioIn" = "$gpioPressed" ]] && [[ "$gpioOut" = "$gpioPressed" ]]; then
			echo "Reset Button press"
			count=$((count+1))
		else
			count=$((0))
		fi

		if [ "$count" -ge "$max" ]; then
			startAPMode
			count=$((0))
			inWaitMode=true
		fi

	else
		waitCount=$((waitCount+1))
		if [ "$waitCount" -ge "$waitL" ]; then
			waitCount=$((0))
			inWaitMode=false
		fi

	fi

	sleep 1

done
