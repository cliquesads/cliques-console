'use strict';

angular.module('advertiser').controller('AdvertiserController', ['$scope', '$stateParams', '$location', 'Authentication', 'Advertiser','HourlyAdStat','MongoTimeSeries',
	function($scope, $stateParams, $location, Authentication, Advertiser, HourlyAdStat, mts) {
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

        $scope.lineOptions = {
            grid: {
                borderColor: '#eee',
                borderWidth: 1,
                hoverable: true,
                backgroundColor: '#fcfcfc'
            },
            tooltip: true,
            tooltipOpts: {
                content: function (label, x, y) {
                    var date = new Date(x);
                    var str = (date.getMonth() + 1).toString() + '/' + date.getDate().toString();
                    if (label === 'Impressions'){
                        y = y.toLocaleString();
                    } else if (label === 'CTR'){
                        y = (y * 100).toFixed(2) + '%';
                    }
                    return str + ' : ' + y;
                }
            },
            xaxis: {
                tickColor: '#fcfcfc',
                mode: 'time',
                timeformat: '%m/%d/%y',
                tickSize: [1, 'day'],
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
                        return (val * 100).toFixed(2) + '%';
                    }
                }
            ],
            shadowSize: 0
        };

        var now = new Date(); // date in local time
        // get tomorrow at midnight as end date
        var end_date = new Date(now.setDate(now.getDate() + 1));
        end_date.setHours(0);
        end_date.setMinutes(0);
        end_date.setSeconds(0);
        end_date.setMilliseconds(0);
        function subtractDays(date, days){
            return new Date(date - days * 24 * 60 * 60 * 1000);
        }
        $scope.dateRanges = {
            "7d": {
                startDate: subtractDays(end_date, 7).toISOString(),
                endDate: end_date.toISOString(),
                label: "Last 7 Days"
            },
            "30d": {
                startDate: subtractDays(end_date, 30).toISOString(),
                endDate: end_date.toISOString(),
                label: "Last 30 Days"
            },
            "90d": {
                startDate: subtractDays(end_date, 90).toISOString(),
                endDate: end_date.toISOString(),
                label: "Last 90 Days"
            }
        };
        $scope.dateRangeSelection = "7d";

        $scope.getAdvertiserGraph = function(dateShortCode){

            dateShortCode = dateShortCode || $scope.dateRangeSelection;
            var startDate = $scope.dateRanges[dateShortCode].startDate;
            var endDate = $scope.dateRanges[dateShortCode].endDate;
            var timeUnit = 'day';

            mts.then(function(MongoTimeSeries){
                // callback to pass to promise
                var cb = function(response){
                    var data = new MongoTimeSeries(response.data, startDate, endDate, timeUnit, {
                        fields: [
                            'imps',
                            {'CTR': function(row){return row.clicks / row.imps;}}
                        ]
                    });
                    $scope.lineData = [{
                        label: "Impressions",
                        bars: {
                            show: true,
                            align: "center",
                            fill: true,
                            barWidth: 24 * 60 * 60 * 600,
                            lineWidth: 0.4
                        },
                        color: "#768294",
                        yaxis: 1,
                        data: data.imps
                    },{
                        label: "CTR",
                        lines: {
                            show: true,
                            fill: 0.01
                        },
                        points: {
                            show: true,
                            radius: 4
                        },
                        color: "#5ab1ef",
                        yaxis: 2,
                        data: data.CTR
                    }];
                };
                // query HourlyAdStats api endpoint
                HourlyAdStat.advQuery({advertiserId: $stateParams.advertiserId},{
                    dateGroupBy: timeUnit,
                    startDate: startDate,
                    endDate: endDate
                }).then(cb, cb);
                $scope.dateRangeSelection = dateShortCode;
            });

        }
	}
]);