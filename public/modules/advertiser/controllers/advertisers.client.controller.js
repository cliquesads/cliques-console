'use strict';

angular.module('advertiser').controller('AdvertiserController', ['$scope', '$stateParams', '$location', 'Authentication', 'Advertiser',
	function($scope, $stateParams, $location, Authentication, Advertiser) {
		$scope.authentication = Authentication;

		$scope.create = function() {
			var advertiser = new Advertiser({
				name: this.name,
				contact: this.contact,
                email: this.email,
                description: this.description,
                phone: this.phone,
                website: this.website
			});
			advertiser.$create(function(response) {
				$location.path('advertiser/');
				$scope.name = '';
				$scope.contact = '';
                $scope.email = '';
                $scope.description = '';
                $scope.phone = '';
                $scope.website = '';
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		$scope.remove = function(advertiser) {
			if (advertiser) {
				advertiser.$remove();

				for (var i in $scope.advertiser) {
					if ($scope.advertiser[i] === advertiser) {
						$scope.advertiser.splice(i, 1);
					}
				}
			} else {
				$scope.advertiser.$remove(function() {
					$location.path('advertiser');
				});
			}
		};

		$scope.update = function() {
			var advertiser = $scope.advertiser;

			advertiser.$update(function() {
				$location.path('advertiser/' + advertiser._id);
			}, function(errorResponse) {
				$scope.error = errorResponse.data.message;
			});
		};

		$scope.find = function() {
			$scope.advertiser = Advertiser.query();
		};

		$scope.findOne = function() {
			$scope.advertiser = Advertiser.get({
				advertiserId: $stateParams.advertiserId
			});
		};
	}
]);