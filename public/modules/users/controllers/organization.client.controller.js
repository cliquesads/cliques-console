angular.module('users').controller('OrganizationController', ['$scope', '$http', '$location', 'Users',
    'Authentication','Organizations','Notify',
    function($scope, $http, $location, Users, Authentication, Organizations, Notify) {
        $scope.user = Authentication.user;
        $scope.organization = new Organizations(Authentication.user.organization);

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

        $scope.updateOrganization = function(){
            if ($scope.orgForm.$valid){
                $scope.organization.$update(function(response){
                    $scope.organization = response;
                    Notify.alert('Organization Saved Successfully', {status: 'success'});
                }, function(response){
                    Notify.alert(response.data.message, {status: 'danger'});
                });
            }
        }
    }
]);