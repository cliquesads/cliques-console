/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('KeywordTargetingController', [
	'$scope', 'campaign', 'ngDialog',
	function($scope, campaign, ngDialog) {

		$scope.Math = Math;
		$scope.dirty = false;

		// user typed in keywords data model
		$scope.targetedKeywords = [];
		$scope.previousTargetedKeywords = [];
		$scope.blockedKeywords = [];
		$scope.previousBlockedKeywords = [];

		$scope.numberOfTargets = $scope.targetedKeywords.length;
		$scope.numberOfBlocks = $scope.blockedKeywords.length;
		// targeted/blocked keyword schemas to save to database
		$scope.targetKeywordNodes = [];
		$scope.blockKeywordNodes = [];

		// Slider max value
		$scope.rzSliderCeil = Math.round($scope.campaign.max_bid / $scope.campaign.base_bid * 10) / 10;

		/**
		 * Get Campaigns from URL state params on load
		 */
		$scope.advertiser = campaign.advertiser;
		$scope.campaignIndex = campaign.index;
		$scope.campaign = campaign.campaign;


		var _initializeKeywordSchema = function(keywordText, weight) {
			var keywordWeight;
			if (weight === 0) {
				keywordWeight = 0;
			} else {
				keywordWeight = weight || 1.0;
			}
			return {
				target: keywordText,
				weight: keywordWeight
			};
		};

		$scope.$watch('targetedKeywords', function(newValue, oldValue) {
			console.log('========== targetedKeywords has changed');
			if ($scope.targetedKeywords.constructor === Array) {
				if ($scope.targetedKeywords.length === ($scope.numberOfTargets + 1)) {
					// targeted keywords added
					var addedTargetKeyword = $scope.targetedKeywords[$scope.numberOfTargets];
					console.log('increased++++++, new keyword: ' + addedTargetKeyword);
					$scope.targetKeywordNodes.push(_initializeKeywordSchema(addedTargetKeyword));
				} else if ($scope.targetedKeywords.length === ($scope.numberOfTargets - 1)) {
					// targeted keywords deleted
					var deletedTargetKeyword,
						targetSchemaIndexToDelete,
						i;
					for (i = 0; i < $scope.previousTargetedKeywords.length; i ++) {
						if ($scope.targetedKeywords.indexOf($scope.previousTargetedKeywords[i]) === -1) {
							deletedTargetKeyword = $scope.previousTargetedKeywords[i];
							break;
						}
					}
					console.log('decreased------, deleted keyword: ' + deletedTargetKeyword);
					for (i = 0; i < $scope.targetKeywordNodes.length; i ++) {
						if ($scope.targetKeywordNodes[i].target === deletedTargetKeyword) {
							targetSchemaIndexToDelete = i;
							break;
						}
					}
					$scope.targetKeywordNodes.splice(targetSchemaIndexToDelete, 1);
				}
				$scope.numberOfTargets = $scope.targetedKeywords.length;	
				$scope.previousTargetedKeywords = $scope.targetedKeywords;
			} else if (!$scope.targetedKeywords) {
				if ($scope.numberOfTargets === 1) {
					console.log('decreased------, deleted keyword: ' + $scope.previousTargetedKeywords[0]);
				}
				$scope.targetKeywordNodes = [];
				$scope.numberOfTargets = 0;
				$scope.previousTargetedKeywords = $scope.targetedKeywords;
			}
		});

		$scope.removeTargetedKeyword = function(keywordNode) {
			var keywordIndexToRemove;
			for (var i = 0; i < $scope.targetedKeywords.length; i ++) {
				if (keywordNode.target === $scope.targetedKeywords[i]) {
					keywordIndexToRemove = i;
					break;
				}
			}
			// In order to trigger $scope.$watch('targetedKeywords', ...)
			var temp = angular.copy($scope.targetedKeywords);
			temp.splice(keywordIndexToRemove, 1);
			$scope.targetedKeywords = temp;
		};

		$scope.getKeywordTargetingHelp = function() {
			ngDialog.open({
				className: 'ngdialog-theme-default',
				template: 'modules/advertiser/views/partials/keyword-target-help-text.html',
				controller: ['$scope', function($scope) {
					$scope.campaign = $scope.ngDialogData.campaign;	
				}],
				data: {
					campaign: $scope.campaign
				}
			});
		};
	}
]);