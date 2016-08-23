angular.module('publisher').directive('placementSizesAvailable', [
    function() {
        return {
            restrict: 'E',
            scope: {
                site: '=',
                showCounts: '@'
            },
            template: '<span ng-repeat="(size, count) in getPlacementSizeCounts(site)">{{ size }}' +
                '<small ng-show="showCounts" class="text-muted"> ({{ count }})</small>' +
                '<span ng-hide="$last">, </span>' +
                '</span>',
            link: function (scope, element, attrs) {

                scope.showCounts = scope.showCounts || false;

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
        }
    }
]);
