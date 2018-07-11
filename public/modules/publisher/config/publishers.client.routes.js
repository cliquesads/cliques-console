'use strict';

/**
 * Isolated logic behind site routes in which a user must be prompted
 * to select an publisher first. Logical switch to direct user to appropriate
 * view depending on if they have set up  publishers/sites already.
 *
 * Passes inferred publisherId, if one is found, to callback function, otherwise
 * passes null.
 */
var getImpliedPublisherId = function($state, $rootScope, $location, Publisher, callback) {
    if ($rootScope.publisher) {
        return callback(null, $rootScope.publisher._id);
    } else {
        Publisher.query(function(publishers) {
            // if user only has one publisher available, 
            // just set that publisher as default in $rootScope 
            // and go to that publisher's page
            if (publishers.length === 1) {
                $rootScope.publisher = publishers[0];
                return callback(null, $rootScope.publisher._id);
            } else {
                // Otherwise, either user has NOT selected a publisher yet,
                // or user doesn't have a publisher
                return callback(null, null);
            }
        }, function(err) {
            return callback(err); 
        });
    }
};

// Setting up route
angular.module('publisher').config(['$stateProvider',
	function($stateProvider) {
		// Publisher state routing
		$stateProvider.
        state('app.publisher', {
            title: 'Publisher',
            abstract: true,
            templateUrl: 'modules/publisher/views/publisher-layout.client.view.html'
        }).
        state('app.publisher.createPublisher', {
            url: '/publisher/create',
            resolve: {
                $title: function() { return 'New Publisher'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/publisher/views/create-publisher.client.view.html',
                    controller: 'PublisherWizardController'
                },
                'titleBar': {
                    template: 'New Publisher'
                }
            }
        }).
		state('app.publisher.allSites', {
			url: '/all-sites',
            resolve: {
                redirect: function ($state, $rootScope, $location, Publisher) {
                    getImpliedPublisherId($state, $rootScope, $location, Publisher, function(err, publisherId) {
                        if (publisherId) {
                            // TODO: State.go just hangs, have no idea why
                            $location.path('/publisher/' + publisherId);
                        } else {
                            var nextState = '.viewPublisher';
                            event.preventDefault();
                            $state.go('app.publisher.allPublishers', {
                                next: nextState
                            });
                            $state.go('app.publisher.allPublishers');
                        }
                    });
                }
            }
		}).

        /**
         * BEGIN publisher-specific states, starting at All Publishers
         */
        state('app.publisher.allPublishers', {
            url: '/publisher?next',
            resolve: {
                $title: function() { return 'All publishers'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/publisher/views/list-publisher.client.view.html',
                    controller: 'ListPublisherController'
                },
                'titleBar': {
                    template: '<section data-ui-view="titleBar"></section>'
                }
            }
        }).
		state('app.publisher.allPublishers.viewPublisher', {
			url: '/:publisherId',
            resolve: {
                publisher: function($stateParams, Publisher){
                    return Publisher.get({ publisherId: $stateParams.publisherId }).$promise;
                },
                $title: function(publisher) { return publisher.name; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/publisher/views/view-publisher.client.view.html',
                    controller: 'PublisherController'
                },
                'titleBar': {
                    templateUrl: 'modules/publisher/views/partials/titlebar/view-publisher.titlebar.html',
                    controller: 'PublisherController'
                }
            }
		}).
        state('app.publisher.allPublishers.viewPublisher.viewSite', {
            url: '/site/:siteId',
            resolve: {
                site: function($stateParams, publisher){
                    var i = _.findIndex(publisher.sites, function(site){
                        return site._id === $stateParams.siteId;
                    });
                    return {
                        publisher: publisher,
                        index: i,
                        site: publisher.sites[i]
                    };
                },
                $title: function(site){
                    return site.site.name;
                }
            },
            views: {
                'main': {
                    templateUrl: 'modules/publisher/views/view-site.client.view.html',
                    controller: 'SiteController'
                },
                'titleBar': {
                    templateUrl: 'modules/publisher/views/partials/titlebar/view-site.titlebar.html',
                    controller: 'SiteController'
                }
            }
        }).
        state('app.publisher.allPublishers.viewPublisher.viewSite.viewPage', {
            url: '/page/:pageId',
            resolve: {
                page: function($stateParams, publisher, site){
                    var page_ind = _.findIndex(site.site.pages, function(page){
                        return page._id === $stateParams.pageId;
                    });
                    return {
                        publisher: publisher,
                        site: site.site,
                        page: site.site.pages[page_ind],
                        pageIndex: page_ind,
                        siteIndex: site.index
                    };
                },
                $title: function() { return 'Page Manager'; }
            },
            views: {
                'main': {
                    templateUrl: 'modules/publisher/views/view-page.client.view.html',
                    controller: 'PageController'
                },
                'titleBar': {
                    templateUrl: 'modules/publisher/views/partials/titlebar/view-page.titlebar.html',
                    controller: 'PageController'
                }
            }
        });
	}
]);