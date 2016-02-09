#!/bin/bash

# usage text visible when --help flag passed in
usage="$(basename "$0") -- deploy the Cliques Console

where:
    --help  show this help text
    -e arg (='production') environment flag - either 'dev' or 'production'.  Defaults to production"

# BEGIN environment parsing
env="production"

if [ ! -z $1 ]; then
  if [ $1 == '--help' ]; then
    echo "$usage"
    exit 0
  fi
fi

# fucking getopts
while getopts ":e:" opt; do
  case $opt in
    e)
      if [ "$OPTARG" != 'production' ] && [ "$OPTARG" != 'dev' ]; then
        echo "Invalid environment: $OPTARG.  Environment must be either 'dev' or 'production'"
        exit 1
      else
        env="$OPTARG"
      fi
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      echo "$usage"
      exit 1
      ;;
    :)
      echo "Environment flag -$OPTARG requires an argument (either 'dev' or 'production')" >&2
      exit 1
      ;;
  esac
done
# END environment parsing

############### BEGIN Environment setup ################

# Set proper environment variables now that env is set
if [ "$env" == "production" ]; then
    processname='cliques-console'
else
    processname='cliques-console-dev'
fi

source activate_env.sh -e $env
# if activate_env failed then bail
if [ $? -ne 0 ]; then
    exit $?
fi

# run npm install to install any new dependencies
npm install --force
npm install cliques-node-utils

# run build step
rm -rf ./public/dist/*
grunt build-"$env"

running=$(pm2 list -m | grep "$processname")
redir_running=$(pm2 list -m | grep "https_redirect")

if [ -z "$running" ]; then
    # hook PM2 up to web monitoring with KeyMetrics
    pm2 link $KEYMETRICS_PRIVATE_KEY $KEYMETRICS_PUBLIC_KEY $HOSTNAME
    # start in cluster mode
    pm2 start server.js --name "$processname" -i 0
else
    pm2 gracefulReload "$processname"
fi

if [ -z "$redir_running" ]; then
    # start in cluster mode
    pm2 start https_redirect.js -i 1 --name "https_redirect"
else
    pm2 gracefulReload "https_redirect"
fi