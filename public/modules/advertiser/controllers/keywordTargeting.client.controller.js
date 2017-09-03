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
			if ($scope.targetedKeywords.constructor === Array) {
				if ($scope.targetedKeywords.length === ($scope.numberOfTargets + 1)) {
					// targeted keywords added
					var addedTargetKeyword = $scope.targetedKeywords[$scope.numberOfTargets];
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
					$scope.dirty = true;
				}
				$scope.targetKeywordNodes = [];
				$scope.numberOfTargets = 0;
				$scope.previousTargetedKeywords = $scope.targetedKeywords;
			}
		});

		$scope.$watch('blockedKeywords', function(newValue, oldValue) {
			if ($scope.blockedKeywords.constructor === Array) {
				if ($scope.blockedKeywords.length === ($scope.numberOfBlocks + 1)) {
					// blocked keywords added
					var addedBlockKeyword = $scope.blockedKeywords[$scope.numberOfBlocks];
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

		var removeTagFromTagsInput = function(tagKeyword) {
			// query related tag in tagsinput and 
			// then click the 'remove' span programmatically
			var spanTags = angular.element('span.tag.label.label-info');
			for (var i = 0; i < spanTags.length; i ++) {
				if (spanTags[i].childNodes[0].data === tagKeyword) {
					spanTags[i].childNodes[1].click();
					break;
				}
			}
		};

		$scope.removeTargetedKeyword = function(keywordNode) {
			// remove the related tag in tagsinput,
			// $scope.$watch will be triggered so related 
			// targetKeywordNode can be removed as well
			removeTagFromTagsInput(keywordNode.target);
			$scope.dirty = true;
		};

		$scope.removeBlockedKeyword = function(keywordNode) {
			// remove the related tag in tagsinput,
			// $scope.$watch will be triggered so related
			// blockKeywordNode can be removed as well
			removeTagFromTagsInput(keywordNode.target);
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