/**
 * Created by bliang on 8/15/15.
 */
angular.module('advertiser').directive('flightDates', ['DatepickerService','$timeout', function(DatepickerService, $timeout) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            startdatemodel: '=',
            enddatemodel: '=',
            wizardstep: '@',
            width: '@'
        },
        templateUrl: 'modules/advertiser/views/partials/flight-dates.html',
        link: function(scope, element, attrs){
            //TODO: FIX DATE VALIDATION HERE
            scope.calendar = DatepickerService;

            //################################################//
            //######### BEGIN Horrible Parsley Hack ##########//
            //################################################//

            // Here's the deal: Can't get parsley to bind to date inputs using parsley element attributes
            // no matter how hard I try. Something with the Datepicker completely fucks with Parsley
            // and won't let it bind properly to any fields with Datepicker directive. So instead, have to
            // manually destroy, then re-initialize Parsley instance to each input and validate

            // Date helper functions for validators
            function getMidnight(date){
                return new Date(date.getFullYear(), date.getMonth(), date.getDate(),0,0,0);
            }
            function parseFormattedDate(input){
                var parts = input.split('-');
                return new Date(parts[0], parts[1]-1, parts[2]);
            }

            // On change, set end date time to 23:59:59. Currently don't allow
            // user to set specific end-time, so only set to end of day UTC so
            // it will run for a full UTC day.
            //
            // NOTE: This will appear to set model to 23:59:59 in CLIENT's TZ. However, the date
            // that gets sent to the server & stored in the DB is a naive "yyyy-mm-dd 23:59:59",
            // which will be interpreted as 23:59:59 UTC.
            scope.$watch('enddatemodel', function(newDate, oldDate){
                // DatePicker will set coerce model to & from a String when it initially loads,
                // only converting to Date when it is changed. So have to check if it's not a string
                // before trying to set hours & minutes.
                if (newDate !== oldDate && typeof newDate === 'object'){
                    newDate.setHours(23);
                    newDate.setMinutes(59);
                    newDate.setSeconds(59);
                }
            });

            // Now attach custom validators to Parsley
            window.ParsleyValidator
                .addValidator('gttoday', function (value) {
                    var date = getMidnight(parseFormattedDate(value)),
                        today = getMidnight(new Date());
                    return date >= today;
                }, 32)
                .addMessage('en', 'gttoday', 'This date cannot be in the past')

                // gtstart validator is hooked to scope.startdatemodel
                .addValidator('gtstart', function (value) {
                    var timestamp = getMidnight(parseFormattedDate(value)),
                        minTs = getMidnight(new Date(scope.startdatemodel));
                    return timestamp >= minTs;
                }, 32)
                    .addMessage('en', 'gtstart', 'End date must be on or after start date');

            // Finally, destroy existing Parsley instances bound to inputs and
            // re-bind new parsley instances with custom validators
            var startOptions = {gttoday: ""};
            var endOptions = { gtstart: "" };
            if (scope.wizardstep){
                startOptions.group = scope.wizardstep;
                endOptions.group = scope.wizardstep;
            }
            // Destroy old instances
            $('#start_date').parsley().destroy();
            $('#end_date').parsley().destroy();
            // Bind new ones
            $('#start_date').parsley(startOptions);
            $('#end_date').parsley(endOptions);
        }
    };
}]);
