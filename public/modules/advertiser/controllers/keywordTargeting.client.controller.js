/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('KeywordTargetingController', [
	'$scope', 'campaign', 'ngDialog', 'Notify',
	function($scope, campaign, ngDialog, Notify) {

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

		var _initializeKeywordNode = function(node) {
			var newNode = {
				target: node.target
			};
			if (node.weight === 0) {
				newNode.weight = 0;
			} else {
				newNode.weight = node.weight || 1.0;
			}
			if (node._id) {
				newNode._id = node._id;
			}
			return newNode;
		};

		$scope.save = function() {
			$scope.campaign.keyword_targets = $scope.targetKeywordNodes;
			$scope.campaign.blocked_keywords = $scope.blockKeywordNodes;
			$scope.advertiser.$update(function() {
				$scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
				$scope.dirty = false;
				Notify.alert('Thanks! Your settings have been saved.');
			}, function(errorResponse) {
				$scope.dirty = false;
				Notify.alert('Error saving settings: ' + errorResponse.message, {
					status: 'danger'
				});
			});
		};

		/**
		 * Initialize existing keyword nodes from database
		 */
		$scope.reset = function() {
			$scope.targetKeywordNodes = [];
			$scope.blockKeywordNodes = [];
			$scope.campaign.keyword_targets.forEach(function(keywordNode) {
				$scope.targetKeywordNodes.push(_initializeKeywordNode(keywordNode));
			});
			$scope.campaign.blocked_keywords.forEach(function(keywordNode) {
				$scope.blockKeywordNodes.push(_initializeKeywordNode(keywordNode));
			});
		};
		$scope.reset();

		$scope.$watch('targetedKeywords', function(newValue, oldValue) {
			console.log('========== targetedKeywords has changed');
			if ($scope.targetedKeywords.constructor === Array) {
				if ($scope.targetedKeywords.length === ($scope.numberOfTargets + 1)) {
					// targeted keywords added
					var addedTargetKeyword = $scope.targetedKeywords[$scope.numberOfTargets];
					console.log('increased++++++, new keyword: ' + addedTargetKeyword);
					$scope.targetKeywordNodes.push(_initializeKeywordNode({
						target: addedTargetKeyword
					}));
					$scope.dirty = true;
				} else if ($scope.targetedKeywords.length === ($scope.numberOfTargets - 1)) {
					// targeted keywords deleted
					var deletedTargetKeyword,
						targetNodeIndexToDelete,
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
							targetNodeIndexToDelete = i;
							break;
						}
					}
					$scope.targetKeywordNodes.splice(targetNodeIndexToDelete, 1);
					$scope.dirty = true;
				}
				$scope.numberOfTargets = $scope.targetedKeywords.length;	
				$scope.previousTargetedKeywords = $scope.targetedKeywords;
			} else if (!$scope.targetedKeywords) {
				if ($scope.numberOfTargets === 1) {
					console.log('decreased------, deleted keyword: ' + $scope.previousTargetedKeywords[0]);
					$scope.dirty = true;
				}
				$scope.targetKeywordNodes = [];
				$scope.numberOfTargets = 0;
				$scope.previousTargetedKeywords = $scope.targetedKeywords;
			}
		});

		$scope.$watch('blockedKeywords', function(newValue, oldValue) {
			console.log('========== blockedKeywords has changed');
			if ($scope.blockedKeywords.constructor === Array) {
				if ($scope.blockedKeywords.length === ($scope.numberOfTargets + 1)) {
					// blocked keywords added
					var addedBlockKeyword = $scope.blockedKeywords[$scope.numberOfBlocks];
					console.log('increased++++++, new keyword: ' + addedBlockKeyword);
					$scope.blockKeywordNodes.push(_initializeKeywordNode({
						target: addedBlockKeyword
					}));
					$scope.dirty = true;
				} else if ($scope.blockedKeywords.length === ($scope.numberOfBlocks - 1)) {
					// blocked keywords deleted
					var deletedBlockKeyword,
						blockNodeIndexToDelete,
						i;
					for (i = 0; i < $scope.previousBlockedKeywords.length; i ++) {
						if ($scope.blockedKeywords.indexOf($scope.previousBlockedKeywords[i]) === -1) {
							deletedBlockKeyword = $scope.previousBlockedKeywords[i];
							break;
						}
					}
					console.log('decreased------, deleted keyword: ' + deletedBlockKeyword);
					for (i = 0; i < $scope.blockKeywordNodes.length; i ++) {
						if ($scope.blockKeywordNodes[i].target === deletedBlockKeyword) {
							blockNodeIndexToDelete = i;
							break;
						}
					}
					$scope.blockKeywordNodes.splice(blockNodeIndexToDelete, 1);
					$scope.dirty = true;
				}
				$scope.numberOfBlocks = $scope.blockedKeywords.length;	
				$scope.previousBlockedKeywords = $scope.blockedKeywords;
			} else if (!$scope.blockedKeywords) {
				if ($scope.numberOfBlocks === 1) {
					console.log('decreased------, deleted keyword: ' + $scope.previousBlockedKeywords[0]);
					$scope.dirty = true;
				}
				$scope.blockKeywordNodes = [];
				$scope.numberOfBlocks = 0;
				$scope.previousBlockedKeywords = $scope.blockedKeywords;
			}
		});

		$scope.onRZSliderDragEnd = function() {
			// keyword weight has been modified, show save/reset button
			$scope.dirty = true;
		};

		$scope.removeTargetedKeyword = function(keywordNode) {
			var i;
			for (i = 0; i < $scope.targetedKeywords.length; i ++) {
				if (keywordNode.target === $scope.targetedKeywords[i]) {
					$scope.targetedKeywords.splice(i, 1);
					break;
				}
			}
			for (i = 0; i < $scope.targetKeywordNodes.length; i ++) {
				if (keywordNode.target === $scope.targetKeywordNodes[i].target) {
					$scope.targetKeywordNodes.splice(i, 1);
					break;
				}
			}
			$scope.dirty = true;
		};

		$scope.removeBlockedKeyword = function(keywordNode) {
			var i;
			for (i = 0; i < $scope.blockedKeywords.length; i ++) {
				if (keywordNode.target === $scope.blockedKeywords[i]) {
					$scope.blockedKeywords.splice(i, 1);
					break;
				}
			}
			for (i = 0; i < $scope.blockKeywordNodes.length; i ++) {
				if (keywordNode.target === $scope.blockKeywordNodes[i].target) {
					$scope.blockKeywordNodes.splice(i, 1);
					break;
				}
			}
			$scope.dirty = true;
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