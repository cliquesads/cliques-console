'use strict';
angular.module('advertiser').directive('campaignWizard', [
    '$compile',
    'Authentication',
    'Advertiser',
    'getCliqueTree',
    'getSitesInClique',
    'DMA',
    'FileUploader',
    'ClientSideCampaign',
    'BID_SETTINGS',
    'ADVERTISER_TOOLTIPS',
	function($compile, Authentication, Advertiser,
             getCliqueTree, getSitesInClique, DMA, FileUploader, ClientSideCampaign,
             BID_SETTINGS, ADVERTISER_TOOLTIPS) {
        return {
            restrict: 'E',
            scope: {
                advertiser: '=',
                existingCampaign: '=',
                onPrevious : '&'
            },
            templateUrl: 'modules/advertiser/views/partials/campaign-wizard.html',
            link: function (scope, element, attrs) {

                // Init new ClientSideCampaign, which handles all necessary duplication &
                // pre-save prep logic
                scope.campaign = new ClientSideCampaign(scope.existingCampaign);

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
                    // Set initial selection
                    if (scope.campaign.clique){
                        scope.my_tree.select_branch(scope.campaign.clique);
                    }
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
                    scope.loading = true;
                    scope.campaign.ingestCreativeUploader(uploader);
                    scope.campaign.ingestDCMCreatives(scope.dcm_creatives);
                    var campaign = scope.campaign.getCampaignToSave();

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