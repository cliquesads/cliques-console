'use strict';

//Articles service used for communicating with the articles REST endpoints
angular.module('geo').factory('DMA', ['$resource',
	function($resource) {
		return $resource('dma/:dmaId', { dmaId: '@_id'},
            {}
        );
	}
]);