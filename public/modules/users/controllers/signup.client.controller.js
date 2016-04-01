'use strict';

angular.module('users').controller('SignUpController', ['$scope', '$timeout','$http', '$location','$state', '$stateParams',
    '$window','Authentication','Organizations','Timezones','TermsAndConditions','REGEXES',
    function($scope, $timeout, $http, $location, $state, $stateParams, $window, Authentication, Organizations, Timezones,
             TermsAndConditions, REGEXES) {
        $scope.domain_regex = String(REGEXES.domain);
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

        /**
         * Handle intra-organization invite
         */
        if ($state.current.name === 'loggedout.organizationInvite'){
            $scope.organizationInvite = true;
            if ($stateParams.organizationId && $stateParams.accessTokenId){
                $scope.organization = Organizations.get({
                    organizationId: $stateParams.organizationId
                },function(){
                    // validate accessToken
                    if ($scope.organization.accessTokens){
                        $scope.accessToken = _.find($scope.organization.accessTokens, function(token){
                            return token._id === $stateParams.organizationId;
                        });
                        if ($scope.accessToken){
                            if ($scope.accessToken.expired){
                                $scope.stateError = "This invite has already been used."
                            } else {
                                $scope.credentials.firstName = $scope.accessToken.firstName;
                                $scope.credentials.lastName = $scope.accessToken.lastName;
                                $scope.credentials.email = $scope.accessToken.email;
                                $scope.credentials.roles = $scope.accessToken.roles;
                            }
                        }
                    }
                }, function(errorResponse){
                    // redirect to login page if error on org lookup
                    $scope.stateError = errorResponse.message;
                });
            } else {
                // redirect to login page if no accessToken & organizationID provided
                // $location.path('/signin');
            }
        }

        /**
         * Initialize fees retrieved from accesscode used
         * @type {{advertiser: null, publisher: null}}
         */
        $scope.fees = {
            advertiser: null,
            publisher: null
        };
        $scope.getAllFeesFromAccessCode = function(){
            for (var role in $scope.fees){
                if ($scope.fees.hasOwnProperty(role)){
                    var feeObj = _.find($scope.authentication.accesscode.fees, function(fee){
                        return fee.type === role;
                    });
                    feeObj = _.clone(feeObj);
                    // Get rid of _id param
                    delete feeObj._id;
                    $scope.fees[role] = feeObj;
                }
            }
        };

        // set vars for new user signup from access code
        if (!$scope.organizationInvite){
            $scope.getAllFeesFromAccessCode();
            var promos = $scope.authentication.accesscode.promos;
            $scope.promos = _.groupBy(promos, function(p){ return p.type; });
        }

        // Control for acceptance of terms
        $scope.acceptedTerms = false;

        /**
         * Have to manually add jQuery int-tel-input to orgPhone field
         */
        $('#phone').intlTelInput({
            utilsScript: 'lib/intl-tel-input/lib/libphonenumber/build/utils.js',
            autoFormat: true
        });
        // jQuery hack to force input to fill whole column
        $('div.intl-tel-input').addClass('col-md-12 p0');

        /**
         * Add custom validator for orgPhone field that just checks number validity
         * of intlTelInput
         */
        window.ParsleyValidator
            .addValidator('intlphone', function (value, requirement) {
                return $("#phone").intlTelInput("isValidNumber");
            }, 32);

        /**
         * Terrible jQuery hack to move password helpers to where I want them to go
         */
        $timeout(function(){
            $('section.trustpass').appendTo('#password-helper');
        });

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

        $scope.loading = false;
		$scope.signup = function() {
            $scope.loading = true;
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
                    $scope.loading = false;
                    $window.location.href = '/';
                }).error(function(response) {
                    $scope.loading = false;
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
                $scope.organization.fees = [$scope.fees[$scope.credentials.role]];
                $scope.organization.termsAndConditions = [$scope.termsAndConditions.id];
                $scope.organization.phone = $('#phone').intlTelInput('getNumber');

                // if we're creating a new organization, make this user the primary contact
                $scope.credentials.isPrimaryContact = true;

                $http.post('/organization', $scope.organization).success(function(response){
                    $scope.organization = response;
                    _signUpUser($scope.organization._id);
                }).error(function(response){
                    $scope.loading = false;
                    $scope.error = response.message;
                });
            }
		};
	}
]);