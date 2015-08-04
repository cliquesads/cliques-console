'use strict';

angular.module('users').factory('Timezones',
    function(){
        // TODO: get this from model enum
        return [
            {value: 'America/Los_Angeles', name: 'US - Pacific Time'},
            {value: 'America/Denver', name: 'US - Mountain Time'},
            {value: 'America/Chicago', name: 'US - Central Time'},
            {value: 'America/New_York', name: 'US - Eastern Time'}
        ];
    }
);
