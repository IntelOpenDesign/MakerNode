#!/bin/sh

echo "Reset button mapped to reset Wifi to AP mode after a 5 second long press..."

declare -i count=0
declare -i max=4
declare -i wait=20
declare -i waitCount=0

inWaitMode=false
gpioPressed="0"
input_reset_gpio=
output_reset_gpio=

type dmidecode > /dev/null 2>&1 || die "dmidecode not installed"
board=$(dmidecode -s baseboard-product-name)
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

#output the pid of this process to file
echo $$ > reset.pid

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
		if [ "$waitCount" -ge "$wait" ]; then
			waitCount=$((0))
			inWaitMode=false
		fi
		
	fi
	
	sleep 1

done