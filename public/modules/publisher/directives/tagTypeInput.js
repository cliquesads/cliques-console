/**
 * Created by bliang on 2/16/16.
 */
angular.module('publisher').directive('tagTypeInput', ['DEFAULT_TYPES','TAG_TYPES',function(DEFAULT_TYPES, TAG_TYPES) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            defaultType: '@',
            tagType: '@',
            model: '='
        },
        template:   '<div class="radio c-radio">' +
                        '<label ng-class="disabled ? \'text-muted\': \'\'">' +
                            '<input type="radio" name="{{ tagType }}" ng-model="model" value="{{ tagType }}" />' +
                            '<span class="fa fa-circle"></span>{{ TAG_TYPES[tagType].displayName }}' +
                        '</label>' +
                    '</div>',
        link: function(scope, element, attrs){
            scope.TAG_TYPES = TAG_TYPES;
            // Set 'disabled' to true if tagType isn't supported for this defaultType
            scope.supportedTagTypes = DEFAULT_TYPES[scope.defaultType].tagTypes;
            scope.disabled = (scope.supportedTagTypes.indexOf(scope.tagType) === -1);
            if (scope.disabled){
                element.find('input')[0].disabled = true;
            }
        }
    };
}]);

