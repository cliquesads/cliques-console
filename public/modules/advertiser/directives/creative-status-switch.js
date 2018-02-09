
angular.module('advertiser').directive('creativeStatusSwitch', ['Notify','CreativeActivator',
    function(Notify, CreativeActivator) {
        'use strict';
        return {
            restrict: 'E',
            scope: {
                advertiser: '=',
                campaign: '=',
                creativegroup: '=',
                creative: '=',
                onActivate: '&',
                onDeactivate: '&'
            },
            templateUrl: 'modules/advertiser/views/partials/creative-status-switch.html',
            link: function(scope, element, attrs){
                scope.toggleCreativeActive = function(){
                    if (!this.creative.active){
                        CreativeActivator.deactivate({
                            advertiserId: scope.advertiser._id,
                            campaignId: scope.campaign._id,
                            creativeGroupId: scope.creativegroup._id,
                            creativeId: scope.creative._id
                        }).then(function(response){
                            Notify.alert('Your creative was successfully deactivated.',{});
                            scope.creative.active = false;
                            scope.onDeactivate({ error: null, creative: scope.creative });
                        }, function(errorResponse){
                            Notify.alert('Error deactivating creative: ' + errorResponse.message,{status: 'danger'});
                            scope.onDeactivate({ error: errorResponse });
                        });
                    } else {
                        CreativeActivator.activate({
                            advertiserId: scope.advertiser._id,
                            campaignId: scope.campaign._id,
                            creativeGroupId: scope.creativegroup._id,
                            creativeId: scope.creative._id
                        }).then(function(response){
                            Notify.alert('Your creative was successfully activated.',{});
                            scope.creative.active = true;
                            scope.onActivate({ error: null, creative: scope.creative });
                        }, function(errorResponse){
                            Notify.alert('Error activating creative: ' + errorResponse.message,{status: 'danger'});
                            scope.onActivate({ error: errorResponse });
                        });
                    }
                };
            }
        };
}]);