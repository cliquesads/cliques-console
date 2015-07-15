'use strict';

angular.module('clique').controller('CliqueController', ['$scope', '$stateParams', '$location', 'Authentication', 'Clique',
	function($scope, $stateParams, $location, Authentication, Clique) {
		$scope.authentication = Authentication;

        var treedata_avm = [
            {
                label: 'Animal',
                children: [
                    {
                        label: 'Dog',
                        data: {
                            description: "man's best friend"
                        }
                    }, {
                        label: 'Cat',
                        data: {
                            description: "Felis catus"
                        }
                    }, {
                        label: 'Hippopotamus',
                        data: {
                            description: "hungry, hungry"
                        }
                    }, {
                        label: 'Chicken',
                        children: ['White Leghorn', 'Rhode Island Red', 'Jersey Giant']
                    }
                ]
            }, {
                label: 'Vegetable',
                data: {
                    definition: "A plant or part of a plant used as food, typically as accompaniment to meat or fish, such as a cabbage, potato, carrot, or bean.",
                    data_can_contain_anything: true
                },
                onSelect: function(branch) {
                    $scope.output = "Vegetable: " + branch.data.definition;
                    return $scope.output;
                },
                children: [
                    {
                        label: 'Oranges'
                    }, {
                        label: 'Apples',
                        children: ['Granny Smith','Red Delicous','Fuji']
                    }
                ]
            }, {
                label: 'Mineral',
                children: [
                    {
                        label: 'Rock',
                        children: ['Igneous', 'Sedimentary', 'Metamorphic']
                    }, {
                        label: 'Metal',
                        children: ['Aluminum', 'Steel', 'Copper']
                    }, {
                        label: 'Plastic',
                        children: [
                            {
                                label: 'Thermoplastic',
                                children: ['polyethylene', 'polypropylene', 'polystyrene', ' polyvinyl chloride']
                            }, {
                                label: 'Thermosetting Polymer',
                                children: ['polyester', 'polyurethane', 'vulcanized rubber', 'bakelite', 'urea-formaldehyde']
                            }
                        ]
                    }
                ]
            }
        ];

		$scope.find = function() {
			//$scope.cliques = Clique.query();
            $scope.cliques = treedata_avm;
		};

        $scope.my_tree_handler = function(branch) {

            $scope.output = "You selected: " + branch.label;

            if (branch.data && branch.data.description) {
                $scope.output += '(' + branch.data.description + ')';
                return $scope.output;
            }
        };
        var tree;
        // This is our API control variable
        $scope.my_tree = tree = {};
		//$scope.findOne = function() {
		//	$scope.advertiser = Advertiser.get({
		//		advertiserId: $stateParams.advertiserId
		//	});
		//};
	}
]);