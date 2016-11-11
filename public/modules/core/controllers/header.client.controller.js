/* globals user */
'use strict';

angular.module('core').controller('HeaderController', ['$scope', 'Authentication', 'Organizations', 'Menus',
	function($scope, Authentication, Organizations, Menus) {
		$scope.authentication = Authentication;
		$scope.isCollapsed = false;
		$scope.menu = Menus.getMenu('topbar');

		$scope.settingsCollapsed = true;

		if (user) {
			$scope.organization = Organizations.get({
				organizationId: Authentication.user.organization._id
			});
			$scope.organization.$promise.then(function(org){
				if (org.payments){
					$scope.payments = org.payments.filter(function(p){
						return (p.status === 'Pending' || p.status === 'Overdue');
					});
				}
			});
		}

		$scope.toggleCollapsibleMenu = function() {
			$scope.isCollapsed = !$scope.isCollapsed;
		};

		// Collapsing the menu after navigation
		$scope.$on('$stateChangeSuccess', function() {
			$scope.isCollapsed = false;
		});
	}
]);