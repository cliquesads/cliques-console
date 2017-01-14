Running mongodb locally:

## Install mongo (mongod, mongodump, mongorestore)

[See Here](https://docs.mongodb.com/manual/installation/)

## mongodump the dev db
Running this will dump all data from the dev DB to the `./dump` folder:

```
$ mongodump -h 146.148.94.184:27017 -u <username> -p <password> -db exchange_dev
```

## Run local mongo DB
First create a path where you'd like the DB to be located. The default is `/data/db`, but
not all users will have access to the root `/data` folder on their machine.

```
$ mkdir -p ~/mongodb/db
```

Now spin up your local `mongod` instance, which will accept connections at `127.0.0.1:27017`.

```
$ mongod --dbpath ~/mongodb/db
```

## Import dumped data with mongorestore
```
$ mongorestore --db exchange_deb /path/to/dump
```
