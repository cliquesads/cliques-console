'use strict';

angular.module('publisher').directive('advertiserFacingSiteListItem', [
    function() {
        return {
            restrict: 'E',
            scope: {
                site: '=',
                size: '@'
            },
            templateUrl: 'modules/publisher/views/partials/advertiser-facing-site-list-item.html',
            link: function (scope, element, attrs) {
                /**
                 * Gets counts of all placements grouped by size for a given Site
                 *
                 * Since placements are nested in pages, need to
                 * @param site Site object
                 * @returns {*} object containing sizes ("[width]x[height]" strings) as keys, counts as values
                 */
                scope.getPlacementSizeCounts = function(site){
                    return _.reduce(site.pages, function(allSizes, page){
                        var pageSizes = _.countBy(page.placements, function(placement){
                            return placement.w + 'x' + placement.h;
                        });

                        return _.mergeWith(allSizes, pageSizes, function(objValue, srcValue){
                            if (objValue){
                                return objValue + srcValue;
                            } else {
                                return srcValue;
                            }
                        });
                    }, {});
                };
            }
        };
    }
]);