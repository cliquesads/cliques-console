'use strict';

angular.module('advertiser').controller('AdvertiserWizardController', ['$scope',
    '$stateParams',
    '$location',
    '$q',
    '$analytics',
    'Authentication',
    'Advertiser',
    'FileUploader',
    'REGEXES',
    'ADVERTISER_TOOLTIPS',
    'LOGO','ngDialog',
	function($scope, $stateParams, $location, $q, $analytics, Authentication, Advertiser, FileUploader, REGEXES, ADVERTISER_TOOLTIPS, LOGO, ngDialog) {

        //##################################//
        //###### INIT SCOPE VARIABLES ######//
        //##################################//

        $scope.authentication = Authentication;
        $scope.TOOLTIPS = ADVERTISER_TOOLTIPS;

        // something weird about storing regexes as scope vars, they don't bind
        // to the template properly to have to convert to string
        // this will throw a parser console error
        $scope.domain_regex = REGEXES.domainPattern;

        // Start event tracking
        $analytics.eventTrack('CampaignSetup_AdvertiserWizardStart');

        //#################################//
        //######### FILE UPLOADER #########//
        //#################################//
        $scope.logo_uploader = new FileUploader({
            url: 'console/logos'
        });

        $scope.advertiser = null;

        // Basic models
        $scope.advertiser = new Advertiser({
            name: null,
            description: null,
            website: null,
            logo_url: LOGO.default_secure_url,
            campaigns: []
        });

        $scope.advertiser.copyOrgValues = function(org){
            this.name = org.name;
            this.website = org.website;
        };

        $scope.advertiser.clearCopiedValues = function(){
            this.name = null;
            this.website = null;
        };

        $scope.stepControl = {
            useOrganization: false,
            // use named steps instead of numbered because of step conditionality:
            // 'init': first step to choose New or Template
            // 'advertiser-info': input advertiser info
            // 'campaign-type': choose campaign type
            // 'campaign-wizard': campaign wizard step with either pre-populated data or blank
            metaStep: 'init',
            goToStep : function(step) {
                this.metaStep = step;
            },
            goToSecondStep : function(){
                this.metaStep = 'advertiser-info';
                if (this.useOrganization){
                    $scope.advertiser.copyOrgValues($scope.authentication.user.organization);
                } else {
                    $scope.advertiser.clearCopiedValues();
                }
            },
            goToStepPriorToWizard : function(){
                this.metaStep = 'type';
            },
            campaignType: 'display'
        };

        $scope.validateInput = function(name, type) {
            var input = this.advertiserForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };

        /**
         * Method called to submit Advertiser to API
         * @returns {boolean}
         */
        $scope.saveAdvertiser = function() {
            $scope.submitted = true;
            if (this.advertiserForm.$valid){
                $scope.loading = true;
                // if it's been created already, update
                if ($scope.advertiser._id){
                    $scope.advertiser.$update(function(response){
                        $scope.loading = false;
                        $scope.stepControl.goToStep('campaign-splash');
                    }, function (errorResponse) {
                        $scope.loading = false;
                        $scope.creation_error = errorResponse.data.message;
                    });
                } else {
                    // create
                    $scope.advertiser.$create(function(response){
                        $scope.loading = false;
                        $scope.stepControl.goToStep('campaign-splash');
                    }, function (errorResponse) {
                        $scope.loading = false;
                        $scope.creation_error = errorResponse.data.message;
                    });
                }
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
	}
]);