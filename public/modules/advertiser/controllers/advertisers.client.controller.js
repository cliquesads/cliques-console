'use strict';

angular.module('advertiser').controller('AdvertiserController', ['$scope', '$stateParams', '$location', 'Authentication', 'Advertiser','HourlyAdStat','MongoTimeSeries',
	function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, MongoTimeSeries) {
		$scope.authentication = Authentication;

        $scope.lineData = [{
            "label": "Impressions",
            "color": "#5ab1ef",
            "yaxis": 1,
            "data": [
                [new Date('2015-07-01'), 40838],
                [new Date('2015-07-02'), 58978],
                [new Date('2015-07-03'), 47909],
                [new Date('2015-07-04'), 37090],
                [new Date('2015-07-05'), 89322],
                [new Date('2015-07-06'), 74490],
                [new Date('2015-07-07'), 67599]
            ]
        }, {
            "label": "Spend",
            "color": "#f5994e",
            "yaxis": 2,
            "data": [
                [new Date('2015-07-01'), 65],
                [new Date('2015-07-02'), 116],
                [new Date('2015-07-03'), 123],
                [new Date('2015-07-04'), 119],
                [new Date('2015-07-05'), 378],
                [new Date('2015-07-06'), 389],
                [new Date('2015-07-07'), 312]
            ]
        }];
        $scope.lineOptions = {
            series: {
                lines: {
                    show: true,
                    fill: 0.01
                },
                points: {
                    show: true,
                    radius: 4
                }
            },
            grid: {
                borderColor: '#eee',
                borderWidth: 1,
                hoverable: true,
                backgroundColor: '#fcfcfc'
            },
            tooltip: true,
            tooltipOpts: {
                content: function (label, x, y) { return x + ' : ' + y; }
            },
            xaxis: {
                tickColor: '#eee',
                mode: 'time',
                timeformat: '%m/%d',
                ticksize: [1, 'day']
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

        //// used for datepicker forms
        //$scope.today = new Date();

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
            var cb = function(response){
                var data = new MongoTimeSeries(response.data, {fields: ['imps','clicks','view_convs','num_bids']});
                $scope.data = {imps: data.imps, clicks: data.clicks, bids: data.num_bids}
            };
            HourlyAdStat.advQuery({advertiserId: $stateParams.advertiserId},{ dateGroupBy: 'hour'}).then(cb, cb);
			$scope.advertiser = Advertiser.get({
				advertiserId: $stateParams.advertiserId
			});
		};
	}
]);