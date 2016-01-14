/**
 * Created by bliang on 1/14/16.
 */
angular.module('core').directive('rowMultiSelect', [
    function() {
        return {
            restrict: 'E',
            scope: {
                baseModel: '=',
                options: '=',
                key: '@'
            },
            templateUrl: 'modules/core/views/partials/row-multi-select.html',
            link: function (scope, element, attrs) {

                // escape all quotes and re-enclose in quotes to pass to compiler
                var rowTemplate = attrs.rowTemplate.replace(/["]/g,'\\"');
                rowTemplate = rowTemplate.replace(/[']/g,"\\'");
                // Have to re-enclose in quotes before passing to compile directive
                // otherwise $parse will break when it tries to parse the expression
                scope.rowTemplate = "\"" + rowTemplate + "\"";

                // _id is default key used to determine uniqueness
                scope.key = scope.key || '_id';

                // initialize selected
                scope.$watchGroup(['baseModel','options'], function(newValues, oldValues){
                    var newBaseModel = newValues[0];
                    var newOptions = newValues[1];
                    if (newBaseModel && newOptions.length > 0) {
                        var intersect = _.intersectionBy(scope.baseModel, scope.options, function(item){
                            return item[scope.key];
                        });
                        if (intersect && intersect.length > 0){
                            intersect.forEach(function(option){
                                var thisOption = _.find(scope.options, function(opts){
                                    return opts[scope.key] === option[scope.key]; });
                                if (thisOption){
                                    // set selected to true if option is already
                                    // a member of baseModel
                                    thisOption.selected = true;
                                }
                            });
                        }
                    }
                });

                scope.select = function(obj){
                    obj.selected = !obj.selected;
                    if (obj.selected){
                        scope.baseModel.push(obj);
                    } else {
                        var i = _.findIndex(scope.baseModel, function(o){
                            return o[scope.key] === obj[scope.key];
                        });
                        scope.baseModel.splice(i, 1);
                    }
                }
            }
        }
    }
]);
