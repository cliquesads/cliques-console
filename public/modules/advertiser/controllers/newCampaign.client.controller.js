'use strict';
angular.module('advertiser').controller('NewCampaignController', ['$scope','$location','$analytics','advertiser','ngDialog',
    function($scope, $location, $analytics, advertiser, ngDialog){
        // first get advertiser
        $scope.advertiser = advertiser;
        $scope.initCampaigns = $scope.advertiser.campaigns;
        $scope.initDisplayCampaigns = $scope.initCampaigns ? $scope.initCampaigns.filter(function(camp){ return camp.type === 'display' || !camp.type; }) : null;
        $scope.initNativeCampaigns = $scope.initCampaigns ? $scope.initCampaigns.filter(function(camp){ return camp.type === 'native'; }) : null;
        $scope.campaign = null;

        $scope.rowTemplate = '<div class="col-sm-1"><div class="label" ng-class="option.active ? \'label-success\':\'label-default\'">{{ option.active ? "Active":"Inactive"}}</div></div>' +
            '<div class="col-sm-4"><h4 class="list-group-item-heading" data-ng-bind="option.name"></h4><p class="list-group-item-text">{{ option.clique }}</p></div>' +
            '<div class="col-sm-3"><h4 class="list-group-item-heading">{{ option.end_date | date:\'MM/dd/yyyy\' }}</h4><p class="list-group-item-text">Ends</p></div>' +
            '<div class="col-sm-4"><h4 class="list-group-item-heading">{{ option.budget | currency:"$":"0" }}</h4><p class="list-group-item-text">Budget</p></div>';

        $scope.stepControl = {
            useTemplate: false,
            // use named steps instead of numbered because of step conditionality:
            // 'init': select type of campaign
            // 'new-or-template': first step to choose New or Template
            // 'select-campaign': choose a campaign to use as a template
            // 'campaign-wizard': campaign wizard step with either pre-populated data or blank
            metaStep: 'init',
            goToStep : function(step) {
                this.metaStep = step;
            },
            goToSecondStep: function(){
                if (this.campaignType === 'native'){
                    if ($scope.initNativeCampaigns && $scope.initNativeCampaigns.length > 0){
                        this.metaStep = 'new-or-template';
                    } else {
                        this.metaStep = 'campaign-wizard';
                    }
                } else {
                    if ($scope.initDisplayCampaigns && $scope.initDisplayCampaigns.length > 0){
                        this.metaStep = 'new-or-template';
                    } else {
                        this.metaStep = 'campaign-wizard';
                    }
                }
            },
            goToThirdStep : function(){
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
            campaign: null,
            campaignType: 'display'
        };

        // Success handler
        $scope.updateAdvertiser = function(campaign){
            $scope.loading = true;
            var loadingDialog = ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth600',
                template: '\
                    <h4>Saving...</h4>\
                    <div class="row text-center">\
                        <div class="ball-pulse">\
                            <div></div>\
                            <div></div>\
                            <div></div>\
                        </div>\
                    </div>',
                plain: true
            });

            $scope.advertiser.campaigns.push(campaign);
            $scope.advertiser.$update(function(){
                loadingDialog.close(0);
                var advertiserId = $scope.advertiser._id;
                // Since directive just pushes campaign to campaigns array, assume the last campaign
                // is the new one
                var newCampaign = $scope.advertiser.campaigns[$scope.advertiser.campaigns.length - 1];
                var campaignId = newCampaign._id;
                // Go to new campaign page, passing in newModal param, which shows helper modal popup
                $location.url('/advertiser/' + advertiserId + '/campaign/' + campaignId + '?newModal=true');
            }, function (errorResponse){
                $analytics.eventTrack('NewCampaign_SaveError');
                loadingDialog.close(1);
                // remove campaign from advertiser campaigns if error
                _.remove($scope.advertiser.campaigns, campaign);
                ngDialog.open({
                    className: 'ngdialog-theme-default dialogwidth600',
                    template: '<br>\
                        <div class="alert alert-danger">\
                            <p class="text-md"><strong><i class="fa fa-lg fa-exclamation-circle"></i> The following error occurred:</strong></p>\
                            <pre>' + errorResponse.data.message + '</pre>\
                            <p> We\'re sorry about this.  Please contact us at <a href="mailto:support@cliquesads.com">\
                            support@cliquesads.com</a> and include a reference to the error above.</p>\
                        </div>',
                    plain: true
                });
            });
        };

        $scope.closeOnDraftSuccess = function(draft){
            // return $scope.closeThisDialog('Success');
        };
    }
]);
