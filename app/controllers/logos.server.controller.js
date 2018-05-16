/* jshint node: true */ 'use strict';
const auth = require('@cliques/cliques-node-utils').google.auth,
    gcloud = require('google-cloud'),
    errorHandler = require('./errors.server.controller'),
    path = require('path');

// var AUTHFILE = auth.DEFAULT_JWT_SECRETS_FILE;
const AUTHFILE = path.resolve('../cliques-config/google/jwt.json');
const PROJECT_ID = 'mimetic-codex-781';
const BUCKET = 'cliquesads-console-logos-us';
// Use non-secure URL for now, secureURL is virtual field on creative model
const BASE_URL = 'http://storage.googleapis.com/'+BUCKET+'/';

module.exports = db => ({
    /**
     * Handles upload of logo to Google Cloud Storage.
     *
     * Uploads to gcloud storage, makes file public and then returns
     * public URL.
     */
    create: function (req, res, next) {
        const client = gcloud({
            projectId: PROJECT_ID,
            keyFilename: AUTHFILE
        }).storage();
        const assets_bucket = client.bucket(BUCKET);
        const object_path = req.file.filename;
        const options = {
            destination: object_path,
            resumable: true,
            validation: 'crc32c',
            metadata: {
                advertiserId: req.params.advertiser,
                campaignId: req.params.campaign
            }
        };
        assets_bucket.upload(req.file.path, options, (err, file, apiResponse) => {
            if (err) {
                console.log(err);
                return res.status(404).send({
                    message: errorHandler.getAndLogErrorMessage(err)
                });
            } else {
                // make file public and get public facing URL
                file.makePublic((err, apiResponse) => {
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
});
