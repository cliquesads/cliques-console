'use strict';
angular.module('advertiser').controller('NewCampaignController', ['$scope','$location', '$rootScope', 'Advertiser', '$stateParams',
    function($scope, $location, $rootScope, Advertiser, $stateParams){
        if ($stateParams.advertiser) {
            $scope.advertiser = $stateParams.advertiser;
            $scope.initCampaigns = $scope.advertiser.campaigns;
        } else if ($rootScope.advertiser) {
            $scope.advertiser = $rootScope.advertiser;
            $scope.initCampaigns = $scope.advertiser.campaigns;
        } else {
            Advertiser.query(function(advertisers) {
                if (advertisers.length === 1) {
                    $rootScope.advertiser = advertisers[0];
                    $scope.advertiser = advertisers[0];
                    $scope.initCampaigns = $scope.advertiser.campaigns;
                } else {
                    // either user has NOT selected an advertiser yet, or user doesn't have an advertiser, either way, redirect to list advertiser page
                    $location.path('/advertiser');
                }
            });
        }
        $scope.campaign = null;

        $scope.rowTemplate = '<div class="col-sm-1"><div class="label" ng-class="option.active ? \'label-success\':\'label-default\'">{{ option.active ? "Active":"Inactive"}}</div></div>' +
            '<div class="col-sm-4"><h4 class="list-group-item-heading" data-ng-bind="option.name"></h4><p class="list-group-item-text">{{ option.clique }}</p></div>' +
            '<div class="col-sm-3"><h4 class="list-group-item-heading">{{ option.end_date | date:\'MM/dd/yyyy\' }}</h4><p class="list-group-item-text">Ends</p></div>' +
            '<div class="col-sm-4"><h4 class="list-group-item-heading">{{ option.budget | currency:"$":"0" }}</h4><p class="list-group-item-text">Budget</p></div>';

        $scope.stepControl = {
            useTemplate: false,
            // use named steps instead of numbered because of step conditionality:
            // 'init': first step to choose New or Template
            // 'select-campaign': choose a campaign to use as a template
            // 'campaign-wizard': campaign wizard step with either pre-populated data or blank
            metaStep: 'init',
            goToStep : function(step) {
                this.metaStep = step;
            },
            goToSecondStep : function(){
                if (this.useTemplate){
                    this.metaStep = 'select-campaign';
                } else {
                    this.metaStep = 'campaign-wizard';
                }
            },
            goToStepPriorToWizard : function(){
                if (this.useTemplate){
                    this.metaStep = 'select-campaign';
                } else {
                    this.metaStep = 'init';
                }
            },
            campaign: null
        };

        // Success handler
        $scope.updateAdvertiser = function(campaign){
            $scope.loading = true;
            $scope.advertiser.campaigns.push(campaign);
            $scope.advertiser.$update(function(){
                $scope.loading = false;
                $scope.closeThisDialog('Success');
                var advertiserId = $scope.advertiser._id;
                // Since directive just pushes campaign to campaigns array, assume the last campaign
                // is the new one
                var newCampaign = $scope.advertiser.campaigns[$scope.advertiser.campaigns.length - 1];
                var campaignId = newCampaign._id;
                // Go to new campaign page, passing in newModal param, which shows helper modal popup
                $location.url('/advertiser/' + advertiserId + '/campaign/' + campaignId + '?newModal=true');
            }, function (errorResponse){
                $scope.loading = false;
                $scope.creation_error = errorResponse.data.message;
                // remove campaign from advertiser campaigns if error
                _.remove($scope.advertiser.campaigns, campaign);
            });
        };

        $scope.closeOnDraftSuccess = function(draft){
            return $scope.closeThisDialog('Success');
        };
    }
]);
