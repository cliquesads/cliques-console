# Cliques Console
A [MEAN.js](http://meanjs.org) app for all Cliques advertiser, publisher & administrator management and reporting. Currently live in two environments:
* **[console.cliquesads.com](https://console.cliquesads.com)** *(production)*
* **[staging-console.cliquesads.com](https://staging-console.cliquesads.com)** *(dev)*

### Core Packages & Frameworks
The Console is a single-page-app (SPA) with full client-side MVC functionality provided by [Angular.js](http://angularjs.org/)(v1.x) interacting w/ a RESTful API service powered by [Node.js](http://www.nodejs.org/) & [Express.js](http://expressjs.com/). All CSS files are compiled from [LESS](http://lesscss.org/).

### Templates & Scaffolding
Originally based on the scaffolding provided by [MEAN.js 0.3.x](http://meanjs.org/docs/0.3.x/) and the [Angle Bootstrap Admin template](https://wrapbootstrap.com/theme/angle-bootstrap-admin-template-WB04HF123) by [Themicon](http://themicon.co/), but all original boilerplate has been highly customized.

### Development & Build Tools
Node.js server-side packages (public & private) are (obviously) managed by [NPM](https://www.npmjs.com/). [Bower](https://bower.io/) handles management of all client-side packages. [Grunt](http://gruntjs.com/) handles all building & linting steps, and can also be used to run the app in development.

### Contents
* [Setup & Deployment](#setup-and-deployment)
  * [Prerequisites](#prerequisites)
    * [Supported Operating Systems](#supported-operating-systems)
    * [Config Permissions](#cliques-config-permissions)
    * [NPM Permissions](#npm-permissions)
  * [For Mac OSX](#for-macosx)
  * [For Debian](#for-debian)
* [Environments](#environments)
  * [Node.js Environment](#node.js-environment)
    * [Configuration](#configuration)
  * [Deployment Environment](#deployment-environment)
    * [local-test](#local-test)
    * [dev](#dev)
    * [production](#production)
  * [Activating an Environment](#activating-an-environment)
* [Databases and Models](#databases-and-models)
  * [Cliques Mongoose Models](#cliques-mongoose-models)
  * [Databases](#databases)
    * [exchange](#exchange)
    * [exchange-dev](#exchange_dev)

# Setup and Deployment
Use the following instructions to install system dependencies & deploy the Console. 

## Prerequisites
#### Supported Operating Systems
The Console is only designed to be deployed on **UNIX-based** operating systems. It's possible to run it on Windows, but it's more complicated.

#### Cliques Config Permissions
Also, in order to successfully deploy the console in any environment, you **MUST** have read/pull access the [cliques-config](https://github.com/cliquesads/cliques-config) repository.  All network credentials, API keys, etc. are stored in this repository. If you don't have access to this repository, there is likely a reason for that.

#### NPM Permissions
The repository depends on [cliques-node-utils](https://github.com/cliquesads/cliques-node-utils), which is installed as a private NPM dependency under the NPM [@cliques](https://www.npmjs.com/org/cliques) organization.  You must **have an NPM account** and be added as a **member of the @cliques organization** in order to install this package, or else the setup process will fail.

## For MacOSX
### Setup


### Deployment

## For Debian
### Setup

### Deployment

* Grunt - You're going to use the [Grunt Task Runner](http://gruntjs.com/) to automate your development process, in order to install it make sure you've installed Node.js and npm, then install grunt globally using npm:

```
$ sudo npm install -g grunt-cli
```

### Running Your Application
After the install process is over, you'll be able to run your application using Grunt, just run grunt default task:

```
$ grunt
```

Your application should run on the 3000 port so in your browser just go to [http://localhost:3000](http://localhost:3000)    


# Environments
There are really two distinct "environment" scopes that I'll address below:

* **Node.js Environment** - Local, isolated Node.js interpreter that is explicitly versioned, and specific "global" Node.js packages that are installed to this environment.  This is controlled by NVM (see below).
* **Deployment Environment** - Specific deployment environment (i.e. `local-test`,`dev`,`production`) which specifies database/API credentials and build steps.

The Node.js environment is configured independently from the deployment environment.  See below for details.

## Node.js Environment
I use [Node Version Manager (NVM)](https://github.com/creationix/nvm) to manage the specific version of Node.js interpreter being used to run the Console. This gets around any potential incompatibilities between different versions of Node.js installed on local systems.  

This setup works almost identically to Python's powerful [virtualenv](https://virtualenv.pypa.io/en/stable/) package, in that it creates an isolated Node.js environment that depends on explicitly-declared global package versions (see [Environment Config](#environment-config) below).

NVM installs a "local" Node.js to the `.nvm` directory, and all "global" packages are installed to this directory rather than in the system node modules directory.

#### Configuration
All versioning information for NVM and "global" (not actually "system" global but installed to the NVM directory) Node packages are stored in the [console_environment.cfg](https://github.com/cliquesads/cliques-config/blob/master/environments/console_environment.cfg) config file found in the [cliques-config](https://github.com/cliquesads/cliques-config). You may or may not have access to this repository depending on your team status, please refer to [Config Permissions](#config-permissions) for details.

## Deployment Environment
There are three primary deployment environments for the Console. The `NODE_ENV` environment variable is used to indicate which environment should be loaded:

#### `local-test`
* Used for development purposes when running the console on your **local machine**.
* Console will run off of the **[exchange_dev](#exchange_dev)** Mongo Database.
* LESS files are all compiled to single CSS file, but all client-side JS files are loaded individually, which allows you to easily debug  client-side JS.
  * The downside to this is that each full page reload will be extremely slow.
* Server runs non-secure http
  
#### `dev`
* Used for staging server.
* Console will run off of the **[exchange_dev](#exchange_dev)** Mongo Database.
* LESS files are all compiled to single CSS file; client-side JS will be concatted to a single `application.js` file, but not minified to still allow for some debugging.
* Server runs securely over https

#### `production`
* Actual production console environment.
* Console will run off of the **[exchange](#exchange)** Mongo Database.
* LESS files are all compiled to single CSS file; client-side JS will be concatted & minified to single application.min.js.
* Server runs securely over https

## Activating an Environment
You can use the `activate_env.sh` shell script to "activate" the local NVM Node.js environment **AND** a specific deployment environment (all this does is just set the `NODE_ENV` environment variable).  This script is used in the deployment step for `dev` and `production`, but it is also useful on its own when you are working on the command line and need to access to the Console's specific environment.

```sh
# use the `-e` flag to pass in a deployment environment
# default is 'production'
$ source activate_env.sh -e dev
```

# Databases and Models
The main storage layer for the Console is [MongoDB](http://mongodb.org/). We use the Node.js ORM [Mongoose](http://mongoosejs.com/) to specify all model schemas. 

## Cliques Mongoose Models
Mongoose schemas are found in this repository under `app/models/`. 

**However**, only models that are specific to the Console reside here (ex: Users, Organizations, Payments, etc.). Models that need to be accessed by multiple repositories are found in the shared [cliques-node-utils](https://github.com/cliquesads/cliques-node-utils/tree/master/lib/mongodb/models) repo in order to centralize shared model specs.

## Databases
There are two MongoDB "databases" (which are like "schemas" in SQL parlance), one for production data & one for development:

#### `exchange`
The production database. Contains both schemas specified in this repository, as well as those specified in [cliques-node-utils](https://github.com/cliquesads/cliques-node-utils).

#### `exchange_dev`
This is the development database. All collections are copied from `exchange` every 2 hours via a [Python ETL](https://github.com/cliquesads/cliquesadmin/blob/master/bin/sync_dev_db.py).

Each time the collections are synced, all changes to `exchange_dev` collections are wiped clean and replaced with the the most recent data from production.

For **aggregate** collections like `hourlyadstats`, in the interest of preserving storage space, only the last 72 hours of data will be kept.  So don't be surprised when you only see the last 3 days' worth of data in charts when running the console in dev!
