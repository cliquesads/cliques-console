'use strict';

angular.module('advertiser').controller('AdvertiserController', ['$scope', '$stateParams', '$location', 'Authentication', 'Advertiser','HourlyAdStat','MongoTimeSeries',
	function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries) {
		$scope.authentication = Authentication;

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

        $scope.getAdvertiserGraph = function(){
            // callback to pass to promise
            var cb = function(response){
                var data = new MongoTimeSeries(response.data, {fields: ['imps','spend','bids']});
                $scope.lineData = [{
                    label: "Impressions",
                    lines: {
                        show: true,
                        fill: 0.01
                    },
                    points: {
                        show: true,
                        radius: 4
                    },
                    color: "#5ab1ef",
                    yaxis: 1,
                    data: data.imps
                }, {
                    label: "Spend",
                    bars: {
                        show: true,
                        align: "center",
                        fill: true,
                        barWidth: 24 * 60 * 60 * 800,
                        lineWidth: 1
                    },
                    color: "#f5994e",
                    yaxis: 2,
                    data: data.spend
                }];
            };
            // query HourlyAdStats api endpoint
            HourlyAdStat.advQuery({advertiserId: $stateParams.advertiserId},{ dateGroupBy: 'day'}).then(cb, cb);

            $scope.lineOptions = {
                grid: {
                    borderColor: '#eee',
                    borderWidth: 1,
                    hoverable: true,
                    backgroundColor: '#fcfcfc'
                },
                tooltip: true,
                xaxis: {
                    tickColor: '#eee',
                    mode: 'time',
                    timeformat: '%m/%d',
                    ticksize: [1, 'day'],
                    axisLabelPadding: 5
                },
                yaxes: [
                    {
                        position: 'left',
                        tickColor: '#eee',
                        tickFormatter: function (val, axis) {
                            return val.toLocaleString();
                        }
                    },
                    {
                        position: 'right',
                        tickColor: '#eee',
                        tickFormatter: function (val, axis) {
                            return '$' + val.toLocaleString();
                        }
                    }
                ],
                shadowSize: 0
            };
        }
	}
]);