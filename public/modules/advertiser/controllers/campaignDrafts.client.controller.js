/**
 * Created by bliang on 1/19/16.
 */
angular.module('advertiser').controller('CampaignDraftController', ['$scope', '$stateParams', '$location',
    'Authentication', 'Advertiser','CampaignDraft','ngDialog',
    function($scope, $stateParams, $location, Authentication, Advertiser, CampaignDraft, ngDialog){
        //$scope.findOne = function(){
        //    CampaignDraft.get({draftId: $stateParams.draftId}, function(campaignDraft){
        //        $scope.campaignDraft = campaignDraft;
        //        $scope.advertiser = Advertiser.get({ advertiserId: campaignDraft.advertiserId });
        //    });
        //};
        $scope.remove = function(draft){
            draft.$delete(function() {
                _.remove($scope.drafts, draft);
                ngDialog.open({ template: "This draft has been deleted.", plain: true });
            });
        };
        $scope.drafts = CampaignDraft.query();

        $scope.edit = function(draft){
            $location.url('/advertiser/campaign-draft/edit/' + draft.draftId);
            $scope.campaignDraft = draft;
            $scope.advertiser = Advertiser.get({ advertiserId: draft.advertiserId });
        };

        $scope.createCampaign = function(campaign){
            $scope.loading = true;
            $scope.advertiser.campaigns.push(campaign);
            $scope.advertiser.$update(function(){
                $scope.remove($scope.campaignDraft);
                $scope.loading = false;
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

    }
]);