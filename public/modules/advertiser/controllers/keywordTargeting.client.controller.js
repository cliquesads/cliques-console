/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('KeywordTargetingController', [
	'$scope', 'campaign',
	function($scope, campaign) {

		$scope.dirty = false;
		$scope.targetedKeywords = [];
		$scope.blockedKeywords = [];

		/**
		 * Get Campaigns from URL state params on load
		 */
		$scope.advertiser = campaign.advertiser;
		$scope.campaignIndex = campaign.index;
		$scope.campaign = campaign.campaign;
	}
]);