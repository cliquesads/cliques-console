/**
 * One-time migration script to get screenshot models all the missing ObjectIds.
 */
require('../_main')(function(GLOBALS) {
    var models = GLOBALS.cliques_mongo.models,
        db = GLOBALS.db,
        _ = require('lodash'),
        async = require('async'),
        util = require('util');

    var screenshotModels = new models.ScreenshotModels(db);
    var advertiserModels = new models.AdvertiserModels(db);
    var publisherModels = new models.PublisherModels(db);

    var parentAdvertiser, parentCampaign, parentPublisher, parentPage, parentSite;

    screenshotModels.Screenshot.find({}, function(err, screenshots) {
        if (err) return console.error(err);
        async.each(screenshots, function(screenshot, callback){
            advertiserModels.getNestedObjectById('' + screenshot.creativegroup, 'CreativeGroup', function(err, crg) {
                if (crg) {
                    parentAdvertiser = crg.parent_advertiser;
                    parentCampaign = crg.parent_campaign;
                } else {
                    console.error('crg not exist for ' + screenshot.creativegroup);
                }
                publisherModels.getNestedObjectById('' + screenshot.placement, 'Placement', function(err, placement) {
                    if (placement) {
                        parentPublisher = placement.parent_publisher;
                        parentPage = placement.parent_page;
                        parentSite = placement.parent_site;
                    } else {
                        console.error('placement not exit for ' + screenshot.placement);
                    }
                    screenshot.advertiser = parentAdvertiser._id;
                    screenshot.publisher = parentPublisher._id;
                    screenshot.page = parentPage._id;
                    screenshot.site = parentSite._id;
                    screenshot.campaign = parentCampaign._id;
                    screenshot.save(callback);
                });
            });
        }, function(err){
            if (err) {
                console.error(err);
                return process.exit(1);
            } else {
                console.log('Done!');
                return process.exit(0);
            }
        });
    });
});
