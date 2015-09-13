/* jshint node: true */ 'use strict';
var auth = require('cliques_node_utils').google.auth,
    gcloud = require('gcloud'),
    errorHandler = require('./errors.server.controller');
var AUTHFILE = auth.DEFAULT_JWT_SECRETS_FILE;
var PROJECT_ID = 'mimetic-codex-781';
var BUCKET = 'cliquesads-console-logos-us';
// Use non-secure URL for now, secureURL is virtual field on creative model
var BASE_URL = 'http://storage.googleapis.com/'+BUCKET+'/';

module.exports = function(db) {
    return {
        /**
         * Handles upload of logo to Google Cloud Storage.
         *
         * Uploads to gcloud storage, makes file public and then returns
         * public URL.
         */
        create: function (req, res, next) {
            var client = gcloud({
                projectId: PROJECT_ID,
                keyFilename: AUTHFILE
            }).storage();
            var assets_bucket = client.bucket(BUCKET);
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
                        apiResponse.url  = BASE_URL + object_path;
                        return res.json(apiResponse);
                    });
                }
            });
        }
    };
};
