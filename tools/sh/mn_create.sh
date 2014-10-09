#! /bin/bash
repo=https://github.com/IntelOpenDesign/MakerNodeProjectSkeleton.git
start_time=`date +%s`
project_name=${1:-my_project}
echo creating project $project_name
git clone -v --progress $repo ./$project_name
pushd $project_name
rm -rf .git*
# npm install
popd
# The next lines clones directly on the device, but I don't think we need this...
#project_path=/home/root/projects
# target="root@${2:-clanton.local}"
# ssh $target git clone -v --progress $repo $project_path/$project_name 
echo Completed in $(expr `date +%s` - $start_time) seconds.
exit 0
