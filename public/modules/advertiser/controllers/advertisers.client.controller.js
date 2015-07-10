'use strict';

angular.module('advertiser').controller('AdvertiserController', ['$scope', '$stateParams', '$location', 'Authentication', 'Advertiser',
	function($scope, $stateParams, $location, Authentication, Advertiser) {
		$scope.authentication = Authentication;

		$scope.create = function() {
            $scope.submitted = true;
            if (this.advertiserForm.$valid) {
                // group creatives by size and create creative groups for each
                var creativegroups_obj = {};
                $scope.creatives.forEach(function(creative){
                    var key = creative.w + 'x' + creative.h;
                    if (creativegroups_obj.hasOwnProperty(key)){
                        creativegroups_obj[key] = [creative];
                    } else {
                        creativegroups_obj[key].push(creative);
                    }
                });
                var creativegroups = [];
                for (var size in creativegroups_obj){
                    if (creativegroups_obj.hasOwnProperty(size)){
                        creativegroups.push({
                            name: $scope.campaign.name + '_' + size,
                            h: Number(size.split('x')[1]),
                            w: Number(size.split('x')[0]),
                            creatives: [creativegroups_obj[size]]
                        });
                    }
                }
                // now create new advertiser object
                var advertiser = new Advertiser({
                    name:           this.name,
                    description:    this.description,
                    website:        this.website,
                    cliques:        this.cliques,
                    campaigns: [{
                        name:           this.campaign.name,
                        description:    this.campaign.description,
                        start_date:     this.campaign.start_date,
                        end_date:       this.campaign.end_date,
                        base_bid:       this.campaign.base_bid,
                        max_bid:        this.campaign.max_bid,
                        frequency:      this.campaign.frequency,
                        clique:         this.campaign.clique,
                        creativegroups: [creativegroups]
                    }],
                    actionbeacons: this.actionbeacons
                });
                advertiser.$create(function (response) {
                    $location.path('advertiser/');
                    $scope.name = '';
                    $scope.description= '';
                    $scope.campaign = '';
                    $scope.creatives = '';
                    $scope.cliques = '';
                    $scope.website = '';
                    $scope.actionbeacons = '';
                }, function (errorResponse) {
                    $scope.error = errorResponse.data.message;
                });
            } else {
                return false;
            }
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

        $scope.validateInput = function(name, type) {
            var input = this.advertiserForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
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
			$scope.advertisers = Advertiser.query();
		};

		$scope.findOne = function() {
			$scope.advertiser = Advertiser.get({
				advertiserId: $stateParams.advertiserId
			});
		};
	}
]);