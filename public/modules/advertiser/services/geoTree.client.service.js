/* global _ */
'use strict';
angular.module('advertiser').factory('GeoTree',function(DndTreeWrapper, $TreeDnDConvert, CampaignGeo){

    /**
     * Adds custom methods & properties to tree node object.
     *
     * Wrapping in custom prototype won't work because site-tree-dnd relies
     * on certain ownProperties of node objects, so pushing these up the
     * prototype chain breaks it.  So this is sort of a hack to add methods
     * & properties directly to clones of raw node instances.
     *
     * @param node
     * @param nodeType
     * @param parentId
     * @param parentNodeWeight
     * @returns {node}
     */
    var _initializeGeoTreeNode = function(node, nodeType, parentId, parentNodeWeight) {
        // Create node clone
        var newNode = _.clone(node);

        // Add custom node properties
        newNode.parentId = parentId; // Needed for conversion to Geo Tree DND format
        newNode.nodeType = nodeType;
        // Hide slider for city node for performance tuning
        if (nodeType !== 'City') {
            newNode.__hideSlider__ = false;
        } else {
            // don't hide if a weight is already applied to this city
            newNode.__hideSlider__ = (node.weight === parentNodeWeight) || _.isNil(node.weight);
        }
        // Set initial state as overridden so that it only can be set false
        // when slider is engaged by user
        newNode.__overridden__ = true;
        if (nodeType === 'Country') {
            if (node.weight !== 1.0) {
                newNode.__overridden__ = false;
            }
        } else {
            if (node.weight !== parentNodeWeight) {
                newNode.__overridden__ = false;
            }
        }
        newNode.__lock__ = false;
        if (node.weight === 0) {
            newNode.weight = 0;
        } else {
            newNode.weight = node.weight || 1.0;
        }
        // search result flag to show the node background with a different color
        newNode.__isAncestorOfSearchResult__ = false;
        newNode.__isSearchResult__ = false;
        newNode.__searchVisibility__ = true;

        // Properties used by blocked_geos settings
        newNode.explicit = false;

        // Clear old children properties, since children will be repopulated
        // under unified param __children__ when converted into Geo Tree DND format
        if (nodeType === 'Country') {
            delete newNode.regions;
        } else if (nodeType === 'Region') {
            delete newNode.cities;
        }

        // ========= BEGIN Node Instance Methods ======== //
        newNode.overrideChildWeights = function() {
            var self = this;
            if (self.__children__) {
                if (self.nodeType === 'Country') {
                    self.__children__.forEach(function(node) {
                        node.weight = self.weight;
                        node.__overridden__ = true;
                        node.overrideChildWeights();
                    });
                } else if (self.nodeType === 'Region') {
                    self.__children__.forEach(function(node) {
                        node.__overridden__ = true;
                        node.weight = self.weight;
                    });
                }
            }
        };
        return newNode;
    };

    //====================================================//
    //=============== BEGIN GeoTree Class ===============//
    //====================================================//

    /**
     * Subclass of DndTreeWrapper with GeoTree specific methods
     *
     * @param treeData shared tree data model with tree-dnd directive.
     * @param control tree-dnd control object. Will default to base methods when bound to directive, but
     *      can pass in an object containing custom control methods.
     * @param expanding_property tree-dnd `expanding property` model
     * @param columns tree-dnd column model
     * @constructor
     */
    var GeoTree = function(treeData, control, type) {
        this.type = type;
        DndTreeWrapper.call(this, treeData, control, {}, []);   
    };
    GeoTree.prototype = Object.create(DndTreeWrapper.prototype);        

    /**
     * After a search result is found, 
     * this function goes through each node for given tree to update the node
     * visibility status, this was previously done in html template, for the 
     * sake of performance, moved into controller
     *
     */
    GeoTree.prototype.updateNodesSearchVisibility = function() {
        var self = this;
        var getVisibleStatus = function(node) {
            if (self.searchingStatus === 'FoundResult' ? (node.__isSearchResult__ || node.__isAncestorOfSearchResult__) : true) {
                return true;
            } else {
                return false;
            }
        };
        this.data.forEach(function(countryNode) {
            countryNode.__searchVisibility__ = getVisibleStatus(countryNode);
            if (countryNode.__children__) {
                countryNode.__children__.forEach(function(regionNode) {
                    regionNode.__searchVisibility__ = getVisibleStatus(regionNode);
                    if (regionNode.__children__) {
                        regionNode.__children__.forEach(function(cityNode) {
                            cityNode.__searchVisibility__ = getVisibleStatus(cityNode);
                        });
                    }
                });
            }
        });
    };

    GeoTree.prototype.addCountryNode = function(countryObj) {
        // Need to make sure the country node is NOT YET in geotree
        for (var i = 0; i < this.data.length; i ++) {
            if (this.data[i]._id === countryObj._id) {
                return this.data[i];
            }
        }
        var countryNode = _initializeGeoTreeNode(countryObj, 'Country', null);
        countryNode.__hideSlider__ = true;
        this.data.push(countryNode);
        return countryNode;
    };

    GeoTree.prototype.addRegionNode = function(regionObj, countryNode) {
        var i = 0;
        if (countryNode.__children__) {
            for (i = 0; i < countryNode.__children__.length; i ++) {
                if (countryNode.__children__[i]._id === regionObj._id) {
                    // Such region node already exists in tree data, return this existed region node
                    return countryNode.__children__[i];
                }   
            }
        }
        regionObj.weight = countryNode.weight;
        var regionNode = _initializeGeoTreeNode(regionObj, 'Region', regionObj.country, countryNode.weight);
        if (!countryNode.__children__) {
            countryNode.__children__ = [];
        }
        countryNode.__children__.push(regionNode);
        return regionNode;
    };

    /**
     * DMA nodes fall under a different tree than Regions & Cities, but for UI
     * purposes still roll up to country (USA specifically, only US has DMAs). So
     * special handler for DMAs.
     *
     * @param dmaObj
     * @param countryNode
     * @returns {*}
     */
    GeoTree.prototype.addDMANode = function(dmaObj, countryNode) {
        var i = 0;
        if (countryNode.__children__) {
            for (i = 0; i < countryNode.__children__.length; i ++) {
                if (countryNode.__children__[i]._id === dmaObj._id && countryNode.__children__[i].nodeType === 'DMA') {
                    // Such region node already exists in tree data, return this existed region node
                    return countryNode.__children__[i];
                }
            }
        }
        dmaObj.weight = countryNode.weight;
        var regionNode = _initializeGeoTreeNode(dmaObj, 'DMA', countryNode._id, countryNode.weight);
        if (!countryNode.__children__) {
            countryNode.__children__ = [];
        }
        countryNode.__children__.push(regionNode);
        return regionNode;
    };

    GeoTree.prototype.addCityNode = function(cityObj, regionNode) {
        // Make sure the city about to add is NOT YET in this region
        var i = 0;
        if (regionNode.__children__) {
            for (i = 0; i < regionNode.__children__.length; i ++) {
                if (regionNode.__children__[i]._id === cityObj._id) {
                    // Such city node already exists in tree data, return this existed city node
                    return regionNode.__children__[i];
                }
            }
        }
        cityObj.weight = regionNode.weight;
        var cityNode = _initializeGeoTreeNode(cityObj, 'City', regionNode._id, regionNode.weight);
        if (!regionNode.__children__) {
            regionNode.__children__ = [];
        }
        regionNode.__children__.push(cityNode);
        return cityNode;
    };

    GeoTree.prototype.loadRegionGeoChildren = function(regionNode) {
        var self = this;
        return CampaignGeo.getRegionCities(regionNode._id)
        .then(function(response) {
            var cities = response.data;
            var sortedCities = _.orderBy(cities, 'name', 'asc');
            regionNode.numOfCities = sortedCities.length;
            regionNode.regionNodeIcon = 'fa fa-lg fa-plus-circle';
            sortedCities.forEach(function(city) {
                self.addCityNode(city, regionNode);
            });
        });
    };

    GeoTree.prototype.loadCountryGeoChildren = function(countryNode) {
        var self = this;
        // Get all regions for this country and load them in tree
        return CampaignGeo.getGeoChildren(countryNode)
        .then(function(response) {
            var regions = response.data;
            for (var i = 0; i < regions.length; i ++) {
                var regionNode = self.addRegionNode(regions[i], countryNode);
                regionNode.__expanded__ = false;
                regionNode.regionNodeIcon = 'fa fa-lg fa-plus-circle';
            }
        });
    };

    GeoTree.prototype.searchNode = function(nodeName) {
        nodeName = _.toLower(nodeName);
        for (var i = 0; i < this.data.length; i ++) {
            // Search for country
            if (_.toLower(this.data[i].name) === nodeName) {
                this.data[i].__isSearchResult__ = true;
                this.data[i].__expanded__ = false;
                return this.data[i];
            } else if (this.data[i].__children__) {
                for (var j = 0; j < this.data[i].__children__.length; j ++) {
                    // Search for region
                    if (_.toLower(this.data[i].__children__[j].name) === nodeName) {
                        this.data[i].__children__[j].__isSearchResult__ = true; 
                        // Found region, should expand its parent country
                        this.data[i].__isAncestorOfSearchResult__ = true;
                        this.data[i].__expanded__ = true;
                        this.data[i].__children__[j].__expanded__ = false;
                        return this.data[i].__children__[j];
                    } else if (this.data[i].__children__[j].__children__) {
                        for (var k = 0; k < this.data[i].__children__[j].__children__.length; k ++) {
                            // Search for city
                            if (_.toLower(this.data[i].__children__[j].__children__[k].name) === nodeName) {
                                this.data[i].__children__[j].__children__[k].__isSearchResult__ = true; 
                                // Found city with name that matches the search keyword, should expand its parent country and parent region
                                this.data[i].__expanded__ = true;
                                this.data[i].__isAncestorOfSearchResult__ = true;
                                this.data[i].__children__[j].__expanded__ = true;
                                this.data[i].__children__[j].__isAncestorOfSearchResult__ = true;
                                return this.data[i].__children__[j].__children__[k];
                            }
                        }
                    }
                }
            }
        }
        // Search not found
        return null;
    };

    GeoTree.prototype.clearSearchResult = function() {
        var self = this;
        self.searchKeyword = '';
        self.searchingStatus = 'NotSearching';
        for (var i = 0; i < this.data.length; i ++) {
            if (this.data[i].__isSearchResult__ === true) {
                this.data[i].__isSearchResult__ = false;
                return;
            } else if (this.data[i].__children__) {
                for (var j = 0; j < this.data[i].__children__.length; j ++) {
                    if (this.data[i].__children__[j].__isSearchResult__ === true) {
                        this.data[i].__children__[j].__isSearchResult__ = false;    
                        this.data[i].__isAncestorOfSearchResult__ = false;
                        return;
                    } else if (this.data[i].__children__[j].__children__) {
                        for (var k = 0; k < this.data[i].__children__[j].__children__.length; k ++) {
                            if (this.data[i].__children__[j].__children__[k].__isSearchResult__ === true) {
                                this.data[i].__children__[j].__children__[k].__isSearchResult__ = false;    
                                this.data[i].__children__[j].__isAncestorOfSearchResult__ = false;
                                this.data[i].__isAncestorOfSearchResult__ = false;
                                return;
                            }
                        }
                    }
                }
            }
        }
    };


    /**
     * Loads this.data for geo_targets or blocked_geos
     *
     * Basically flattens returned data, then passes to $TreeDnDConvert function
     * so it can be prepared for tree
     * @param geos can be geo_targets or blocked_geos from backend DB
     * @param callback
     */
    GeoTree.prototype.fromGeosInCampaign = function(advertiserId, campaignId, targetOrBlock) {
        var self = this;
        return CampaignGeo.getGeoTrees(advertiserId, campaignId, targetOrBlock) 
        .then(function(response) {
            var geoData = response.data;
            var flattened = [];
            if (!geoData) return;
            geoData.forEach(function(country) {
                var countryNode = _initializeGeoTreeNode(country, 'Country', null);
                countryNode.explicit = country.explicit;
                flattened.push(countryNode);
                if (country.regions) {
                    country.regions.forEach(function(region) {
                        var regionNode = _initializeGeoTreeNode(region, 'Region', country._id, countryNode.weight);
                        regionNode.explicit = region.explicit;
                        flattened.push(regionNode);
                        regionNode.numOfCities = 0;
                        if (region.cities) {
                            regionNode.regionNodeIcon = 'fa fa-lg fa-plus-circle';
                            regionNode.numOfCities = region.cities.length;
                            region.cities.forEach(function(city) {
                                var cityNode = _initializeGeoTreeNode(city, 'City', region._id, regionNode.weight);
                                cityNode.explicit = city.explicit;
                                flattened.push(cityNode);
                            });
                        }
                    }); 
                }
            });
            self.data = $TreeDnDConvert.line2tree(flattened, '_id', 'parentId');
        });
    };

    /**
     * Applies all applicable weight overrides from parents to children,
     * depending on if parent weights have changes from prior state. Meant to
     * only be used in $scope.$watch hook, where oldGeoTree is the older verion
     * of the GeoTree instance which has been modified.
     *
     * @param oldGeoTree old GeoTree instance in $scope
     */
    GeoTree.prototype.applyParentOverrides = function(oldGeoTree) {
        var self = this;
        function inner(newGeoTree, oldGeoTree) {
            if (newGeoTree) {
                for (var i = 0; i < newGeoTree.length; i ++) {
                    var newNode = newGeoTree[i];
                    var oldNode;
                    if (!oldGeoTree || oldGeoTree.length === 0) {
                        oldNode = {};
                    } else {
                        oldNode = oldGeoTree[i];
                    }
                    if (newNode && oldNode) {
                        if (newNode.weight !== oldNode.weight) {
                            newNode.overrideChildWeights();
                        }
                        inner(newNode.__children__, oldNode.__children__);
                    }
                }
            }
        }
        return inner(self.data, oldGeoTree.data);
    };

    /**
     * Sets __hideSlider__ property for each country node on this tree.
     *
     * If the weight of a country node is either null or unchanged,
     * that means this node is just a placeholder for at lease one of its 
     * children whose weight has been customized, so the slider of this node
     * itself should be hidden, and instead a button should show up that
     * allows the user to customize bid at a country level
     *
     * NOTE: this function should ONLY be invoked when initializing tree 
     * data from backend database
     */
     GeoTree.prototype.setCountrySliderHiders = function() {
        // For each country, check if its bid has been customized,
        // if so, show the slider, otherwise hide it
        this.data.forEach(function(countryNode) {
            if (countryNode.weight === null || countryNode.weight === 1) {
                countryNode.__hideSlider__ = true;
            } else {
                countryNode.__hideSlider__ = false;
            }
        });
     };

    /**
     * Helper function to prune any unnecessary children from client-side tree data
     * before persisting to DB. This is useful because of the "sparse tree" format
     * that targeting trees are stored in.
     *
     * Can't just ignore any overridden child since it may have grandchildren
     * that aren't overridden, so have to do another sweep of the tree to prune
     * any overridden branches
     *
     * @param targetsTree tree data
     * @param overrideFunction function which returns boolean indicating whether to throw
     * node out or not.
     * `true` means node will be discarded if its unnecessary,
     * `false` means keep it.
     */
    function pruneOverriddenChildren(targetsTree, overrideFunction) {
        for (var a = 0; a < targetsTree.length; a ++) {
            var country = targetsTree[a];
            if (country.children) {
                for (var b = 0; b < country.children.length; b ++) {
                    var region = country.children[b];
                    if (region.children) {
                        for (var c = 0; c < region.children.length; c ++) {
                            var city = region.children[c];
                            if (overrideFunction(city)) {
                                region.children.splice(c, 1);
                                c = c - 1;
                            }
                        }
                        // Now work our way back up the tree to clean up
                        // any nodes without any children left
                        if (region.children.length === 0 && overrideFunction(region)) {
                            country.children.splice(b, 1);
                            b = b - 1;
                        }
                    } else {
                        if (overrideFunction(region)) {
                            country.children.splice(b, 1);
                            b = b - 1;
                        }
                    }
                }
                if (country.children.length === 0 &&  overrideFunction(country)) {
                    targetsTree.splice(a, 1);
                    a = a - 1;
                }
            }
        }
        return targetsTree;
    }

    /**
     * Converts treeData to Campaign.geo_targets schema format for saving.
     *
     * Also splits out DMAs and generates them as a array.
     *
     * Recurses to lowest non-overridden level of each branch & saves branch, ignoring
     * all overridden children.
     *
     * @return {*}
     */
    GeoTree.prototype.toGeoTargetsSchema = function(callback) {
        var self = this;
        var dmaTargets = [];
        function inner(thisSubtree, targetsTree) {
            targetsTree = targetsTree || [];
            thisSubtree.forEach(function(node) {
                if (node.nodeType !== 'DMA'){
                    var weight = node.__overridden__ ? null : node.weight;
                    var targetObj = {
                        target: node._id,
                        weight: weight,
                        children: null,
                        __overridden__: node.__overridden__
                    };
                    if (node.nodeType === 'City') {
                        targetObj.name = node.name;
                    }
                    var children = self.control.get_children(node);
                    targetsTree.push(targetObj);
                    if (children.length > 0) {
                        targetObj.children = [];
                        inner(children, targetObj.children);
                    }
                } else {
                    dmaTargets.push({
                        target: node._id,
                        weight: node.__overridden__ ? null : node.weight
                    });
                }
            });
            return targetsTree;
        }
        var targetsTree = inner(this.data);
        targetsTree = pruneOverriddenChildren(targetsTree, function(obj) {
            return obj.__overridden__;
        });
        dmaTargets = pruneOverriddenChildren(dmaTargets,function(obj) {
            return obj.__overridden__;
        });
        return callback(null, [targetsTree, dmaTargets]);
    };

    /**
     * Converts treeData to Campaign.blocked_geos schema format for saving.
     *
     * Recurses to lowest non-overridden level of each branch & saves branch, ignoring
     * all overridden children.
     *
     * @return {*}  
     */
    GeoTree.prototype.toBlockedGeosSchema = function(callback) {
        var self = this;
        var dmaTargets = [];
        function inner(thisSubtree, targetsTree) {
            targetsTree = targetsTree || [];    
            thisSubtree.forEach(function(node) {
                if (node.nodeType !== 'DMA') {
                    var targetObj = {
                        target: node._id,
                        children: null,
                        explicit: node.explicit
                    };
                    if (node.nodeType === 'City') {
                        targetObj.name = node.name;
                    }
                    targetsTree.push(targetObj);
                    if (!node.explicit) {
                        var children = self.control.get_children(node);
                        if (children.length > 0) {
                            targetObj.children = [];
                            inner(children, targetObj.children);
                        }
                    }
                } else {
                    dmaTargets.push({
                        target: node._id,
                        explicit: true
                    });
                }
            });
            return targetsTree;
        }
        var blockedTree = inner(this.data);
        blockedTree = pruneOverriddenChildren(blockedTree, function(obj) {
            return obj.explicit === false;
        });
        return callback(null, [blockedTree, dmaTargets]);
    };

    /**
     * Converts treeData to Campaign.target_only_geos schema format for saving.
     *
     * Recurses to lowest non-overriden level of each branch & saves branch, ignoring
     * all overridden children.
     *
     * @return {*}
     */
    GeoTree.prototype.toTargetOnlyGeosSchema = function(callback) {
        var self = this;
        var dmaTargets = [];
        function inner(thisSubtree, targetsTree) {
            targetsTree = targetsTree || [];
            thisSubtree.forEach(function(node) {
                if (node.nodeType !== 'DMA'){
                    var targetObj = {
                        target: node._id,
                        children: null,
                        explicit: node.explicit
                    };
                    if (node.nodeType === 'City') {
                        targetObj.name = node.name;
                    }
                    targetsTree.push(targetObj);
                    if (!node.explicit){
                        var children = self.control.get_children(node);
                        if (children.length > 0) {
                            targetObj.children = [];
                            inner(children, targetObj.children);
                        }
                    }
                } else {
                    dmaTargets.push({
                        target: node._id,
                        explicit: true
                    });
                }
            });
            return targetsTree;
        }
        var targetOnlyTree = inner(this.data);
        targetOnlyTree = pruneOverriddenChildren(targetOnlyTree, function(obj) {
            return obj.explicit === false;
        });
        return callback(null, [targetOnlyTree, dmaTargets]);
    };

    return GeoTree;
});