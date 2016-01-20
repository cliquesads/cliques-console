'use strict';

angular.module('advertiser').controller('AdvertiserWizardController', ['$scope',
    '$stateParams',
    '$location',
    '$q',
    'Authentication',
    'Advertiser',
    'FileUploader',
    'REGEXES',
    'ADVERTISER_TOOLTIPS',
    'LOGO','ngDialog',
	function($scope, $stateParams, $location, $q, Authentication, Advertiser, FileUploader, REGEXES, ADVERTISER_TOOLTIPS, LOGO, ngDialog) {

        //##################################//
        //###### INIT SCOPE VARIABLES ######//
        //##################################//

        $scope.authentication = Authentication;
        $scope.TOOLTIPS = ADVERTISER_TOOLTIPS;

        // something weird about storing regexes as scope vars, they don't bind
        // to the template properly to have to convert to string
        // this will throw a parser console error
        $scope.domain_regex = REGEXES.domainPattern;

        //#################################//
        //######### FILE UPLOADER #########//
        //#################################//
        $scope.logo_uploader = new FileUploader({
            url: 'logos'
        });

        $scope.advertiser = null;

        // Basic models
        $scope.advertiserVals = {
            name: null,
            description: null,
            website: null,
            logo_url: LOGO.default_secure_url,
            campaigns: [],
            copyOrgValues: function(org){
                this.name = org.name;
                this.website = org.website;
            },
            clearCopiedValues: function(){
                this.name = null;
                this.website = null;
            }
        };

        $scope.stepControl = {
            useOrganization: false,
            // use named steps instead of numbered because of step conditionality:
            // 'init': first step to choose New or Template
            // 'advertiser-info': input advertiser info
            // 'campaign-wizard': campaign wizard step with either pre-populated data or blank
            metaStep: 'init',
            goToStep : function(step) {
                this.metaStep = step;
            },
            goToSecondStep : function(){
                this.metaStep = 'advertiser-info';
                if (this.useOrganization){
                    $scope.advertiserVals.copyOrgValues($scope.authentication.user.organization);
                } else {
                    $scope.advertiserVals.clearCopiedValues();
                }
            },
            goToStepPriorToWizard : function(){
                this.metaStep = 'advertiser-info'
            }
        };

        $scope.validateInput = function(name, type) {
            var input = this.advertiserForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };

        /**
         * Method called to submit Advertiser to API
         * @returns {boolean}
         */
        $scope.createAdvertiser = function() {
            if (this.advertiserForm.$valid){
                $scope.loading = true;
                $scope.advertiser = new Advertiser({
                    name:           this.advertiserVals.name,
                    description:    this.advertiserVals.description,
                    website:        this.advertiserVals.website,
                    logo_url:       this.advertiserVals.logo_url,
                    campaigns: []
                });
                $scope.advertiser.$create(function(response){
                    $scope.loading = false;
                    $scope.stepControl.goToStep('campaign-wizard');
                }, function (errorResponse) {
                    $scope.loading = false;
                    $scope.creation_error = errorResponse.data.message;
                });
            } else {
                return false;
            }
        };

        /**
         * Method called to update Advertiser with new Campaign
         * @returns {boolean}
         */
        $scope.createCampaign = function(campaign) {
            $scope.advertiser.campaigns.push(campaign);
            $scope.advertiser.$update(function(response){
                $scope.loading = false;
                //On success, redirect to advertiser detail page
                var advertiserId = response._id;
                $location.url('/advertiser/' + advertiserId + '?newModal=true');
            }, function (errorResponse) {
                $scope.loading = false;
                $scope.creation_error = errorResponse.data.message;
            });
        };

        $scope.onDraftSaveSuccess = function(draft){
            ngDialog.open({
                template: 'modules/advertiser/views/partials/campaign-draft-dialog.html',
                controller: ['$scope', '$location', function ($scope, $location) {
                    $scope.viewDrafts = function(){
                        $location.url('/advertiser/campaign-drafts');
                        $scope.closeThisDialog('Success');
                    }
                }],
                data: { draft: draft }
            })
        }
	}
]);