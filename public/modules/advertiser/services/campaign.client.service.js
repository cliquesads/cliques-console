/**
 * Created by bliang on 1/16/16.
 */
angular.module('advertiser').factory('ClientSideCampaign',['AdvertiserUtils',function(AdvertiserUtils){
    /**
     * Hackish function to strip existing _id fields off of
     * campaign document so it can be safely duplicated without
     * colliding any _id's.
     *
     * TODO: This should really be handled server-side, but for some reason
     * TODO: Mongoose sub-docs tend to ignore primary key uniqueness when saving,
     * TODO: which is infuriating
     *
     * @param obj
     */
    function stripIds(obj){
        if (obj.hasOwnProperty('_id')){
            delete obj._id
        }
        Object.keys(obj).forEach(function(key){
            if (obj.hasOwnProperty(key)){
                if (typeof obj[key] === 'object' && obj[key] != null){
                    if (obj[key].length === undefined){
                        stripIds(obj);
                    } else {
                        obj[key].forEach(function(subObj){
                            stripIds(subObj);
                        });
                    }
                }
            }
        });
    }

    /**
     * Should be used when creating a new Campaign.
     * Represents ClientSide version of campaign object with methods
     * to help translation to and from proper Campaign objects.
     *
     * If instantiated with existingCampaign, will take all enumerable properties
     * from this campaign.  Otherwise, will initialize a blank new campaign
     *
     * @param existingCampaign optional existing Campaign resource
     * @param [options]
     * @param [options.useSuffix=true] whether or not to use suffix if existingCampaign passed in
     * @constructor
     */
    var ClientSideCampaign = function(existingCampaign, options){
        options = options || {};
        var useSuffix = options.useSuffix || true;
        var emptyCampaign = {
            name:           null,
            description:    null,
            budget:         null,
            start_date:     null,
            end_date:       null,
            base_bid:       null,
            max_bid:        null,
            clique:         null,
            dma_targets:    null,
            placement_targets: null
        };

        // This will hold base template from which we copy all enumerable properties
        // if existingCampaign is passed in, will use that as base, otherwise use emptyCampaign
        var campaignTemplate;

        // Now figure out what to start with
        if (existingCampaign){

            // copy existingCampaign to ensure it doesn't get modified
            existingCampaign = angular.copy(existingCampaign);

            // strip off an _id fields
            stripIds(existingCampaign);

            // rename all 'name' fields in campaign & subdocs
            if (useSuffix){
                this.renameStuff(existingCampaign);
            }

            // set campaign status to inactive
            existingCampaign.active = false;

            // Ingest all existing creatives in creativegroups
            this.ingestExistingCreativeGroups(existingCampaign.creativegroups);

            // Throw out old creative groups
            delete existingCampaign.creativeGroups;

            campaignTemplate = existingCampaign;
        } else {
            campaignTemplate = emptyCampaign;
        }
        // Finally, assign all own enumerable properties of campaignTemplate to this
        _.assign(this, campaignTemplate);
    };

    ClientSideCampaign.prototype.renameStuff = function(existingCampaign){
        var NAME_SUFFIX = ' - Copy';
        existingCampaign.name = existingCampaign.name + NAME_SUFFIX;
        existingCampaign.creativegroups.forEach(function(crg){
            crg.name = crg.name + NAME_SUFFIX;
            crg.creatives.forEach(function(creative){
                creative.name = creative.name + NAME_SUFFIX;
            });
        });
        return existingCampaign;
    };

    ClientSideCampaign.prototype.removeCreative = function(creative){
        _.remove(this.creatives, creative);
    };

    /**
     * Base method to add creatives from arbitrary sources
     */
    ClientSideCampaign.prototype._ingestCreatives = function(creatives){
        if (creatives && creatives.length > 0){
            if (!this.creatives){
                this.creatives = [];
            }
            this.creatives = this.creatives.concat(creatives);
        }
    };

    /**
     * Ingest from existing Creative Groups, just flattens all creatives
     * from each group into single array and ingests into this.creatives
     *
     * @param creativeGroups
     */
    ClientSideCampaign.prototype.ingestExistingCreativeGroups = function(creativeGroups){
        var creatives = [];
        creativeGroups.forEach(function(creativeGroup){
            creatives = creatives.concat(creativeGroup.creatives);
        });
        this._ingestCreatives(creatives);
    };

    /**
     * Ingest creatives from FileUploader object
     * @param uploader
     */
    ClientSideCampaign.prototype.ingestCreativeUploader = function(uploader){
        if (uploader){
            var creatives = AdvertiserUtils.getCreativesFromUploadQueue(uploader);
            this._ingestCreatives(creatives);
        }
    };

    /**
     * Ingest Doubleclick Tag creatives
     *
     * @param dcmCreatives
     */
    ClientSideCampaign.prototype.ingestDCMCreatives = function(dcmCreatives){
        if (dcmCreatives) this._ingestCreatives(dcmCreatives);
    };

    /**
     * Call before pushing to Advertiser.campaigns.  Groups all creatives and assigns to
     * this.creativeGroups, and converts all targetArrays to weightedTargetSchema
     */
    ClientSideCampaign.prototype.getCampaignToSave = function(){
        var thisCopy = angular.copy(this);
        thisCopy.creativegroups = AdvertiserUtils.groupCreatives(this.creatives, this.name);
        AdvertiserUtils.convertAllTargetArrays(thisCopy);
        return thisCopy;
    };

    return ClientSideCampaign;
}])
.factory('CampaignDraft', ['$resource',
    function($resource) {
        return $resource('campaign-draft/:draftId', { draftId: '@draftId' },
            {
                update: { method: 'PATCH'},
                create: { method: 'POST'}
            }
        );
    }
]);