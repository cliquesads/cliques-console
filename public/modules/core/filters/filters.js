/**
 * Created by bliang on 8/4/15.
 */

/* global _, angular */
'use strict';

// This filter makes the assumption that the input will be in decimal form (i.e. 17% is 0.17).
angular.module('core').filter('percentage', ['$filter', function ($filter) {
    return function (input, decimals) {
        return $filter('number')(input * 100, decimals) + '%';
    };
}])
.filter('capitalize', function() {
    return function(input) {
        if (input!==null)
            input = input.toLowerCase();
        return input.substring(0,1).toUpperCase()+input.substring(1);
    };
});
