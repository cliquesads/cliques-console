#!/bin/bash

source ./activate_production.sh
nvm use 0.12.0
npm install
grunt build

if [ ! -d $HOME"/repositories/cliques-config" ]; then
    git clone git@github.com:cliquesads/cliques-config.git ../cliques-config
    ln -s ../cliques-config .
else
    cd ../cliques-config
    git pull
    cd ../cliques-console
fi

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
