'use strict';
/**
 * Created by bliang on 1/14/16.
 */

angular.module('core').service('DndTreeWrapper', function(){
    /**
     * Wraps treeData in class containing some methods to handle commonly-used
     * logic & routines around this particular data structure.
     *
     * The model bound to the `tree-dnd` directive is stored in `this.data`. Most/all
     * methods manipulate shared this.data data model to accomplish desired actions
     * on corresponding tree-dnd object.
     *
     * Tree control handler should be bound to `this.control`.
     *
     * Wherever possible, I have used built-in tree-dnd control methods to
     * accomplish tasks like getting children, adding nodes, removing nodes, etc..
     *
     * HOWEVER, because of some hidden fuckery in the tree-dnd directive, some base control methods
     * have had to be re-written to operate properly on shared data model.  See comments in
     * this._removeNode for details.
     *
     * TODO: This class has a VERY finnicky relationship with AngularTreeDND class in
     * TODO: angular-tree-dnd directive. Needs to be refactored to either subclass AngularTreeDND
     * TODO: somehow, or make dependencies more clear
     *
     * TODO: This should be split into a base class in a service, then extended here to contain
     * TODO: Inventory-specific methods.
     *
     * @param treeData shared tree data model with tree-dnd directive.
     * @param control tree-dnd control object. Will default to base methods when bound to directive, but
     *      can pass in an object containing custom control methods.
     * @param expanding_property tree-dnd `expanding property` model
     * @param columns tree-dnd column model
     * @constructor
     */
    var DndTreeWrapper = function(treeData, control, expanding_property,columns){
        this.data = treeData || [];
        this.control = control || {};
        this.expanding_property = expanding_property || {};
        this.columns = columns || [];
    };


    DndTreeWrapper.prototype.clearTreeData = function(callback){
        var self = this;
        this.data.forEach(function(topLevelNode){
            self._removeNode(topLevelNode, null);
        });
        return callback(null);
    };

    /**
     * Sort of BS that the Tree DND plugin doesn't have this, so have to write silly little
     * function just to set the initial expand level.
     */
    DndTreeWrapper.prototype.setExpandLevel = function(level, _currentLevel, _treeData){
        var self = this;
        _treeData = _treeData || self.data;
        _currentLevel = _currentLevel || 0;
        _treeData.forEach(function(node){
            node.__expanded__ = (_currentLevel < level);
            if (node.__children__){
                node.__children__ = self.setExpandLevel(level, _currentLevel + 1, node.__children__);
            }
        });
        return _treeData;
    };

    /**
     * Fucking control get_parent doesn't work properly for nested nodes,
     * so have to write my own function to get parent
     *
     * This could be written more elegantly, but it works. JS recursion is wonky.
     */
    DndTreeWrapper.prototype.getNodeById = function(id, _tree){
        _tree = _tree || this.data;
        var parent = null;
        for (var i=0; i < _tree.length; i++){
            var n = _tree[i];
            if (n._id === id){
                parent = n;
                break;
            } else if (n.__children__){
                parent = this.getNodeById(id, n.__children__);
                if (parent) break;
            }
        }
        return parent;
    };

    /**
     * THIS IS AN UGLY HACK. Basically paste of control.remove_node that doesn't
     * rely on control.get_parent method, which will NOT WORK before DOM is
     * fully rendered, and therefore won't work for any pre-load tree manipulation.
     */
    DndTreeWrapper.prototype._removeNode = function(node, parent){
        var self = this;
        if (node) {
            var clearme = false;
            var _parent;
            if (parent) {
                _parent = parent.__children__;
            } else {
                _parent = self.data;
                clearme = true;
            }
            //BUG FIX, tree_nodes does not clear when last element
            //is removed
            if (clearme){
                if (node.__index__ === 0){
                    self.control._clear_tree_nodes();
                }
            }
            _.remove(_parent, function(n){return n._id === node._id;});
        }
    };

    /**
     * Gets array of ancestor nodes, each w/ __children__ consisting of
     * only descendants in specified branch
     * @param node
     * @param _ancestors
     * @returns {*}
     */
    DndTreeWrapper.prototype.getAncestorBranch = function(node, _ancestors){
        _ancestors = _ancestors || [node];
        var parent = this.getNodeById(node.parentId);
        if (parent) {
            var parentClone = _.clone(parent);
            parentClone.__children__ = [node];
            _ancestors.unshift(parentClone);
            return this.getAncestorBranch(parentClone, _ancestors);
        } else {
            return _ancestors;
        }
    };

    /**
     * Effectively "merges" an entire tree branch into this tree.
     *
     * Given a array representing branch of nodes, will check existence of each ancestor
     * in THIS tree. If an ancestor is missing, it will be added to this tree using
     * this.control.add_node().
     *
     * Will also add all children of last node in branch array to same node's children in
     * this tree.
     *
     * This means that if node A is the last element in `branch`, but node A exists
     * in this.data, node A's children in this.data will consist of the union of `branch`
     * node A's children & its own.
     *
     * @param branch array of nodes in branch (use tree.getAncestorBranch to generate)
     * @param _parentNode
     */
    DndTreeWrapper.prototype.populateNodeAncestorBranch = function(branch, _parentNode){
        var self = this;
        var children = _parentNode ? self.control.get_children(_parentNode) : self.data;
        // Assumes branch array is ordered top-to-bottom from 0 to n,
        // i.e. top-most ancestor ('oldest') is 0th element
        var oldestAncestor = branch[0];
        // Now check if oldest ancestor in branch exists in parent's children
        // Need to lookup nodes by id, probably bad idea to perform object comparison
        var existingNode = _.find(children, function(n){
            return n._id === oldestAncestor._id;
        });
        if (existingNode){
            // If we've reached the bottom of the ancestor branch and
            // the node exists, add all origin node's children to destination's
            // children as well
            if (branch.length === 1){
                oldestAncestor.__children__.forEach(function(child){
                    self.control.add_node(existingNode, child);
                });
            } else {
                // pop oldest ancestor off and recurse to next-lowest level
                branch.shift();
                self.populateNodeAncestorBranch(branch, existingNode);
            }
        } else {
            // assumes oldestAncestor node already has branch seeded in its  __children__ array.
            self.control.add_node(_parentNode, oldestAncestor);
        }
    };

    /**
     * Extension of self.control.remove_node function that removes node
     * and any empty ancestors
     *
     * NOTE: Had to hack this to
     *
     * @param node
     */
    DndTreeWrapper.prototype.removeNodeAndEmptyAncestors = function(node){
        var self = this;
        var parent = self.getNodeById(node.parentId);
        self._removeNode(node, parent);
        if (parent){
            var children = parent.__children__;
            if (children.length === 0){
                self.removeNodeAndEmptyAncestors(parent);
            }
        }
    };

    //===========================================================//
    //=============== END DndTreeWrapper Methods=================//
    //===========================================================//

    /**
     * Helper function to move node from one DndTreeWrapper instance
     * to another, according to following algorithm:
     *
     * 1) Get entire ancestor branch in origin tree
     * 2) From top to bottom, if ancestor exists in destination tree, move to its children.
     *  Else, add ancestor to new tree under its appropriate parent (recursively).
     * 3) Clear node from origin tree, and clear any ancestors that no longer contain
     *  any children (recursively).
     *
     * Actually a static, but added to prototype so it can be inherited
     *
     * @param originTree origin DndTreeWrapper instance
     * @param destinationTree destination DndTreeWrapper instance
     * @param node node you want to move
     */
    DndTreeWrapper.prototype.moveNode = function(originTree, destinationTree, node){
        // Add whole ancestor branch to new tree, as necessary
        var branch = originTree.getAncestorBranch(node);
        // Now populate whole ancestor branch in target_sites
        destinationTree.populateNodeAncestorBranch(branch);
        // Clean up all_sites tree by removing node & any empty (no children)
        // ancestor nodes
        originTree.removeNodeAndEmptyAncestors(node);
    };
    return DndTreeWrapper;
});