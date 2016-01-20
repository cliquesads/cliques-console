/**
 * Created by bliang on 1/13/16.
 */

/* global _, angular, moment, user */
'use strict';

angular.module('core').controller('TermsAndConditionsController',
    ['$scope', '$timeout', '$location', '$window','Authentication','TermsAndConditions',
        function($scope,$timeout,$location,$window,Authentication,TermsAndConditions) {
            $scope.authentication = Authentication;
            var tcIds = $scope.authentication.user.organization.termsAndConditions;
            $scope.termsAndConditions = [];
            tcIds.forEach(function(id){
                TermsAndConditions
                    .get({termsId: id})
                    .then(function(response){
                        $scope.termsAndConditions.push(response.data);
                    });
            });
        }
    ]
);