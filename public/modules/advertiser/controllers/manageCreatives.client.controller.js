/* global _, angular, moment */
'use strict';

angular.module('advertiser').controller('manageCreativesController', [
    '$scope',
    'campaign',
    'Advertiser',
    'CreativeActivator',
    'CreativeRemover',
    'AdvertiserUtils',
    'FileUploader',
    'ngDialog',
    'Notify',
    '$timeout',
    '$q',
    'NATIVE_SPECS',
    'COLOR_GRADIENTS',
    function($scope, campaign, Advertiser, CreativeActivator,CreativeRemover,AdvertiserUtils,FileUploader,
             ngDialog, Notify, $timeout, $q, NATIVE_SPECS, COLOR_GRADIENTS){

        $scope.NATIVE_SPECS = NATIVE_SPECS;

        /**
         * Get Campaigns from URL state params on load
         */
        $scope.advertiser = campaign.advertiser;
        $scope.campaignIndex = campaign.index;
        $scope.campaign = campaign.campaign;

        // ####################################################################### //
        // ############################## GLOBAL HELPERS ######################### //
        // ####################################################################### //

        /**
         * Helper function to generate dimension string
         * @param crg
         * @returns {string}
         */
        $scope.getCreativeGroupDims = function(crg){
            var s;
            if (crg.type === 'native'){
                s = "Native";
            } else {
                s = [crg.w, crg.h].join('x');
            }
            return s;
        };

        /**
         * Almost trivial wrapper for scope.advertiser.$update that just ensures campaign
         * is reset properly in scope when advertiser is updated, and sets scope.saveerror if error
         * is thrown.
         */
        $scope.update = function(success, error){
            this.advertiser.$update(function(response){
                $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
                // Reset creative weights
                $scope._onAdvertiserLoad();
                if (success) success(response);
            },function(errorResponse){
                if (error) error(errorResponse);
                $scope.saveerror = errorResponse.data.message;
            });
        };

        /**
         * Set initial creative weights object for easy retrieval of initial state for comparison,
         * and create series object for creative probability graph.
         *
         * Also set select.count variable, which contains the total # of creatives
         */
        $scope._onAdvertiserLoad = function(){
            // var to store number of total creatives. Since creatives are nested in creativegroups, not as easy
            // as just taking a single array length
            $scope.creativesCount = 0;
            $scope.creativeWeights = {};
            var creativeWeightSeries = {};
            $scope.campaign.creativegroups.forEach(function(crg){
                // counter variable to select color
                $scope.creativeWeights[crg._id] = {};
                var i = 1;
                var size = $scope.getCreativeGroupDims(crg);
                creativeWeightSeries[size] = [];
                crg.creatives.forEach(function(cr){
                    $scope.creativeWeights[crg._id][cr._id] = cr.weight;
                    if (cr.active) {
                        creativeWeightSeries[size].push({
                            "label": cr.name,
                            "data": cr.weight,
                            "color": COLOR_GRADIENTS.green10[i % COLOR_GRADIENTS.green10.length]
                        });
                        i++;
                    }
                    // increment creativeCount
                    $scope.creativesCount++;
                });
            });

            // loop over weight Series again to normalize
            var normalize = function(sum){
                return function(point){
                    point.data = point.data / sum;
                    return point;
                };
            };

            for (var k in creativeWeightSeries){
                if (creativeWeightSeries.hasOwnProperty(k)){
                    var sum = _.sum(_.map(creativeWeightSeries[k], function(e){ return e.data;}));
                    creativeWeightSeries[k] = _.map(creativeWeightSeries[k], normalize(sum));
                }
            }
            $scope.creativeWeightSeries = creativeWeightSeries;
        };

        // init on first load
        $scope._onAdvertiserLoad();



        // ####################################################################### //
        // ############################## DIALOG BOXES ########################### //
        // ####################################################################### //

        /**
         * Creative preview dialog
         * @param creative
         */
        $scope.creativePreview = function(creative){
            var dialogClass = 'dialogwidth800';
            if (creative.w >= 800) {
                dialogClass = 'dialogwidth1000';
            }
            ngDialog.open({
                className: 'ngdialog-theme-default ' + dialogClass,
                template: 'modules/advertiser/views/partials/creative-preview.html',
                controller: 'creativePreviewController',
                data: {creative: creative, advertiser: $scope.advertiser, campaign: $scope.campaign}
            });
        };

        /**
         * New creatives dialog
         */
        $scope.addNewCreatives = function(){
            var dialog = ngDialog.open({
                className: 'ngdialog-theme-default dialogwidth1200',
                template: 'modules/advertiser/views/partials/upload-creatives.html',
                controller: 'uploadCreativesController',
                data: {advertiser: $scope.advertiser, campaign: $scope.campaign}
            });
            dialog.closePromise.then(function(data){
                if (data.value === "Success"){
                    $timeout(function(){
                        $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
                        $scope._onAdvertiserLoad();
                    },100);
                }
            });
        };

        // ####################################################################### //
        // #################### CREATIVES TABLE VARS & METHODS ################### //
        // ####################################################################### //

        // Table variables
        $scope.sortType = ["-active","-weight"];

        /**
         * Short helper function to manage sortType array logic.
         * Cycles through "ascending" > "descending" > "none" sort cycle
         * for a given field.
         */
        $scope.sortBy = function(field){
            var arrIndex = $scope.sortType.indexOf(field);
            var reverseIndex = $scope.sortType.indexOf('-'+field);
            if (arrIndex > -1){
                // reverse it
                $scope.sortType[arrIndex] = '-'+field;
            } else if (reverseIndex > -1){
                // get rid of it
                $scope.sortType.splice(reverseIndex,1);
            } else {
                // add it
                $scope.sortType.push(field);
            }
        };

        /**
         * Helper function to determine whether to show/hide sort icons
         * @param field
         * @param reverse
         * @returns {boolean}
         */
        $scope.isSortedBy = function(field, reverse){
            var isSorted = $scope.sortType.indexOf(field) > -1;
            var isSortedReverse = $scope.sortType.indexOf('-' + field) > -1;
            return reverse ? isSortedReverse : isSorted;
        };


        // ####################################################################### //
        // #################### PIE CHART OPTIONS & FUNCTIONS #################### //
        // ####################################################################### //

        $scope.graphOptions = {
            series: {
                pie: {
                    show: true,
                    innerRadius: 0.2,
                    radius: 1,
                    label: {
                        show: true,
                        formatter: function (label, series) {
                            return '<div class="flot-pie-label">' +
                                Math.round(series.percent) +
                                '%</div>';
                        },
                        background: {
                            opacity: 0.8,
                            color: '#222'
                        }
                    },
                }
            },  
            grid: {
                hoverable: true
            },
            tooltip: true,
            tooltipOpts: {
                content: function(label, v){
                    return label + '\n' + v.toFixed(2) + '%';
                }
            },
            legend: {
                show: false
            }
        };


        // ####################################################################### //
        // #################### WEIGHT SLIDER CONTROL FUNCTIONS ################## //
        // ####################################################################### //

        /**
         * Sets "dirty" on creative to true when slider is changed, but have to search for it by ID.
         * @param id
         */
        $scope.onCreativeWeightChange = function(id){
            var ids = id.split(',');
            var crgid = ids[0];
            var cid = ids[1];
            var creativeGroup = _.find($scope.campaign.creativegroups, function(c){ return c._id === crgid; });
            var creative = _.find(creativeGroup.creatives, function(c){ return c._id === cid; });
            creative.dirty = true;
        };

        /**
         * Handler for "update" button on slider.
         * @param creativeGroup
         * @param creative
         */
        $scope.updateCreative = function(creativeGroup, creative){
            creative.weight = $scope.creativeWeights[creativeGroup._id][creative._id];
            $scope.update(function(response){
                creative.dirty = false;
            }, function(errorResponse){
                creative.dirty = false;
                $scope.creativeWeights[creativeGroup._id][creative._id] = creative.weight;
            });
        };

        // ####################################################################### //
        // #################### SELECT MULTIPLE VARS & WATCHERS ################## //
        // ####################################################################### //

        $scope.select = {
            selectAll: false,
            selectAny: false,
            count: 0
        };

        /**
         * Watcher to set select control variables based on how many / which creatives
         * currently selected
         */
        $scope.$watch('campaign.creativegroups', function(newVal, oldVal){
            if (newVal !== oldVal){
                var creatives = [];
                newVal.forEach(function(crg){
                   creatives = creatives.concat(_.map(crg.creatives, function(cr){ return cr.selected; }));
                });
                $scope.select.count = creatives.filter(function(cr){
                    return cr;
                }).length;
                $scope.select.selectAny = _.some(creatives);
            }
        }, true);

        $scope.$watch('select.selectAll', function(newVal, oldVal){
            if (oldVal !== newVal){
                $scope.campaign.creativegroups.forEach(function(crg){
                    crg.creatives.forEach(function(cr){
                        cr.selected = newVal;
                    });
                });
            }
        });


        // ####################################################################### //
        // ################# BULK & INDIVIDUAL ACTIONS CONTROLS ################## //
        // ####################################################################### //

        /**
         * Bulk deactivate creatives. Calls activate endpoint serially for each creative,
         * so not super performant for now. Could use a bulk API endpoint.
         */
        $scope.deactivateBulk = function(){
            var promises = [];
            var after = [];
            $scope.campaign.creativegroups.forEach(function(crg) {
                crg.creatives.forEach(function (cr) {
                    if (cr.selected && cr.active){
                        promises.push(CreativeActivator.deactivate({
                            advertiserId: $scope.advertiser._id,
                            campaignId: $scope.campaign._id,
                            creativeGroupId: crg._id,
                            creativeId: cr._id
                        }));
                        after.push(function(){
                            cr.active = false;
                            cr.selected = false;
                            $scope.select.selectAll = false;
                            $scope.onDeactivate(null, cr);
                        });
                    } else if (cr.selected){
                        after.push(function(){
                            cr.selected = false;
                        });
                    }
                });
            });
            $q.all(promises).then(function(){
                Notify.alert('Creatives successfully deactivated.', {status: 'success'});
                after.forEach(function(f){
                    f.call(this);
                });
                $scope._onAdvertiserLoad();
            }, function(error){
                Notify.alert('Error deactivating creatives: ' + error.message, {status: 'danger'});
            });
        };

        /**
         * Bulk activate creatives. Calls activate endpoint serially for each creative,
         * so not super performant for now. Could use a bulk API endpoint.
         */
        $scope.activateBulk = function(){
            var promises = [];
            var after = [];
            $scope.campaign.creativegroups.forEach(function(crg) {
                crg.creatives.forEach(function (cr) {
                    if (cr.selected && !cr.active){
                        promises.push(CreativeActivator.activate({
                            advertiserId: $scope.advertiser._id,
                            campaignId: $scope.campaign._id,
                            creativeGroupId: crg._id,
                            creativeId: cr._id
                        }));
                        after.push(function(){
                            cr.active = true;
                            cr.selected = false;
                            $scope.select.selectAll = false;
                            $scope.onActivate(null, cr);
                        });
                    } else if (cr.selected){
                        after.push(function(){
                            cr.selected = false;
                        });
                    }

                });
            });
            $q.all(promises).then(function(){
                Notify.alert('Creatives successfully activated.', {status: 'success'});
                after.forEach(function(f){
                    f.call(this);
                });
                $scope._onAdvertiserLoad();
            }, function(error){
                Notify.alert('Error activating creatives: ' + error.message, {status: 'danger'});
            });
        };

        /**
         * Callback passed to creative status switch onActivate param
         * @param err
         * @param creative
         */
        $scope.onActivate = function(err, creative){
            if (!err){
                creative.sliderOptions.disabled = false;
                creative.sliderOptions.hidePointerLabels = false;
            }
        };

        /**
        * Callback passed to creative status switch onDeactivate param
        * @param err
        * @param creative
        */
        $scope.onDeactivate = function(err, creative){
            if (!err){
                creative.sliderOptions.disabled = true;
                creative.sliderOptions.hidePointerLabels = true;
            }
        };

        /**
         * Handler for remove button. Removes creative, and removes creative group if
         * removing creatives results in an empty creative group.
         *
         * Also shows "are you sure" dialog for user to confirm.
         *
         * @param creativegroup
         * @param creative
         * @param selected
         */
        $scope.remove = function(creativegroup, creative){
            ngDialog.openConfirm({
                template:'\
                            <p>Are you sure you want to delete this creative? This cannot be undone.</p>\
                            <div class="ngdialog-buttons">\
                                <button type="button" class="ngdialog-button ngdialog-button-secondary" ng-click="closeThisDialog(0)">No</button>\
                                <button type="button" class="ngdialog-button ngdialog-button-primary" ng-click="confirm(1)">Yes</button>\
                        </div>',
                plain: true
            }).then(function(val){
                if (val === 1){
                    CreativeRemover.remove({
                        advertiserId: $scope.advertiser._id,
                        campaignId: $scope.campaign._id,
                        creativeGroupId: creativegroup._id,
                        creativeId: creative._id
                    }).then(function(response){
                        // response is updated Advertiser object, so have to refresh $scope.advertiser
                        // and all other related variables
                        $scope.advertiser = new Advertiser(response.data);
                        $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
                        $scope._onAdvertiserLoad();
                        Notify.alert('Creative successfully deleted.', {status: 'success'});
                    }, function(error){
                        Notify.alert('Error removing creative: ' + error.message, {status: 'danger'});
                    });
                }
            });
        };

        /**
         * Handler for removing creatives in selection, calls different endpoint for bulk removal.
         */
        $scope.removeSelected = function(){
            var selectedCount = $scope.select.count;
            ngDialog.openConfirm({
                template:'\
                            <p>Are you sure you want to delete these ' + selectedCount + ' creative(s)?</p>\
                            <p>This <strong>cannot</strong> be undone. We hope you know what you\'re doing!</p>\
                            <div class="ngdialog-buttons">\
                                <button type="button" class="ngdialog-button ngdialog-button-secondary" ng-click="closeThisDialog(0)">No</button>\
                                <button type="button" class="ngdialog-button ngdialog-button-primary" ng-click="confirm(1)">Yes</button>\
                        </div>',
                plain: true
            }).then(function(val) {
                if (val === 1) {
                    var creatives = [];
                    // find selected creatives and add ID's to array to pass to request body
                    $scope.campaign.creativegroups.forEach(function(crg){
                        crg.creatives.forEach(function(cr){
                            if (cr.selected){
                                // remove from creative document array
                                creatives.push(cr._id);
                            }
                        });
                    });
                    CreativeRemover.removeMany({
                        advertiserId: $scope.advertiser._id,
                        campaignId: $scope.campaign._id,
                        creatives: creatives
                    }).then(function(response){
                        // response is updated Advertiser object, so have to refresh $scope.advertiser
                        // and all other related variables
                        $scope.advertiser = new Advertiser(response.data);
                        $scope.campaign = $scope.advertiser.campaigns[$scope.campaignIndex];
                        $scope._onAdvertiserLoad();
                        Notify.alert(selectedCount + ' creatives successfully removed.', {status: 'success'});
                    }, function(error){
                        Notify.alert('Error removing creatives: ' + error.message, {status: 'danger'});
                    });
                }
            });
        };
    }]);
