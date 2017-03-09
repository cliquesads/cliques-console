angular.module('screenshot').directive('scrollToBottom', ['$window',
	function($window) {
		'use strict';
		return {
			restrict: 'A',
			scope: {
				method: '&scrollToBottom'
			},
			link: function(scope, elem, attrs) {
				angular.element($window).bind("scroll", function() {
					var windowHeight = "innerHeight" in window ? window.innerHeight : document.documentElement.offsetHeight;
					var body = document.body, html = document.documentElement;
					var docHeight = Math.max(body.scrollHeight,
					body.offsetHeight, html.clientHeight,html.scrollHeight, html.offsetHeight);
					var windowBottom = windowHeight + window.pageYOffset;
					if (windowBottom >= docHeight) {
						scope.$apply(scope.method());
					}
				});
			}
		};
	}
]);