angular.module('publisher').directive('siteTree', ['getSitesInCliqueTree', function(getSitesInCliqueTree) {
    'use strict';
    return {
        restrict: 'E',
        scope: {
            sites: '='
        },
        templateUrl: 'modules/publisher/views/partials/site-tree.html',
        link: function (scope, element, attrs) {
            scope.templateStr = '<img src="{{ node.logo_secure_url }}"/> {{ trvw.label(node) }}';
            scope.base_bid = 10;
            scope.max_bid = 20;
            scope.Math = Math;

            var SiteTreeNode = function(node, type, parent){
                this.value      = node._id;
                this.weight     = 1;
                this.nodeType   = type;

                // hacks to sneak bid variables into transcluded scope of node template in site-tree.html
                this.base_bid   = scope.base_bid;
                this.max_bid    = scope.max_bid;
                this.Math       = scope.Math;

                if (type === 'site'){
                    this.logo_secure_url = node.logo_secure_url;
                    this.url             = 'http://' + node.domain_name;
                    this.label           = node.name + ' (' + node.pages.length + ' Page' + (node.pages.length != 1 ? 's': '') +')';
                    this.children        = [];
                } else if (type === 'page'){
                    this.label = node.name + ' (' + node.placements.length + ' Placement' + (node.placements.length != 1 ? 's': '') +')';
                    this.url   = node.url;
                    this.children = [];
                    this.parent = parent;
                } else if (type === 'placement'){
                    this.label = node.name;
                    this.parent = parent;
                }
            };

            SiteTreeNode.prototype._overrideChildWeights = function(){
                var self = this;
                if (self.nodeType === 'site'){
                    self.children.forEach(function(page){
                        page.weight = self.weight;
                        page._overrideChildWeights();
                    });
                } else if (self.nodeType === 'page'){
                    self.children.forEach(function(placement){
                        placement.weight = self.weight;
                    });
                }
            };

            scope.$watch(function(scope){ return scope.sites; }, function(newSites, oldSites){
                var treedata = [];
                // Loop through sites array and format for ivh-treeview (label, value, children)
                newSites.forEach(function(site){
                    var leaf = new SiteTreeNode(site, 'site');
                    site.pages.forEach(function(page){
                        var page_leaf = new SiteTreeNode(page, 'page', site);
                        page.placements.forEach(function(placement){
                            var placement_node = new SiteTreeNode(placement, 'placement', page);
                            page_leaf.children.push(placement_node);
                        });
                        leaf.children.push(page_leaf);
                    });
                    treedata.push(leaf);
                });
                scope.siteTree = treedata;
            });

            scope.$watch(function(scope){ return scope.siteTree; }, function(newSiteTree, oldSiteTree){
                for (var i=0; i < newSiteTree.length; i++){
                    var newSite = newSiteTree[i];
                    var oldSite = oldSiteTree[i];
                    if (newSite.weight != oldSite.weight){
                        newSite._overrideChildWeights();
                    }
                    for (var j=0; j < newSite.children.length; j++){
                        var newPage = newSite.children[j];
                        var oldPage = oldSite.children[j];
                        if (newPage.weight != oldPage.weight){
                            newPage._overrideChildWeights();
                        }
                    }
                }
            }, true);
        }
    };
}]);