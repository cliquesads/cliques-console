/* globals user, helpScout, logoBucket */
'use strict';

angular.module('core').controller('HeaderController', ['$scope', 'Authentication', 'Organizations', 'Menus', 'userIdenticon',
	function($scope, Authentication, Organizations, Menus, userIdenticon) {
		$scope.authentication = Authentication;
		$scope.userIdenticon = userIdenticon;
		$scope.isCollapsed = false;
		$scope.menu = Menus.getMenu('topbar');
		$scope.helpScoutUrl = helpScout.baseUrl;
		$scope.logoBucket = logoBucket;

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