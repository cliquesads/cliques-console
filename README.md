# Cliques Console
A [MEAN.js](http://meanjs.org) app for all Cliques advertiser, publisher & administrator management and reporting. Currently live in two environments:
* **[console.cliquesads.com](https://console.cliquesads.com)** *(production)*
* **[staging-console.cliquesads.com](https://staging-console.cliquesads.com)** *(dev)*

The Console is a single-page-app (SPA) with full client-side MVC functionality provided by [Angular.js](http://angularjs.org/)(v1.x) interacting w/ a RESTful API service powered by [Node.js](http://www.nodejs.org/) & [Express.js](http://expressjs.com/). All CSS files are compiled from [LESS](http://lesscss.org/).

Originally based on the scaffolding provided by [MEAN.js 0.3.x](http://meanjs.org/docs/0.3.x/) and the [Angle Bootstrap Admin template](https://wrapbootstrap.com/theme/angle-bootstrap-admin-template-WB04HF123) by [Themicon](http://themicon.co/), but all original boilerplate has been highly customized.

## Databases and Models
The main storage layer for the Console is [MongoDB](http://mongodb.org/). We use the Node.js ORM [Mongoose](http://mongoosejs.com/) to specify all model schemas. 

### A Note on Cliques Mongoose Models
Mongoose schemas are found in this repository under `app/models/`. 

**However**, only models that are specific to the Console reside here (ex: Users, Organizations, Payments, etc.). Models that need to be accessed by multiple repositories are found in the shared [cliques-node-utils](https://github.com/cliquesads/cliques-node-utils/tree/master/lib/mongodb/models) repo in order to centralize shared model specs.

### Databases
There are two MongoDB "databases" (which are like "schemas" in SQL parlance), one for production data & one for development:

#### `exchange`
The production database. Contains both schemas specified in this repository, as well as those specified in [cliques-node-utils](https://github.com/cliquesads/cliques-node-utils).

#### `exchange_dev`
This is the development database. All collections are copied from `exchange` every 2 hours via a [Python ETL](https://github.com/cliquesads/cliquesadmin/blob/master/bin/sync_dev_db.py).

Each time the collections are synced, all changes to `exchange_dev` collections are wiped clean and replaced with the the most recent data from production.

For **aggregate** collections like `hourlyadstats`, in the interest of preserving storage space, only the last 72 hours of data will be kept.  So don't be surprised when you only see the last 3 days' worth of data in charts when running the console in dev!

## Environments
There are three primary environments for the Console. The `NODE_ENV` environment variable is used to indicate which environment should be loaded:

### `local-test`
* Used for development purposes when running the console on your **local machine**.
* Console will run off of the **[exchange_dev](** Mongo Database.
* LESS files are all compiled to single CSS file, but all client-side JS files are loaded individually
..*

## Setup & Deployment
Use the following instructions to install system dependencies & deploy the Console  

### Prerequisites
The Console is only designed to be deployed on **UNIX-based** operating systems.It's possible to run it on Windows.

### Cloning The GitHub Repository
```
$ git clone https://github.com/cliquesads/cliques-console.git cliques-console
```

### Setup - Mac OSX (for development)
To 

```
$ npm install -g bower
```

* Grunt - You're going to use the [Grunt Task Runner](http://gruntjs.com/) to automate your development process, in order to install it make sure you've installed Node.js and npm, then install grunt globally using npm:

```
$ sudo npm install -g grunt-cli
```

## Running Your Application
After the install process is over, you'll be able to run your application using Grunt, just run grunt default task:

```
$ grunt
```

Your application should run on the 3000 port so in your browser just go to [http://localhost:3000](http://localhost:3000)                          
