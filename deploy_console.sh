#!/bin/bash

source ./activate_production.sh
nvm use 0.12.0
npm install
NODE_ENV=development grunt build

processname='cliques-console'
running=$(pm2 list -m | grep "$processname")

if [ -z "$running" ]; then
#    # hook PM2 up to web monitoring with KeyMetrics
#    pm2 link d39yzaslt8iu57e w77ttxdzer9p8zv $hostname
    # start in cluster mode
    pm2 start server.js --name "$processname" -i 0
else
    pm2 gracefulReload "$processname"
fi