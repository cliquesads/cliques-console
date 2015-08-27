'use strict';

angular.module('publisher').controller('PublisherWizardController', ['$scope',
    '$stateParams',
    '$location',
    '$q',
    'Authentication',
    'Publisher',
    'Advertiser',
    'getCliqueTree',
    'BID_FLOOR_SETTINGS',
    'TOOLTIPS',
    'REGEXES',
	function($scope, $stateParams, $location, $q, Authentication, Publisher, Advertiser, getCliqueTree, BID_FLOOR_SETTINGS, TOOLTIPS, REGEXES) {

        //##################################//
        //###### INIT SCOPE VARIABLES ######//
        //##################################//

        $scope.authentication = Authentication;
        $scope.TOOLTIPS = TOOLTIPS;
        // something weird about storing regexes as scope vars, they don't bind
        // to the template properly to have to convert to string
        $scope.domain_regex = String(REGEXES.domain);

        // Populate tree data for tree visualization
        $scope.cliques = [];
        getCliqueTree($scope);
        $scope.set_clique = function(branch) {
            $scope.site.clique = branch.label;
        };
        var tree;
        // This is our API control variable
        $scope.my_tree = tree = {};

        // Set mins & maxes
        $scope.min_base_bid = BID_FLOOR_SETTINGS.min_bid_floor;
        $scope.max_base_bid = BID_FLOOR_SETTINGS.max_bid_floor;

        $scope.site = {
            name:           null,
            description:    null,
            bid_floor:      null,
            domain_name:    null,
            clique:         null,
            blacklist:      []
        };

        /**
         * Method called to submit Publisher to API
         * @returns {boolean}
         */
        $scope.create = function() {
            if (this.publisherForm.$valid) {
                $scope.loading = true;
                // Construct publisher JSON to POST to API
                //var creatives = PublisherUtils.getCreativesFromUploadQueue(uploader);
                //var creativegroups = PublisherUtils.groupCreatives(creatives, $scope.site.name);
                // now create new publisher object
                var site = this.site;

                var publisher = new Publisher({
                    name:           this.name,
                    description:    this.description,
                    website:        this.website,
                    sites: [site]
                });
                publisher.$create(function(response){
                    $scope.loading = false;
                    $scope.name = '';
                    $scope.description= '';
                    $scope.site = '';
                    $scope.cliques = '';
                    $scope.website = '';
                    //On success, redirect to publisher detail page
                    var publisherId = response._id;
                    $location.url('/publisher/' + publisherId);
                }, function (errorResponse) {
                    $scope.loading = false;
                    $scope.creation_error = errorResponse.data.message;
                });
            } else {
                return false;
            }
        };

        $scope.validateInput = function(name, type) {
            var input = this.publisherForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };
	}
]);