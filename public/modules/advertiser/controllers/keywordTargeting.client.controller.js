/* global _, angular, moment, user */
'use strict';

angular.module('advertiser').controller('KeywordTargetingController', [
	'$scope', 'campaign', 'ngDialog', 'Notify',
	function($scope, campaign, ngDialog, Notify) {

		$scope.Math = Math;
		$scope.dirty = false;

		// user typed in tagsinput keywords data model
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
			var newNode = angular.copy(node);
			if (node.weight === 0) {
				newNode.weight = 0;
			} else {
				newNode.weight = node.weight || 1.0;
			}
			return newNode;
		};

		$scope.targetedTagsinputDOM = angular.element(document.getElementById('targeted-tagsinput'));
		$scope.blockedTagsinputDOM = angular.element(document.getElementById('blocked-tagsinput'));

		$scope.addTargetedKeyword = function(keyword, weight) {
			var keywordExists = false;
			for (var i = 0; i < $scope.targetKeywordNodes.length; i ++) {
				if ($scope.targetKeywordNodes[i].target === keyword) {
					keywordExists = true;
					break;
				}
			}
			if (!keywordExists) {
				$scope.targetKeywordNodes.push(_initializeKeywordNode({
					target: keyword,
					weight: weight
				}));
			}
		};

		$scope.addBlockedKeyword = function(keyword) {
			var keywordExists = false;
			for (var i = 0; i < $scope.blockKeywordNodes.length; i ++) {
				if ($scope.blockKeywordNodes[i].target === keyword) {
					keywordExists = true;
					break;
				}
			}
			if (!keywordExists) {
				$scope.blockKeywordNodes.push(_initializeKeywordNode({
					target: keyword
				}));
			}
		};

		$scope.removeTargetedKeywordFromList = function(keyword, removeFromTagsinputAsWell) {
			for (var i = 0; i < $scope.targetKeywordNodes.length; i ++) {
				if ($scope.targetKeywordNodes[i].target === keyword) {
					$scope.targetKeywordNodes.splice(i, 1);
					break;
				}
			}
			if (removeFromTagsinputAsWell) {
				if ($scope.targetedKeywords.constructor === Array && 
					$scope.targetedKeywords.indexOf(keyword) !== -1) {
					$scope.targetedTagsinputDOM.tagsinput('remove', keyword);
				}
			}
			$scope.dirty = true;
		};

		$scope.removeBlockedKeywordFromList = function(keyword, removeFromTagsinputAsWell) {
			for (var i = 0; i < $scope.blockKeywordNodes.length; i ++) {
				if ($scope.blockKeywordNodes[i].target === keyword) {
					$scope.blockKeywordNodes.splice(i, 1);
					break;
				}
			}
			if (removeFromTagsinputAsWell) {
				if ($scope.blockedKeywords.constructor === Array && 
					$scope.blockedKeywords.indexOf(keyword) !== -1) {
					$scope.blockedTagsinputDOM.tagsinput('remove', keyword);
				}
			}
			$scope.dirty = true;
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
				$scope.addTargetedKeyword(keywordNode.target, keywordNode.weight);
			});
			$scope.campaign.blocked_keywords.forEach(function(keywordNode) {
				$scope.addBlockedKeyword(keywordNode.target);
			});
		};
		$scope.reset();

		$scope.targetedTagsinputDOM.on('itemAdded', function(event) {
			$scope.addTargetedKeyword(event.item);
		});
		$scope.targetedTagsinputDOM.on('itemRemoved', function(event) {
			$scope.removeTargetedKeywordFromList(event.item, false);
			setTimeout(function() {
				$scope.$apply();
			}, 0);
		});

		$scope.blockedTagsinputDOM.on('itemAdded', function(event) {
			$scope.addBlockedKeyword(event.item);
		});
		$scope.blockedTagsinputDOM.on('itemRemoved', function(event) {
			$scope.removeBlockedKeywordFromList(event.item, false);
			setTimeout(function() {
				$scope.$apply();
			}, 0);
		});

		$scope.onRZSliderDragEnd = function() {
			// keyword weight has been modified, show save/reset button
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