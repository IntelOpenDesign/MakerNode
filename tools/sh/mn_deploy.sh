#! /bin/bash
start_time=`date +%s`
payload=${1:-.}
target="root@${2:-clanton.local}:${3:-/home/root/projects/}"
echo deploying $payload to $target
scp -prC $payload $target	
echo Completed in $(expr `date +%s` - $start_time) seconds.
exit 0

