#!/bin/bash

#system deps
sudo apt-get update
sudo apt-get install gcc make build-essential

#download NVM and install NVM & node
curl https://raw.githubusercontent.com/creationix/nvm/v0.24.0/install.sh | NVM_DIR=$HOME/repositories/cliques-console/.nvm bash
source .nvm/nvm.sh
nvm install 0.12.0
nvm use 0.12.0

#install node dependencies
npm update
npm install
# TODO: Fix this, doesnt install pm2 or mocha packages properly in
# TODO: nvm dir
#have to install pm2 & mocha globally into nvm dir
sudo npm install pm2 -g
sudo npm install mocha -g
sudo npm install bower -g
sudo npm install grunt -g
sudo npm install -g grunt-cli