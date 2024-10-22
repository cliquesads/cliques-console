/* global _, angular, moment */
'use strict';

angular.module('advertiser').factory('AdvertiserUtils',['$http', function($http) {
    return {
        /**
         * Maps successfully uploaded items in uploader queue to array of
         * creative objects to push to API
         * @returns {Array}
         */
        getCreativesFromUploadQueue: function (uploader) {
            var creatives = [];
            uploader.queue.forEach(function (fileItem) {
                if (fileItem.isSuccess) {
                    creatives.push({
                        name: fileItem.file.name,
                        click_url: fileItem.click_url,
                        w: fileItem.width,
                        h: fileItem.height,
                        weight: 1,
                        type: 'display',
                        retina: fileItem.retina,
                        url: fileItem.url
                    });
                }
            });
            return creatives;
        },
        /**
         * Maps successfully uploaded items in uploader queue to array of
         * creative objects to push to API
         * @returns {Array}
         */
        getCreativesFromNativeUploadQueue: function (uploader, advertiser) {
            var creatives = [];
            uploader.queue.forEach(function (fileItem) {
                if (fileItem.isSuccess) {
                    creatives.push({
                        name: fileItem.file.name,
                        click_url: fileItem.click_url,
                        type: 'native',
                        impTracker: fileItem.impTracker,
                        clickTracker: fileItem.clickTracker,
                        h: 1,
                        w: 1,
                        weight: 1,
                        native: {
                            imageUrl: fileItem.imageUrl,
                            imageW: fileItem.rawImageW,
                            imageH: fileItem.rawImageH,
                            description: fileItem.description,
                            headline: fileItem.headline,
                            logoUrl: advertiser.logo_url,
                            logoH: 20, // TODO: Update w/ real number
                            logoW: 20 // TODO: Update w/ real number
                        }
                    });
                }
            });
            return creatives;
        },
        /**
         * Helper function to group creatives by size and create creative groups for each.
         * 
         * Pushes creative.type === 'native' creatives into their own group
         * @param creatives
         * @param groupname_prefix
         * @returns {Array}
         */
        groupCreatives: function (creatives, groupname_prefix) {
            var creativegroups_obj = {};
            creatives.forEach(function (creative) {
                var key;
                if (creative.type === 'native'){
                    key = 'native';
                } else {
                    key = creative.w + 'x' + creative.h;
                }
                if (creativegroups_obj.hasOwnProperty(key)) {
                    creativegroups_obj[key].push(creative);
                } else {
                    creativegroups_obj[key] = [creative];
                }
            });
            var creativegroups = [];
            for (var size in creativegroups_obj) {
                if (creativegroups_obj.hasOwnProperty(size)) {
                    if (size === 'native') {
                        creativegroups.push({
                            name: groupname_prefix + '_' + size,
                            type: 'native',
                            h: 1,
                            w: 1,
                            creatives: creativegroups_obj[size]
                        });
                    } else {
                        creativegroups.push({
                            name: groupname_prefix + '_' + size,
                            type: 'display',
                            h: Number(size.split('x')[1]),
                            w: Number(size.split('x')[0]),
                            creatives: creativegroups_obj[size]
                        });
                    }
                }
            }
            return creativegroups;
        },

        updateCreativeGroups: function(newCreativeGroups, campaign){
            newCreativeGroups.forEach(function (crg) {
                // find like sized creative group and append to it, or find native creative group and append to
                // that one
                var ind = _.findIndex(campaign.creativegroups, function (cg) {
                    if (crg.type === 'native'){
                        return cg.type === 'native';
                    } else {
                        return cg.w === crg.w && cg.h === crg.h;    
                    }
                });
                // if creativegroup of same size exists, add to this creative group
                if (ind > -1) {
                    campaign.creativegroups[ind].creatives = campaign.creativegroups[ind].creatives.concat(crg.creatives);
                } else {
                    campaign.creativegroups.push(crg);
                }
            });
        },

        /**
         * Converts array of weighted targets with whole target object in each element
         * to array of objects that conform with respective weightedTargetSchema
         * @param arr
         */
        convertWeightedTargetArray: function (arr) {
            if (arr === null) return arr;
            var new_target_arr = [];
            arr.forEach(function (obj) {
                new_target_arr.push({
                    target: obj.target || obj._id, // don't do anything if obj already has 'target' attr
                    weight: obj.weight
                });
            });
            return new_target_arr;
        },
        convertAllTargetArrays: function(campaign) {
            // convert target arrays to weightedSchema format
            for (var prop in campaign) {
                if (campaign.hasOwnProperty(prop)) {
                    // TODO: sort of a hack
                    if (prop.indexOf('_targets') > -1) {
                        campaign[prop] = this.convertWeightedTargetArray(campaign[prop]);
                    }
                }
            }
            return campaign;
        }
    };
}]);
