angular.module('advertiser').factory('AdvertiserUtils',function() {
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
                        url: fileItem.url
                    });
                }
            });
            return creatives;
        },
        /**
         * Helper function to group creatives by size and create creative groups for each
         * @param creatives
         * @param groupname_prefix
         * @returns {Array}
         */
        groupCreatives: function (creatives, groupname_prefix) {
            var creativegroups_obj = {};
            creatives.forEach(function (creative) {
                var key = creative.w + 'x' + creative.h;
                if (creativegroups_obj.hasOwnProperty(key)) {
                    creativegroups_obj[key].push(creative);
                } else {
                    creativegroups_obj[key] = [creative];
                }
            });
            var creativegroups = [];
            for (var size in creativegroups_obj) {
                if (creativegroups_obj.hasOwnProperty(size)) {
                    creativegroups.push({
                        name: groupname_prefix + '_' + size,
                        h: Number(size.split('x')[1]),
                        w: Number(size.split('x')[0]),
                        creatives: creativegroups_obj[size]
                    });
                }
            }
            return creativegroups
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
                    target: obj._id,
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
    }
});
