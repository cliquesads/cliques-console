/**
 * Created by Chuoxian Yang on 10/30/2017
 */
/* global _, angular, user */
angular.module('analytics').directive('keywordCloud', [
	function() {
		'use strict';
		return {
			restrict: 'E',
			scope: {},
			templateUrl: 'modules/analytics/views/partials/keyword-cloud.html',
			link: function(scope, element, attrs) {
				var color = d3.scale.linear()
							// Word cloud color defined here
				            .range(["#ddd", "#ccc", "#bbb", "#aaa", "#999", "#888", "#777", "#666", "#555", "#444", "#333", "#222"]);

				var frequency_list = [];
			    var draw = function(words) {
			        d3.select("#keyword-cloud-canvas").append("svg")
			                .attr("width", 850)
			                .attr("height", 350)
			                .attr("class", "wordcloud")
			                .append("g")
			                // without the transform, words words would get cutoff to the left and top, they would
			                // appear outside of the SVG area
			                .attr("transform", "translate(320, 200)")
			                .selectAll("text")
			                .data(words)
			                .enter().append("text")
			                .style("font-size", function(d) { return d.size + "px"; })
			                .style("fill", function(d, i) { return color(i); })
			                .attr("transform", function(d) {
			                    return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
			                })
			                .text(function(d) { return d.text; });
	            };

	            var calculateWordSize = function(maxImps, wordImps) {
					/**
					 * Word size range from 5 to 90 and word size is proportional 
					 * to its imps, so for keyword with the maximum imps, 
					 * its size should be 90
					 */
					return 90 * wordImps / maxImps;
	            };

				scope.$on('queryStarted', function(event, args) {
					// clear frequency_list and the cloud canvas
					frequency_list = [];
			    	d3.select("svg").remove();
					scope.isLoading = true;
				});
				scope.$on('queryError', function(event, args) {
					scope.isLoading = false;
				});
				scope.$on('queryEnded', function(event, args) {
					scope.isLoading = false;
					scope.queryResults = args.results;
					if (scope.queryResults && scope.queryResults.constructor === Array) {
						// find out the maximum imps
						var maxImps = 0;
						scope.queryResults.forEach(function(result) {
							if (result.imps > maxImps) {
								maxImps = result.imps;
							}	
						});
						scope.queryResults.forEach(function(result) {
							if (result._id.keywords && result._id.keywords.constructor === Array) {
								result._id.keywords.forEach(function(keyword) {
									frequency_list.push({
										"text": keyword,
										"size": calculateWordSize(maxImps, result.imps)
									});
								});
							}
						});
						if (frequency_list.length > 0) {
							d3.layout.cloud().size([800, 300])
							        .words(frequency_list)
							        .rotate(0)
							        .fontSize(function(d) { return d.size; })
							        .on("end", draw)
							        .start();	
						}
					}
				});
			}
		};
	}
]);