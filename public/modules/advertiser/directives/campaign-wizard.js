'use strict';
angular.module('advertiser').directive('campaignWizard', [
    '$compile',
    'Authentication',
    'Advertiser',
    'getCliqueTree',
    'getSitesInClique',
    'DMA',
    'FileUploader',
    'AdvertiserUtils',
    'BID_SETTINGS',
    'ADVERTISER_TOOLTIPS',
	function($compile, Authentication, Advertiser,
             getCliqueTree, getSitesInClique, DMA, FileUploader, AdvertiserUtils,
             BID_SETTINGS, ADVERTISER_TOOLTIPS) {
        return {
            restrict: 'E',
            scope: {
                advertiser: '=',
                campaign: '='
            },
            templateUrl: 'modules/advertiser/views/partials/campaign-wizard.html',
            link: function (scope, element, attrs) {

                // prepare campaign data, if passed in
                scope.campaign = angular.copy(scope.campaign);
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
                stripIds(scope.campaign);

                // Horrible hack to lazy load sub-directives
                // Weird shit happens they pre-load (they don't get the right
                // scope vars & such), so I've resorted to lazily-compiling
                // their templates & injecting compiled HTML into elements
                // using jQuery.
                // I tried to use the DIRECTIVE I JUST WROTE 'compile' as well, but could
                // never get it to compile so I just gave up
                function injectDirective(elementId, template){
                    if ($(elementId).is(':empty')){
                        $(elementId).append($compile(template)(scope));
                    }
                }

                // LAZY LOADERS
                scope.loadCliqueStep = function(callback, callbackArg){
                    var treeDirective = '<abn-tree tree-data="cliques" tree-control="my_tree" on-select="set_clique(branch)" icon-leaf="fa fa-square" expand-level="2" initial-selection="Outdoor"></abn-tree>';
                    injectDirective('#cliquesTree', treeDirective);
                    return callback(callbackArg);
                };

                scope.loadCreativeUploadStep = function(callback, callbackArg){
                    var creativeUploader = '<creative-uploader wizardstep="step4" uploader="uploader" onuploadall="validateAndUpload(wizard.validateStep(4))" width="12"> </creative-uploader>'
                    var dcmUploader = '<doubleclick-creative-uploader on-upload="onDCMUpload(creatives)"></doubleclick-creative-uploader>';
                    injectDirective('#creativeUploader', creativeUploader);
                    injectDirective('#dcmUploader', dcmUploader);
                    return callback(callbackArg);
                };


                //##################################//
                //###### INIT SCOPE VARIABLES ######//
                //##################################//


                scope.authentication = Authentication;
                scope.TOOLTIPS = ADVERTISER_TOOLTIPS;

                // Populate tree data for tree visualization
                scope.cliques = [];
                getCliqueTree({active: true},function(err, cliques){
                    scope.cliques = cliques;
                });
                scope.set_clique = function(branch) {
                    scope.campaign.clique = branch.label;
                    getSitesInClique(branch.label).then(function(response){
                        scope.sites = response.data;
                    });
                };
                var tree;
                // This is our API control variable
                scope.my_tree = tree = {};

                scope.dmas = DMA.query();

                // Set mins & maxes
                scope.min_base_bid = BID_SETTINGS.min_base_bid;
                scope.max_base_bid = BID_SETTINGS.max_base_bid;

                scope.campaign = {
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

                //#################################//
                //######### FILE UPLOADER #########//
                //#################################//

                var uploader = scope.uploader = new FileUploader({
                    url: 'creativeassets'
                });
                scope.uploader.onCompleteAll = function(){
                    scope.uploads_completed = true;
                };
                /**
                 * Wrapper for uploader.uploadAll() which allows form to pass
                 * validation function to call first.
                 *
                 * @param validateFunc
                 */
                scope.validateAndUpload = function(validateFunc){
                    // pre_callback should be validation step for other various
                    // form elements, and return true if validation passes
                    if (validateFunc){
                        uploader.uploadAll();
                    }
                };

                scope.onDCMUpload = function(creatives){
                    scope.dcm_creatives = creatives;
                    scope.uploads_completed = true;
                };

                /**
                 * Method called to submit Advertiser to API
                 * @returns {boolean}
                 */
                scope.createCampaign = function() {
                    //if (this.campaignForm.$valid) {
                    scope.loading = true;
                    // Construct advertiser JSON to POST to API
                    var creatives = AdvertiserUtils.getCreativesFromUploadQueue(uploader);

                    // also get creatives from DCM Queue
                    if (scope.dcm_creatives){
                        creatives = creatives.concat(scope.dcm_creatives);
                    }

                    var creativegroups = AdvertiserUtils.groupCreatives(creatives, scope.campaign.name);
                    // now create new advertiser object
                    var campaign = this.campaign;

                    // convert target arrays to weightedSchema format
                    campaign = AdvertiserUtils.convertAllTargetArrays(campaign);

                    campaign.creativegroups = creativegroups;
                    var advertiser = scope.advertiser;
                    advertiser.campaigns.push(campaign);
                    advertiser.$update(function(){
                        scope.closeThisDialog('Success');
                    }, function (errorResponse){
                        scope.loading = false;
                        scope.creation_error = errorResponse.data.message;
                    });
                };

                scope.validateInput = function(name, type) {
                    var input = this.advertiserForm[name];
                    return (input.$dirty || scope.submitted) && input.$error[type];
                };
            }
        };
	}
]);