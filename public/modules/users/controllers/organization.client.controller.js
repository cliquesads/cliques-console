'use strict';

angular.module('users').controller('OrganizationController', ['$scope', '$http', '$location', '$analytics', 'Users',
    'Authentication','Organizations','Notify','ngDialog',
    function($scope, $http, $location, $analytics, Users, Authentication, Organizations, Notify, ngDialog) {
        $scope.user = Authentication.user;
        $scope.organization = Organizations.get({
            organizationId: Authentication.user.organization._id
        });

        /**
         * Have to manually add jQuery int-tel-input to orgPhone field
         */
        $('#phone').intlTelInput({
            utilsScript: 'lib/intl-tel-input/lib/libphonenumber/build/utils.js',
            autoFormat: true
        });
        // jQuery hack to force input to fill whole column
        $('div.intl-tel-input').addClass('col-md-12 p0');

        $scope.notObserver = function(user){
            return user.role !== 'observer';
        };

        /**
         * Add custom validator for orgPhone field that just checks number validity
         * of intlTelInput
         */
        window.ParsleyValidator
            .addValidator('intlphone', function (value, requirement) {
                return $("#phone").intlTelInput("isValidNumber");
            }, 32);

        $scope.updateOrganization = function(){
            if ($scope.orgForm.$valid){
                $scope.organization.$update(function(response){
                    $scope.organization = response;
                    Notify.alert('Organization Saved Successfully', {status: 'success'});
                }, function(response){
                    Notify.alert(response.data.message, {status: 'danger'});
                });
            }
        };

        $scope.inviteUser = function(){
            ngDialog.open({
                template: 'modules/users/views/partials/invite-users-dialog.html',
                className: 'ngdialog-theme-default dialogwidth650',
                data: {
                    organization: $scope.organization
                },
                controller: ['$scope','$http', function($scope, $http) {
                    $scope.organization = $scope.ngDialogData.organization;

                    $scope.invites = [{
                        firstName: null,
                        lastName: null,
                        email: null
                    }];

                    $scope.submit = function(){
                        $scope.loading = true;
                        if ($scope.inviteForm.$valid){
                            $http.post('/console/organization/' + $scope.organization._id + '/sendinvite', $scope.invites)
                            .success(function(response){
                                Notify.alert('User invites sent', {status: 'success'});
                                $scope.loading = false;
                                $scope.closeThisDialog('success');
                                $analytics.eventTrack('OrgSettings_InviteSent', { total: $scope.invites.length });
                            })
                            .error(function(response){
                                $scope.loading = false;
                                Notify.alert(response.message, {status: 'danger'});
                            });
                        } else {
                            $scope.loading = false;
                        }
                    };

                }]
            });
        };
    }
]);