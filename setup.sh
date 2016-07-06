#!/bin/bash

# usage text visible when --help flag passed in
usage="$(basename "$0") -- Sets up all global packages necessary to deploy the console, including Node, PM2 & grunt using environment set in config/console-environment.cfg.

where:
    --help  show this help text"

if [ ! -z $1 ]; then
  if [ $1 == '--help' ]; then
    echo "$usage"
    exit 0
  fi
fi


#system deps
sudo apt-get update
sudo apt-get install gcc make build-essential

# this is a system dependency for Phantom.js
sudo apt-get install libfontconfig1

# make sure cliques-config repo is cloned & pull any new commits
if [ ! -d $HOME"/repositories/cliques-config" ]; then
    git clone git@github.com:cliquesads/cliques-config.git ../cliques-config
    ln -s ../cliques-config cliques-config
else
    cd ../cliques-config
    git pull
    cd ../cliques-console
fi

# Now get proper environment variables for global package versions, etc.
source ./cliques-config/environments/console_environment.cfg

#download NVM and install NVM & node
curl https://raw.githubusercontent.com/creationix/nvm/v"$NVM_VERSION"/install.sh | NVM_DIR=$HOME/repositories/cliques-console/.nvm bash
source .nvm/nvm.sh
nvm install $NODE_VERSION

#install node dependencies
npm update
#have to install pm2 & mocha globally into nvm dir
npm install pm2@$PM2_VERSION -g
# update in-memory pm2 version
pm2 update
# TODO: Add versions
npm install grunt-cli -g
npm install mocha -g
npm install bower -g