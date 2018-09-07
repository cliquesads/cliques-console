
angular.module('advertiser').directive('campaignStatusLabel',
    function($q, Notify, CampaignActivator, Authentication, ngDialog) {
        'use strict';
        return {
            restrict: 'E',
            scope: {
                campaign: '='
            },
            templateUrl: 'modules/advertiser/views/partials/campaign-status-label.html',
            link: function(scope, element, attrs){
                // Even though DT's are stored as naive in Mongo, they get converted to local
                // TZ when returned to client, but are still annotated as UTC, so have to remove
                // TZ offset to get intended UTC time.
                // this will be campaign start date, w/ default TZ offset removed, converted to
                // local time.
                var d = new Date(scope.campaign);
                scope.now = new Date();
                scope.campaignStartDate = new Date(d - d.getTimezoneOffset() * 1000 * 60);
            }
        };
});