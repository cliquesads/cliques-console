/* jshint node: true */ 'use strict';
var auth = require('@cliques/cliques-node-utils').google.auth,
    gcloud = require('gcloud'),
    config = require('config'),
    cloudinary = require('cloudinary'),
    errorHandler = require('./errors.server.controller');

cloudinary.config({
    cloud_name: config.get('Cloudinary.cloud_name'),
    api_key: config.get('Cloudinary.api_key'),
    api_secret: config.get('Cloudinary.api_secret')
});

var AUTHFILE = auth.DEFAULT_JWT_SECRETS_FILE;
var PROJECT_ID = 'mimetic-codex-781';

// Bucket to store creative assets for display
var DISPLAY_BUCKET = 'cliquesads-creativeassets-us';
// Use non-secure URL for now, secureURL is virtual field on creative model
var DISPLAY_BASE_URL = 'http://storage.googleapis.com/'+DISPLAY_BUCKET+'/';

// Bucket to store raw native ad images
// var NATIVE_BUCKET = 'cliquesads-native-images-us';
// Use non-secure URL for now, secureURL is virtual field on creative model
// var NATIVE_BASE_URL = 'http://storage.googleapis.com/'+NATIVE_BUCKET+'/';

module.exports = function(db) {
    return {
        display: {
            /**
             * Handles upload of creative asset to Google Cloud Storage.
             *
             * Uploads to gcloud storage, makes file public and then returns
             * public URL.
             */
            create: function (req, res, next) {
                var client = gcloud({
                    projectId: PROJECT_ID,
                    keyFilename: AUTHFILE
                }).storage();
                var assets_bucket = client.bucket(DISPLAY_BUCKET);
                var object_path = req.file.filename;
                var options = {
                    destination: object_path,
                    resumable: true,
                    validation: 'crc32c',
                    metadata: {
                        advertiserId: req.params.advertiser,
                        campaignId: req.params.campaign
                    }
                };
                assets_bucket.upload(req.file.path, options, function(err, file, apiResponse){
                    if (err) {
                        console.log(err);
                        return res.status(404).send({
                            message: errorHandler.getAndLogErrorMessage(err)
                        });
                    } else {
                        // make file public and get public facing URL
                        file.makePublic(function(err, apiResponse){
                            if (err) return res.status(404).send({
                                message: errorHandler.getAndLogErrorMessage(err)
                            });
                            // construct public URL of newly-uploaded asset
                            // to return to client in apiResponse
                            // Not sure if it's necessary to include full apiResponse
                            // but it can't hurt
                            apiResponse.url  = DISPLAY_BASE_URL + object_path;
                            return res.json(apiResponse);
                        });
                    }
                });
            }
        },
        native: {
            /**
             * Handles upload of creative asset to Google Cloud Storage.
             *
             * Uploads to gcloud storage, makes file public and then returns
             * public URL.
             */
            uploadImage: function (req, res, next) {
                cloudinary.v2.uploader.upload(req.file.path, {
                    use_filename: true
                }, function(err, result){
                    if (err) return res.status(err.http_code).send(err);
                    return res.status(200).json(result);
                });
            }
        }
    };
};
