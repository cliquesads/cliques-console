angular.module('advertiser').directive('campaignStatusSwitch',
    function($q, Notify, CampaignActivator, Authentication, ngDialog) {
        'use strict';
        return {
            restrict: 'E',
            scope: {
                advertiser: '=',
                campaign: '='
            },
            templateUrl: 'modules/advertiser/views/partials/campaign-status-switch.html',
            link: function(scope, element, attrs){

                // Even though DT's are stored as naive in Mongo, they get converted to local
                // TZ when returned to client, but are still annotated as UTC, so have to remove
                // TZ offset to get intended UTC time.
                // this will be campaign start date, w/ default TZ offset removed, converted to
                // local time.
                var startDate = new Date(scope.campaign.start_date);
                var endDate = new Date(scope.campaign.end_date);
                scope.now = new Date();
                scope.campaignStartDate = new Date(startDate - startDate.getTimezoneOffset() * 1000 * 60);
                scope.campaignEndDate = new Date(endDate - endDate.getTimezoneOffset() * 1000 * 60);

                scope.authentication = Authentication;

                scope.active = scope.campaign.active || scope.campaign.pending;

                /**
                 * Handler for campaign active toggle that either activates, deactivates or sets campaign to pending.
                 *
                 * - If campaign is activated & start_date has passed, activates via CampaignActivator service
                 * - If campaign is deactivated & start_date has passed, deactivates via CampaignActivator service
                 * - If campaign is activated & start_date has NOT passed, sets campaign.pending to true and saves.
                 * - If campaign is deactivated & start_date has NOT passed, sets campaign.pending to false and saves.
                 */
                scope.toggleCampaignActive = function(){
                    // handle activate/deactivate scenarios first, i.e. start_date is in the past
                    if (scope.now >= scope.campaignStartDate){
                        // Deactivate campaign
                        if (!this.active){
                            var deActivatePromise;
                            if (Authentication.user.organization.effectiveOrgType !== 'networkAdmin'){
                                deActivatePromise = ngDialog.openConfirm({
                                    template: '\
								<br>\
								<p>Deactivating this campaign will cause it to stop serving immediately. \
								Are you sure you want to deactivate this campaign?</p>\
								<p class="text-center">\
									<button class="btn btn-lg btn-primary" ng-click="confirm()">OK</button>\
									<button class="btn btn-lg btn-default" ng-click="closeThisDialog()">Cancel</button>\
								</p>',
                                    plain: true
                                });
                            } else {
                                deActivatePromise = $q.when([]);
                            }
                            deActivatePromise.then(function(){
                                CampaignActivator.deactivate({
                                    advertiserId: scope.advertiser._id,
                                    campaignId: scope.campaign._id
                                }).then(function(response){
                                    scope.campaign.active = false;
                                    Notify.alert('Your campaign was successfully deactivated.',{});
                                }, function(errorResponse){
                                    scope.campaign.active = true;
                                    scope.active = true;
                                    Notify.alert('Error deactivating campaign: ' + errorResponse.message,{status: 'danger'});
                                });
                            });
                        // Activate campaign
                        } else {
                            // short circuit if trying to activate a past campaign
                            if (scope.now >= scope.campaignEndDate){
                                scope.active = false;
                                return Notify.alert('This campaign has already ended. To re-activate, extend the campaign end date to a future date and try again. ', {status: 'warning'});
                            }

                            var activatePromise;
                            if (Authentication.user.organization.effectiveOrgType !== 'networkAdmin') {
                                activatePromise = ngDialog.openConfirm({
                                    template: '\
                                    <br>\
                                    <p>Once this campaign is active, it will begin serving impressions immediately. Are you sure you want to activate?</p>\
                                    <p class="text-center">\
                                        <button class="btn btn-lg btn-primary" ng-click="confirm()">OK</button>\
                                        <button class="btn btn-lg btn-default" ng-click="closeThisDialog()">Cancel</button>\
                                    </p>',
                                    plain: true
                                });
                            } else {
                                activatePromise = $q.when([]);
                            }
                            activatePromise.then(function() {
                                CampaignActivator.activate({
                                    advertiserId: scope.advertiser._id,
                                    campaignId: scope.campaign._id
                                }).then(function (response) {
                                    scope.campaign.active = true;
                                    Notify.alert('Your campaign was successfully activated. Let\'s do this thing.', {});
                                }, function (errorResponse) {
                                    scope.active = false;
                                    Notify.alert('Error activating campaign: ' + errorResponse.message, {status: 'danger'});
                                });
                            });
                        }
                    } else {
                        // this section doesn't touch the campaign.active flag, only scope.active
                        if (this.active) {
                            // set campaign pending to true and queue campaign for launch
                            var queuePromise;
                            if (Authentication.user.organization.effectiveOrgType !== 'networkAdmin') {
                                queuePromise = ngDialog.openConfirm({
                                    template: '\
                                        <br>\
                                        <p>This campaign has a future start date. Once activated, this campaign will begin \
                                        serving impressions at {{ ngDialogData.startDate.toUTCString() }}. \
                                        Are you sure you want to activate this campaign?</p>\
                                        <p class="text-center">\
                                            <button class="btn btn-lg btn-primary" ng-click="confirm()">OK</button>\
                                            <button class="btn btn-lg btn-default" ng-click="closeThisDialog()">Cancel</button>\
                                        </p>',
                                    plain: true,
                                    data: {
                                        startDate: scope.campaignStartDate,
                                    }
                                });
                            } else {
                                queuePromise = $q.when([]);
                            }
                            queuePromise.then(function () {
                                scope.campaign.pending = true;
                                scope.advertiser.$update(function () {
                                    Notify.alert('Your campaign is scheduled to be activated on ' + scope.campaignStartDate.toUTCString(), {});
                                }, function (errorResponse) {
                                    Notify.alert('Error scheduling campaign: ' + errorResponse.message, {status: 'danger'});
                                });
                            });
                        } else {
                            var removeFromQueuePromise;
                            // set campaign pending to true and queue campaign for launch
                            if (Authentication.user.organization.effectiveOrgType !== 'networkAdmin') {
                                removeFromQueuePromise = ngDialog.openConfirm({
                                    template: '\
                                        <br>\
                                        <p>This campaign has a future start date. Deactivating this campaign means it will no longer begin\
                                         serving impressions on {{ ngDialogData.startDate.toUTCString() }}.\
                                        Are you sure you want to deactivate this campaign?</p>\
                                        <p class="text-center">\
                                            <button class="btn btn-lg btn-primary" ng-click="confirm()">OK</button>\
                                            <button class="btn btn-lg btn-default" ng-click="closeThisDialog()">Cancel</button>\
                                        </p>',
                                    plain: true,
                                    data: {
                                        startDate: scope.campaignStartDate,
                                    }
                                });
                            } else {
                                removeFromQueuePromise = $q.when([]);
                            }
                            removeFromQueuePromise.then(function () {
                                scope.campaign.pending = false;
                                scope.advertiser.$update(function () {
                                    Notify.alert('Your campaign is has been removed from the scheduling queue.', {});
                                }, function (errorResponse) {
                                    Notify.alert('Error scheduling campaign: ' + errorResponse.message, {status: 'danger'});
                                });
                            });
                        }
                    }
                };
            }
        };
});