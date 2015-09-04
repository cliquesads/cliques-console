/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('SiteWizardController', ['$scope',
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
    'CREATIVE_SIZES',
    'OPENRTB',
	function($scope, $stateParams, $location, $q, Authentication, Publisher, Advertiser, getCliqueTree, BID_FLOOR_SETTINGS, TOOLTIPS, REGEXES, CREATIVE_SIZES, OPENRTB) {

        //##################################//
        //###### INIT SCOPE VARIABLES ######//
        //##################################//

        $scope.authentication = Authentication;
        $scope.TOOLTIPS = TOOLTIPS;
        $scope.CREATIVE_SIZES = CREATIVE_SIZES;
        $scope.OPENRTB = OPENRTB;
        $scope.positions_object = {};
        $scope.OPENRTB.positions.forEach(function(pos){
            $scope.positions_object[pos.code] = pos.name;
        });

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
            name:           '',
            description:    '',
            bid_floor:      '',
            domain_name:    '',
            clique:         null,
            bidfloor:       null,
            blacklist:      []
        };
        $scope.page = {
            name: null,
            description: null,
            url: null,
            placements: []
        };
        /**
         * Method called to submit Publisher to API
         * @returns {boolean}
         */
        $scope.createSite = function() {
            if (this.siteForm.$valid) {
                $scope.loading = true;
                var site = this.site;
                //TODO: Set page clique to site clique for now, might want to make
                //TODO: separate option later
                this.page.clique = site.clique;
                this.page.url = 'http://' + this.page.url;
                site.pages = [this.page];
                site.pages[0].placements.forEach(function(p){
                    var dims = p.dimensions.split('x');
                    p.w = Number(dims[0]);
                    p.h = Number(dims[1]);
                });
                var advertiser = $scope.ngDialogData.advertiser;
                advertiser.sites.push(site);
                publisher.$update(function(response){
                    $scope.loading = false;
                    $scope.name = '';
                    $scope.description= '';
                    $scope.site = '';
                    $scope.cliques = '';
                    $scope.website = '';
                    //On success, redirect to publisher detail page
                    var publisherId = response._id;
                    $scope.closeThisDialog('Success');
                }, function (errorResponse) {
                    $scope.loading = false;
                    $scope.creation_error = errorResponse.data.message;
                });
            } else {
                return false;
            }
        };
	}
]);