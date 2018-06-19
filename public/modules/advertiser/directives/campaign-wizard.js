/* global deploymentMode, pricing */
'use strict';
angular.module('advertiser').directive('campaignWizard', [
    '$compile',
    '$analytics',
    'Authentication',
    'Advertiser',
    'getCliqueTree',
    'getSitesInClique',
    'DMA',
    'FileUploader',
    'ClientSideCampaign',
    'CampaignDraft',
    'BID_SETTINGS',
    'ADVERTISER_TOOLTIPS',
    'THIRD_PARTY_CLIQUE_ID',
    'FIRST_PARTY_CLIQUE_ID',
    'ROOT_CLIQUE_ID',
    'CLIQUE_ICON_CLASSES',
    'ngDialog',
	function($compile, $analytics, Authentication, Advertiser,
             getCliqueTree, getSitesInClique, DMA, FileUploader, ClientSideCampaign,CampaignDraft,
             BID_SETTINGS, ADVERTISER_TOOLTIPS, THIRD_PARTY_CLIQUE_ID, FIRST_PARTY_CLIQUE_ID, ROOT_CLIQUE_ID,
             CLIQUE_ICON_CLASSES, ngDialog) {
        return {
            restrict: 'E',
            scope: {
                advertiser: '=',
                existingCampaign: '=',
                useSuffix: '@',
                onPrevious : '&',
                onSubmit: '&',
                onDraftSaveSuccess: '&',
                onDraftSaveError: '&',
                campaignType: '@'
            },
            templateUrl: 'modules/advertiser/views/partials/campaign-wizard.html',
            link: function (scope, element, attrs) {
                scope.pricing = pricing;
                //##################################//
                //###### INIT SCOPE VARIABLES ######//
                //##################################//
                scope.authentication = Authentication;
                scope.TOOLTIPS = ADVERTISER_TOOLTIPS;
                // TODO: resolve deploymentMode differences
                scope.deploymentMode = deploymentMode;

                $analytics.eventTrack('CampaignSetup_CampaignStep1');

                // Init new ClientSideCampaign, which handles all necessary duplication &
                // pre-save prep logic
                scope.campaign = new ClientSideCampaign(scope.existingCampaign, { useSuffix: scope.useSuffix });
                scope.campaign.type = scope.campaignType;

                // TODO: resolve deploymentMode differences
                if (deploymentMode === 'adNetwork') {
                    // Set Campaign Clique internally, will not be exposed on the front-end as front-end users
                    // won't be uploading first-party campaigns. This will be done programmatically.
                    scope.campaign.clique = ROOT_CLIQUE_ID;
                } else {
                    scope.campaign.clique = FIRST_PARTY_CLIQUE_ID;
                }

                // Set mins & maxes
                scope.min_base_bid = BID_SETTINGS.min_base_bid;
                scope.max_base_bid = BID_SETTINGS.max_base_bid;

                //#################################//
                //######### FILE UPLOADER #########//
                //#################################//

                var displayUploader = scope.displayUploader = new FileUploader({
                    url: 'console/creativeassets'
                });
                scope.displayUploader.onCompleteAll = function(){
                    scope.uploads_completed = true;
                };

                //########################################//
                //######### NATIVE FILE UPLOADER #########//
                //########################################//

                var nativeUploader = scope.nativeUploader = new FileUploader({
                    url: 'console/native-images'
                });

                scope.nativeUploader.onCompleteAll = function(){
                    scope.uploads_completed = true;
                };

                /**
                 * Wrapper for uploader.uploadAll() which allows form to pass
                 * validation function to call first.
                 *
                 * @param validateFunc
                 * @param funcArg
                 */
                scope.displayValidateAndUpload = function(validateFunc){
                    // pre_callback should be validation step for other various
                    // form elements, and return true if validation passes
                    if (validateFunc){
                        displayUploader.uploadAll();
                    }
                };

                /**
                 * Wrapper for uploader.uploadAll() which allows form to pass
                 * validation function to call first.
                 *
                 * @param validateFunc
                 * @param funcArg
                 */
                scope.nativeValidateAndUpload = function(validateFunc){
                    // pre_callback should be validation step for other various
                    // form elements, and return true if validation passes
                    if (validateFunc){
                        nativeUploader.uploadAll();
                    }
                };

                scope.onDCMUpload = function(creatives){
                    scope.dcm_creatives = creatives;
                    scope.uploads_completed = true;
                };

                // Loads creatives from all sources into campaign.creatives
                scope.ingestCreatives = function(callback, callbackArg){
                    scope.campaign.ingestCreativeUploader(displayUploader);
                    // now clear uploader queue
                    displayUploader.clearQueue();
                    // ingest native creatives
                    scope.campaign.ingestNativeCreativeUploader(nativeUploader, scope.advertiser);
                    // now clear uploader queue
                    nativeUploader.clearQueue();
                    // ingest DoubleClick creatives and reset scope var
                    scope.campaign.ingestDCMCreatives(scope.dcm_creatives);
                    scope.dcm_creatives = null;
                    if (callback && callbackArg){
                        return callback(callbackArg);
                    }
                };

                /**
                 * Saves draft campaign to user session
                 */
                scope.saveDraft = function(){
                    scope.ingestCreatives();
                    var campaign = scope.campaign.getCampaignToSave();
                    campaign.advertiserId = scope.advertiser._id;
                    var draft = new CampaignDraft(campaign);
                    draft.$create(function(draft){
                        ngDialog.open({
                            template: 'modules/advertiser/views/partials/campaign-draft-dialog.html',
                            controller: ['$scope', '$location', function ($scope, $location) {
                                $scope.viewDrafts = function(){
                                    $location.url('/advertiser/campaign-draft');
                                    $scope.closeThisDialog('Success');
                                };
                            }],
                            data: { draft: draft }
                        });
                        scope.onDraftSaveSuccess({draft: draft});
                    }, function(response){
                        scope.onDraftSaveError({response: response});
                    });
                };

                /**
                 * Method called when Submit button is clicked
                 *
                 * Calls scope.onSubmit to execute directive callback, and passes
                 * it a campaign that's ready to save
                 */
                scope.submit = function() {
                    scope.loading = true;
                    // clean up campaign object
                    var campaign = scope.campaign.getCampaignToSave();
                    scope.onSubmit({campaign: campaign});
                };
            }
        };
	}
]);