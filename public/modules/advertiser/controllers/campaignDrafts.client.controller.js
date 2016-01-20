/**
 * Created by bliang on 1/19/16.
 */
angular.module('advertiser').controller('CampaignDraftController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Advertiser','CampaignDraft','ngDialog',
    function($scope, $stateParams, $location, Authentication, Advertiser, CampaignDraft, ngDialog){
        $scope.findOne = function(){
            $scope.campaignDraft = CampaignDraft.get({draftId: $stateParams.draftId})
        };
        $scope.remove = function(draft){
            draft.$delete(function() {
                _.remove($scope.drafts, draft);
                ngDialog.open({ template: "This draft has been deleted.", plain: true });
            });
        };
        $scope.drafts = CampaignDraft.query();

    }
]);