'use strict';

angular.module('users').controller('SignUpController', ['$scope', '$timeout','$http', '$location','$state', '$stateParams',
    '$window','$analytics','Authentication','Organizations','Timezones','TermsAndConditions','REGEXES', 'FileUploader',
    function($scope, $timeout, $http, $location, $state, $stateParams, $window, $analytics, Authentication, Organizations,
             AccessLink, Timezones, TermsAndConditions, REGEXES, FileUploader){
        $scope.domain_regex = String(REGEXES.domain);
        $scope.authentication = Authentication;

        $scope.logo_uploader = new FileUploader({
            url: 'console/logos'
        });

        $scope.logo_url = undefined;

        // If user is signed in then redirect back home
        if ($scope.authentication.user) {
            $location.path('/');
        } else {
            // track first signup step here instead of view since it renders by default
            $analytics.eventTrack('Signup_Step1');
        }

        /**
         * Have to manually add jQuery int-tel-input to orgPhone field
         */
        $timeout(function() {
            $('#phone').intlTelInput({
                utilsScript: 'lib/intl-tel-input/lib/libphonenumber/build/utils.js',
                autoFormat: true
            });
            // jQuery hack to force input to fill whole column
            $('div.intl-tel-input').addClass('col-md-12 p0');
        });

        /**
         * Add custom validator for orgPhone field that just checks number validity
         * of intlTelInput
         */
        window.ParsleyValidator
            .addValidator('intlphone', function (value, requirement) {
                return $("#phone").intlTelInput("isValidNumber");
            }, 32);

        // TODO: get this from model enum
        $scope.timezoneChoices = Timezones;
        $scope.credentials = {
            tz: 'America/New_York',
            role: 'admin'
        };
        $scope.organization = {
            type: 'advertiser',
            country: 'USA'
        };
        $scope.organization_types = {
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
            $analytics.eventTrack('Signup_OrgInviteStart');
            if ($stateParams.organizationId && $stateParams.accessTokenId){
                $scope.organization = Organizations.get({
                    organizationId: $stateParams.organizationId
                },function(){
                    // validate accessToken
                    if ($scope.organization.accessTokens){
                        $scope.credentials.accessToken = _.find($scope.organization.accessTokens, function(token){
                            return token._id === $stateParams.accessTokenId;
                        });
                        if ($scope.credentials.accessToken){
                            if ($scope.credentials.accessToken.expired){
                                $scope.stateError = "This invite has expired";
                                $analytics.eventTrack('Signup_OrgInviteExpired');
                            } else {
                                // Set appropriate terms and conditions
                                TermsAndConditions.getCurrent($scope.organization.organization_types[0])
                                    .then(function(response){
                                        $scope.template = response.data.html;
                                        $scope.termsAndConditions = response.data;
                                    });
                                $analytics.eventTrack('Signup_OrgInviteValidated');
                                $scope.credentials.firstName = $scope.credentials.accessToken.firstName;
                                $scope.credentials.lastName = $scope.credentials.accessToken.lastName;
                                $scope.credentials.email = $scope.credentials.accessToken.email;
                                $scope.credentials.role = $scope.credentials.accessToken.role;
                            }
                        } else {
                            $analytics.eventTrack('Signup_OrgInviteInvalid');
                            $scope.stateError = "This invite is invalid.";
                        }
                    }
                }, function(errorResponse){
                    // redirect to login page if error on org lookup
                    $scope.stateError = errorResponse.message;
                });
            } else {
                // redirect to login page if no accessToken & organizationID provided
                $location.path('/signin');
            }
        } else if ($state.current.name === 'loggedout.invite') {
            /**
             * Handle invites for new orgs
             */
            $analytics.eventTrack('Signup_AccessLinkStart');
            if ($stateParams.accessLinkId) {
                $scope.accessLink = AccessLink.get({
                    accessLinkId: $stateParams.accessLinkId
                }, function () {
                    // accessLinkId exists
                    if ($scope.accessLink.expired) {
                        $scope.stateError = "This link has expired.";
                        $analytics.eventTrack('Signup_OrgInviteExpired');
                    }
                }, function (errorResponse) {
                    // redirect to login page if error on org lookup
                    $scope.stateError = errorResponse.message;
                });
            } else {
                // redirect to login page if no accessToken & organizationID provided
                $location.path('/signin');
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
            var fu = function(fee){
                return fee.type === role;
            };
            for (var role in $scope.fees){
                if ($scope.fees.hasOwnProperty(role)){
                    var feeObj = _.find($scope.authentication.accesscode.fees, fu);
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
                if (newEmail !== oldEmail && !$scope.credentials.username){
                    $scope.credentials.username = newEmail;
                }
            }
        });

        /**
         * Watcher to switch Terms & Conditions depending on role selected (advertiser or publisher)
         */
        $scope.$watch(function(scope){ return scope.organization.type; }, function(newRole, oldRole){
            if (newRole){
                TermsAndConditions.getCurrent(newRole)
                    .then(function(response){
                        $scope.template = response.data.html;
                        $scope.termsAndConditions = response.data;
                    });
            }
        });

        $scope.$watch(function(scope){ return scope.credentials.username; }, function(newUsername, oldUsername){
            if (newUsername){
                $http.get('/auth/is-username-taken/' + newUsername).success(function(response){
                    $scope.userNameTaken = response.taken;
                });
            }
        });

        /**
         * Subfunction to create organization if necessary
         * @returns {HttpPromise}
         */
        $scope.createOrganization = function(){
            // have to create a new organization first, then sign up user
            $scope.organization.fees = [$scope.fees[$scope.organization.type]];
            $scope.organization.termsAndConditions = [$scope.termsAndConditions.id];
            $scope.organization.phone = $('#phone').intlTelInput('getNumber');
            $scope.organization.organization_types = [$scope.organization.type];

            if (!$scope.organizationInvite) {
                $scope.organization.accesscode = $scope.authentication.accesscode._id;
                $scope.organization.promos = $scope.promos[$scope.organization.type];
            }

            $scope.logo_url = $scope.organization.logo_url;
            // if we're creating a new organization, make this user the primary contact
            $scope.credentials.isOwner = true;

            // return the promise
            return $http.post('/organization', $scope.organization);
        };

        /**
         * Subfunction to just sign up user.
         * Gets wrapped in organization creation logic, called
         * as callback once we have org ID
         */
        $scope.signUpUser = function(organizationId){
            // Add access code ref to user before submitting for tracking purposes
            if (!$scope.organizationInvite) {
                $scope.credentials.accesscode = $scope.authentication.accesscode._id;
            }
            $scope.credentials.organization = organizationId;
            $scope.credentials.logo_url = $scope.logo_url;
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
        };

        $scope.loading = false;

        /**
         * Main signup function, bound to form
         *
         * If organization exists, just signs up user.  Otherwise, first
         * creates the organization, then signs user up and logs in.
         */
        $scope.signup = function() {
            $scope.loading = true;
            // If organization is new, first need to create it before creating user.
            // Otherwise, just pass its ID to signup function
            if ($scope.organization._id){
                // if org exists already, don't make user the owner
                $scope.credentials.isOwner = false;
                $scope.signUpUser($scope.organization._id);
            } else {
                $scope.createOrganization().success(function(response){
                    $scope.organization = response;
                    $scope.signUpUser($scope.organization._id);
                }).error(function(response){
                    $scope.loading = false;
                    $scope.error = response.message;
                });
            }
		};
	}
]);