/**
 * Created by bliang on 1/19/16.
 */

angular.module('core').controller('NewModalController',['$scope','REVIEW_TIME',function($scope,REVIEW_TIME){
    /**
     * Overlap campaign helper modal if state includes necessary query params
     */
    ngDialog.open({
        template: 'modules/advertiser/views/partials/new-campaign-helper-modal.html',
        data: { review_time: REVIEW_TIME }
    });
}]);
