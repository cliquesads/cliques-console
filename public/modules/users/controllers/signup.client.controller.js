'use strict';

angular.module('users').controller('SignUpController', ['$scope', '$http', '$location', '$window','Authentication','Timezones','TermsAndConditions',
	function($scope, $http, $location, $window, Authentication, Timezones, TermsAndConditions) {
		$scope.authentication = Authentication;

		// If user is signed in then redirect back home
		if ($scope.authentication.user) $location.path('/');

        // TODO: get this from model enum
        $scope.timezoneChoices = Timezones;
        $scope.credentials = {
            tz: 'America/New_York',
            role: 'advertiser'
        };
        $scope.organization = {
            country: 'USA'
        };
        $scope.roleChoices = {
            advertiser: {
                name: 'Advertiser',
                description:'Run advertising campaigns on Cliques'
            },
            publisher: {
                name: 'Publisher',
                description:'Monetize a website with Cliques ad placements'
            }
        };
        // Get advertiser & publisher fee schedules from accesscode
        $scope.advertiserFees = _.find($scope.authentication.accesscode.fees, function(fee){ return fee.type === 'advertiser'; });
        $scope.publisherFees = _.find($scope.authentication.accesscode.fees, function(fee){ return fee.type === 'publisher'; });
        // Control for acceptance of terms
        $scope.acceptedTerms = false;


        /**
         * Watcher to set default username to email address
         */
        $scope.$watch(function(scope){ return scope.credentials.email; }, function(newEmail, oldEmail){
            if (newEmail){
                if (newEmail != oldEmail && !$scope.credentials.username){
                    $scope.credentials.username = newEmail;
                }
            }
        });

        /**
         * Watcher to switch Terms & Conditions depending on role selected (advertiser or publisher)
         */
        $scope.$watch(function(scope){ return scope.credentials.role }, function(newRole, oldRole){
            if (newRole){
                TermsAndConditions.getCurrent(newRole)
                    .then(function(response){
                        $scope.template = response.data.html;
                        $scope.termsAndConditions = response.data
                    });
            }
        });

        $scope.$watch(function(scope){ return scope.credentials.username }, function(newUsername, oldUsername){
            if (newUsername){
                $http.get('/auth/is-username-taken/' + newUsername).success(function(response){
                    $scope.userNameTaken = response.taken;
                });
            }
        });

		$scope.signup = function() {
            // Subfunction to just sign up user.
            // Gets wrapped in organization creation logic, called
            // as callback once we have org ID
            function _signUpUser(organizationId){
                // Add access code ref to user before submitting for tracking purposes
                $scope.credentials.accesscode = $scope.authentication.accesscode._id;
                $scope.credentials.roles = [$scope.credentials.role];
                $scope.credentials.organization = organizationId;
                // Post the request
                $http.post('/auth/signup', $scope.credentials).success(function(response){
                    // If successful we assign the response to the global user model
                    $scope.authentication.user = response;
                    $scope.authentication.accesscode = null;
                    // And redirect to the index page
                    $window.location.href = '/';
                }).error(function(response) {
                    $scope.error = response.message;
                });
            }

            // If organization is new, first need to create it before creating user.
            // Otherwise, just pass its ID to signup function
            if ($scope.organization._id){
                $scope.credentials.isPrimaryContact = false;
                _signUpUser($scope.organization._id)
            } else {
                // have to create a new organization first, then sign up user
                $scope.organization.fees = $scope.credentials.role === 'advertiser' ? $scope.advertiserFees : $scope.publisherFees;
                $scope.organization.termsAndConditions = [$scope.termsAndConditions.id];

                // if we're creating a new organization, make this user the primary contact
                $scope.credentials.isPrimaryContact = true;

                $http.post('/organization', $scope.organization).success(function(response){
                    $scope.organization = response;
                    _signUpUser($scope.organization._id);
                }).error(function(response){
                    $scope.error = response.message;
                });
            }
		};
	}
]);