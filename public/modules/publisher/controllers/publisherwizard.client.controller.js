/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('PublisherWizardController', ['$scope',
    '$stateParams',
    '$location',
    '$q',
    'Authentication',
    'Publisher',
    'Advertiser',
    'getCliqueTree',
    'FileUploader',
    'BID_FLOOR_SETTINGS',
    'PUBLISHER_TOOLTIPS',
    'REGEXES',
    'CREATIVE_SIZES',
    'OPENRTB',
	function($scope, $stateParams, $location, $q, Authentication, Publisher, Advertiser, getCliqueTree, FileUploader, BID_FLOOR_SETTINGS, PUBLISHER_TOOLTIPS, REGEXES, CREATIVE_SIZES, OPENRTB) {

        //##################################//
        //###### INIT SCOPE VARIABLES ######//
        //##################################//

        $scope.authentication = Authentication;
        $scope.TOOLTIPS = PUBLISHER_TOOLTIPS;
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

        $scope.uploader = new FileUploader({
            url: 'logos'
        });

        // Set mins & maxes
        $scope.min_base_bid = BID_FLOOR_SETTINGS.min_bid_floor;
        $scope.max_base_bid = BID_FLOOR_SETTINGS.max_bid_floor;
        $scope.publisher = {
            name: '',
            website: '',
            description: '',
            logo: null
        };
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

        $scope.sameAsPub = {
            name: false,
            domain_name: false
        };

        /**
         * Method called to submit Publisher to API
         * @returns {boolean}
         */
        $scope.createPublisher = function() {
            if (this.publisherForm.$valid) {
                $scope.loading = true;
                var site = this.site;
                if (this.sameAsPub.name){
                    site.name = this.publisher.name;
                }
                if (this.sameAsPub.domain_name){
                    site.domain_name = this.publisher.website;
                }
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
                var publisher = new Publisher({
                    name:           this.publisher.name,
                    description:    this.publisher.description,
                    website:        'http://' + this.publisher.website,
                    logo:           this.publisher.logo,
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