#! /bin/bash
start_time=`date +%s`
project_name=${1:-my_project}
# The next lines clones directly on the device, but I don't think we need this...
project_path=/home/root/projects
target="root@${2:-clanton.local}"
echo running node $project_path/$project_name/app.js
ssh $target bash -c "'
  killall node 
  node $project_path/$project_name/app.js
'"
echo Completed in $(expr `date +%s` - $start_time) seconds.
exit 0
