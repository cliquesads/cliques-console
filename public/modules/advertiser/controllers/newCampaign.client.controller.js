/**
 * Created by bliang on 1/15/16.
 */
angular.module('advertiser').controller('NewCampaignController', ['$scope',
    function($scope){
        // first get advertiser from ngDialogData
        $scope.advertiser = $scope.ngDialogData.advertiser;
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

    }
]);
