/* global _, angular, moment, user, deploymentMode */
'use strict';

angular.module('publisher').controller('SiteWizardController', ['$scope',
    '$stateParams',
    '$location',
    '$q',
    '$analytics',
    'Authentication',
    'Publisher',
    'Advertiser',
    'getCliqueTree',
    'BID_FLOOR_SETTINGS',
    'PUBLISHER_TOOLTIPS',
    'REGEXES',
    'CREATIVE_SIZES',
    'OPENRTB',
    'FIRST_PARTY_CLIQUE_ID',
	'ROOT_CLIQUE_ID',
	function($scope, $stateParams, $location, $q, $analytics, Authentication, Publisher, Advertiser, getCliqueTree,
             BID_FLOOR_SETTINGS, PUBLISHER_TOOLTIPS, REGEXES, CREATIVE_SIZES, OPENRTB, FIRST_PARTY_CLIQUE_ID,
             ROOT_CLIQUE_ID) {

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
        $scope.newSiteKeywords = [];

        // something weird about storing regexes as scope vars, they don't bind
        // to the template properly to have to convert to string
        $scope.domain_regex = String(REGEXES.domain);

        $analytics.eventTrack('SiteSetup_Step1');

        // Set mins & maxes
        $scope.min_base_bid = BID_FLOOR_SETTINGS.min_bid_floor;
        $scope.max_base_bid = BID_FLOOR_SETTINGS.max_bid_floor;
        $scope.site = {
            name:           '',
            description:    '',
            bid_floor:      '',
            domain_name:    '',
            // TODO: resolve deploymentMode differences
            clique:         deploymentMode === "contentNetwork" ? FIRST_PARTY_CLIQUE_ID: ROOT_CLIQUE_ID,
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
                    switch (p.type){
                        case "native":
                            p.defaultType = 'hide';
                            p.native = {};
                            p.w = 1;
                            p.h = 1;
                            break;
                        case "multiPaneNative":
                            p.defaultType = 'hide';
                            p.multiPaneNative = { pane: { desktop: {}, mobile: {}}, wrapper: {}};
                            p.w = 1;
                            p.h = 1;
                            break;
                        default:
                            var dims = p.dimensions.split('x');
                            p.w = Number(dims[0]);
                            p.h = Number(dims[1]);
                    }
                });
                var publisher = $scope.ngDialogData.publisher;
                publisher.sites.push(site);
                publisher.$update(function(response){
                    $scope.loading = false;
                    $scope.name = '';
                    $scope.description= '';
                    $scope.site = '';
                    $scope.cliques = '';
                    $scope.website = '';
                    //On success, redirect to publisher detail page
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
