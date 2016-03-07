angular.module('users').controller('OrganizationController', ['$scope', '$http', '$location', 'Users', 'Authentication',
    function($scope, $http, $location, Users, Authentication) {
        $scope.user = Authentication.user;

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
    }
]);