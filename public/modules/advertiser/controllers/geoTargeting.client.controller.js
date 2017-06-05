/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('GeoTargetingController', [
	'$scope', '$stateParams', 'Notify', 'campaign',
	function($scope, $stateParams, Notify, campaign) {

		/**
		 * Get Campaign from URL state params on load
		 */
		$scope.advertiser = campaign.advertiser;
		$scope.campaignIndex = campaign.index;
		$scope.campaign = campaign.campaign;

	}
]);