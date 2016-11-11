'use strict';
angular.module('core').controller('NewModalController',['$scope','REVIEW_TIME','ngDialog',function($scope,REVIEW_TIME,ngDialog){
    /**
     * Overlap campaign helper modal if state includes necessary query params
     */
    ngDialog.open({
        template: 'modules/advertiser/views/partials/new-campaign-helper-modal.html',
        data: { review_time: REVIEW_TIME }
    });
}]);
