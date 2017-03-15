#!/bin/sh
FOLDER=$(pwd)
NODE_SCRIPT=$FOLDER"/bin/cron_report.js"

# Prepare the crontab list file
NODE_PATH=$(which node)
touch cronjob_list
# Periodically run cron_report.js eveery 30 minutes
echo "30 * * * * $NODE_PATH $NODE_SCRIPT" >> cronjob_list
# Install cron task
crontab cronjob_list
