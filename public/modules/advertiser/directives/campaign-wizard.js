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
    'ngDialog',
	function($compile, $analytics, Authentication, Advertiser,
             getCliqueTree, getSitesInClique, DMA, FileUploader, ClientSideCampaign,CampaignDraft,
             BID_SETTINGS, ADVERTISER_TOOLTIPS, ngDialog) {
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

                //##################################//
                //###### INIT SCOPE VARIABLES ######//
                //##################################//
                scope.authentication = Authentication;
                scope.TOOLTIPS = ADVERTISER_TOOLTIPS;

                $analytics.eventTrack('CampaignSetup_CampaignStep1');

                // Init new ClientSideCampaign, which handles all necessary duplication &
                // pre-save prep logic
                scope.campaign = new ClientSideCampaign(scope.existingCampaign, { useSuffix: scope.useSuffix });
                scope.campaign.type = scope.campaignType;

                // Populate tree data for tree visualization
                scope.cliques = [];

                // Get whole tree of active Cliques on load to render in ABN tree
                getCliqueTree({active: true},function(err, cliques){
                    scope.cliques = cliques;
                });

                // This gets bound to 'on-select' of abn-tree directive
                // Sets Clique and gets sites in Clique for visualization purposes
                scope.set_clique = function(branch) {
                    scope.campaign.clique = branch.label;
                };

                var tree;
                // This is our API control variable
                scope.my_tree = tree = {};

                /**
                 * Stupid helper because stupid ABN Tree directive doesn't
                 * come with this stupid method as it should
                 */
                scope.my_tree.get_branch_by_label = function(label){
                    function inner(branch){
                        var selection;
                        if (branch.label === label) {
                            selection = branch;
                        } else if (branch.children.length > 0){
                            branch.children.forEach(function(child){
                                var k = inner(child);
                                if (k){
                                    selection = k;
                                }
                            });
                        }
                        return selection;
                    }
                    return inner(this.get_first_branch());
                };

                scope.dmas = DMA.query();

                // Set mins & maxes
                scope.min_base_bid = BID_SETTINGS.min_base_bid;
                scope.max_base_bid = BID_SETTINGS.max_base_bid;

                // Horrible hack to lazy load sub-directives
                // Weird shit happens they pre-load (they don't get the right scope vars & such),
                // so I've resorted to lazily-compiling their templates & injecting compiled HTML
                // into elements using jQuery.
                // I tried to use the DIRECTIVE I JUST WROTE 'compile' as well, but could
                // never get it to compile so I just gave up
                function injectDirective(elementId, template){
                    if ($(elementId).is(':empty')){
                        $(elementId).append($compile(template)(scope));
                    }
                }

                // LAZY LOADERS
                scope.loadCliqueStep = function(callback, callbackArg){
                    var treeDirective = '<abn-tree tree-data="cliques" tree-control="my_tree" on-select="set_clique(branch)" icon-leaf="fa fa-square" expand-level="2"></abn-tree>';
                    injectDirective('#cliquesTree', treeDirective);
                    // Set initial selection dynamically, can't use initial-selection param
                    var branch;
                    if (scope.campaign.clique){
                        branch = scope.my_tree.get_branch_by_label(scope.campaign.clique);
                    } else {
                        branch = scope.my_tree.get_first_branch();
                    }
                    scope.my_tree.select_branch(branch);

                    return callback(callbackArg);
                };

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