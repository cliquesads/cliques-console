angular.module('advertiser').directive('siteTree', [function() {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            sites: '=',
            campaign: '='
        },
        templateUrl: 'modules/advertiser/views/partials/site-tree.html',
        link: function (scope, element, attrs) {
            // templateStr passed to IVH node template directive in tree rendering
            scope.templateStr = '<img src="{{ node.logo_secure_url }}"/> {{ trvw.label(node) }}';

            /**
             * Lightweight class just to handle some gruntwork involved in management of
             * client-side site tree object.
             *
             * @param node
             * @param type
             * @param parent
             * @constructor
             */
            var SiteTreeNode = function(node, type, parent){
                this.value      = node._id;
                this.weight     = 1;
                this.nodeType   = type;

                // hacks to sneak bid variables into transcluded scope of node template in site-tree.html
                this.base_bid   = scope.campaign.base_bid;
                this.max_bid    = scope.campaign.max_bid;
                this.Math       = Math;

                this.override   = false;
                if (type === 'site'){
                    this.logo_secure_url = node.logo_secure_url;
                    this.url             = 'http://' + node.domain_name;
                    this.label           = node.name + ' (' + node.pages.length + ' Page' + (node.pages.length != 1 ? 's': '') +')';
                    this.children        = [];
                } else if (type === 'page'){
                    this.label = node.name + ' (' + node.placements.length + ' Placement' + (node.placements.length != 1 ? 's': '') +')';
                    this.url   = node.url;
                    this.children = [];
                } else if (type === 'placement'){
                    this.label = node.name;
                    this.override = true;
                }
            };
            SiteTreeNode.prototype._overrideChildWeights = function(){
                var self = this;
                if (self.nodeType === 'site'){
                    self.children.forEach(function(page){
                        page.weight     = self.weight;
                        page._overrideChildWeights();
                    });
                } else if (self.nodeType === 'page'){
                    self.children.forEach(function(placement){
                        placement.weight    = self.weight;
                    });
                }
            };

            /**
             * Pseudo-recursive function to translate SiteTreeNode into
             * weight targeting schema for persistance to Mongo
             */
            SiteTreeNode.prototype.toWeightTargetSchema = function(){
                var self = this;
                // only return if node is placement, currently don't do targeting
                // at higher levels
                if (self.nodeType === 'placement'){
                    if (self.selected){
                        return {
                            target: self.value,
                            weight: self.weight
                        }
                    }
                }
                // pseudo-recursive steps
                // get child targeting schemas for pages & placements & return array of them
                if (self.nodeType === 'page'){
                    var targets = [];
                    self.children.forEach(function(placement){
                        var schema = placement.toWeightTargetSchema();
                        if (schema){
                            targets.push(schema);
                        }
                    });
                    return targets;
                }
                if (self.nodeType === 'site'){
                    var all_targets = [];
                    self.children.forEach(function(page){
                        all_targets = all_targets.concat(page.toWeightTargetSchema());
                    });
                    return all_targets;
                }
            };

            SiteTreeNode.prototype.applyPresetTargets = function(targets){
                var self = this;
                if (targets){
                    if (self.nodeType === 'placement'){
                        var target = targets.filter(function(t){ return t.target === self.value })[0];
                        if (target){
                            self.weight = target.weight;
                            self.selected = true;
                        }
                    }
                    // recursive step
                    // go down to child placements & apply targets, then set selected,
                    // expanded & indeterminate properties on the way back up
                    if (self.nodeType === 'page' || self.nodeType === 'site'){
                        self.children.forEach(function(child){
                            child.applyPresetTargets(targets);
                        });
                        if (_.every(self.children, 'selected', true)){
                            self.expandMe  = true;
                            self.selected = true;
                        } else if (_.some(self.children, 'selected') || _.some(self.children, '__ivhTreeviewIndeterminate')){
                            self.expandMe = true;
                            self.__ivhTreeviewIndeterminate = true;
                        }
                    }
                }
            };

            /**
             * This watcher just handles updating of site data from parent scope
             */
            scope.$watch(function(scope){ return scope.sites; }, function(newSites, oldSites){
                var treedata = [];
                // Loop through sites array and format for ivh-treeview (label, value, children)
                if (newSites){
                    newSites.forEach(function(site){
                        var leaf = new SiteTreeNode(site, 'site');
                        site.pages.forEach(function(page){
                            var page_leaf = new SiteTreeNode(page, 'page');
                            page.placements.forEach(function(placement){
                                var placement_node = new SiteTreeNode(placement, 'placement');
                                page_leaf.children.push(placement_node);
                            });
                            leaf.children.push(page_leaf);
                        });
                        // apply targets here
                        leaf.applyPresetTargets(scope.campaign.placement_targets);
                        treedata.push(leaf);
                    });
                    scope.siteTree = treedata;
                }
            });

            function allWeightsEqual(nodesArray){
                var equal = true;
                var weight = nodesArray[0].weight;
                nodesArray.forEach(function(node){
                   equal = weight === node.weight;
                });
                return equal;
            }
            /**
             * This scope watch handles overriding of child entity weights when parent is
             * changed.
             *
             * TODO: This is hacky and terrible, and probably causes performance problems.
             * TODO: Would be much cleaner to have individual event emitters tied to each SiteTreeNode
             * TODO: instance, but couldn't figure out an easy way to do that.
             */
            scope.$watch(function(scope){ return scope.siteTree; }, function(newSiteTree, oldSiteTree){
                if (newSiteTree && oldSiteTree){
                    for (var i=0; i < newSiteTree.length; i++){
                        var newSite = newSiteTree[i];
                        var oldSite = oldSiteTree ? oldSiteTree[i] : {};
                        // If all child nodes have equal weighting, override is on
                        newSite.override = allWeightsEqual(newSite.children);
                        if (newSite.weight != oldSite.weight){
                            newSite.override = true;
                            newSite._overrideChildWeights();
                        }
                        for (var j=0; j < newSite.children.length; j++){
                            var newPage = newSite.children[j];
                            var oldPage = oldSite.children ? oldSite.children[j] : {};
                            // If all child nodes have equal weighting, override is on
                            newPage.override = allWeightsEqual(newPage.children);
                            if (newPage.weight != oldPage.weight){
                                newPage.override = true;
                                newPage._overrideChildWeights();
                            }
                        }
                    }

                    // Now update targets in scope with new placement targets
                    var targets = [];
                    newSiteTree.forEach(function(tree){
                        targets = targets.concat(tree.toWeightTargetSchema());
                    });
                    scope.campaign.placement_targets = targets;
                }
            }, true);
        }
    };
}]);