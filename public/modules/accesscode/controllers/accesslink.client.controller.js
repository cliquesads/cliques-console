/* globals user */
'use strict';

angular.module('accesscode').controller('ListAccessLinksController', ['$scope', '$http', '$location', 'Users',
    'Authentication','Notify','Organizations', 'AccessLink','ngDialog',
    function($scope, $http, $location, Users, Authentication,Notify, Organizations, AccessLink, ngDialog) {
        $scope.accessLinks = AccessLink.query();

        $scope.deactivateAccessLink = function(accessLink){
            var dialog = ngDialog.openConfirm({
                template: '\
                        <br>\
                        <p>Are you sure you want to deactivate this invite?</p>\
                        <p class="text-center">\
                            <button class="btn btn-lg btn-success" ng-click="confirm(true)">Yes</button>\
                            <button class="btn btn-lg btn-primary" ng-click="closeThisDialog()">No</button>\
                        </p>',
                plain: true
            });
            dialog.then(function(confirm){
                if (confirm){
                    accessLink.expired = true;
                    accessLink.$update(function(response){
                        Notify.alert('Access code ' + accessLink.code + ' was deactivated successfully', {status: 'success'});
                    }, function(errorResponse){
                        Notify.alert(errorResponse.data.message, {status: 'danger'});
                    });
                }
            });
        };

        $scope.resendAccessLink = function (accessLink) {
            var dialog = ngDialog.openConfirm({
                controller: ['$scope', function($scope){
                   $scope.accessLink = $scope.ngDialogData.accessLink;
                }],
                data: { accessLink: accessLink},
                template: '\
                        <br>\
                        <p>Resend this invite to <strong>{{ accessLink.firstName + " " + accessLink.lastName + " <" + accessLink.email + ">"}}</strong>?</p>\
                        <p class="text-center">\
                            <button class="btn btn-lg btn-success" ng-click="confirm(true)">Yes</button>\
                            <button class="btn btn-lg btn-primary" ng-click="closeThisDialog()">No</button>\
                        </p>',
                plain: true
            });
            dialog.then(function(confirm){
                if (confirm){
                    $http.post('/console/accesslink/' + accessLink._id + '/send-to-user', {})
                        .success(function(response){
                            Notify.alert('Invite sent to ' + accessLink.email, {status: 'success'});
                        })
                        .error(function(response){
                            Notify.alert(response.message, {status: 'danger'});
                        });
                }
            });
        };

        $scope.newAccessLink = function(){
            ngDialog.open({
                template: 'modules/accesscode/views/partials/create-access-link-form-dialog.html',
                className: 'ngdialog-theme-default dialogwidth650',
                controller: ['$scope','AccessLink', 'Advertiser', 'Publisher', function(scope, AccessLink, Advertiser, Publisher){
                    scope.accessLink = new AccessLink({
                        expired: false,
                        firstName: null,
                        lastName: null,
                        email: null,
                        delegatedAdvertiser: null,
                        delegatedPublisher: null,
                        orgType: 'advertiser'
                    });
                    // query advertisers but filter out those that don't belong to networkAdmin Org
                    Advertiser.query(function(advertisers){
                        scope.advertisers = advertisers.filter(function(advertiser){
                            return advertiser.organization === user.organization.id;
                        });
                    });
                    Publisher.query(function(publishers){
                        scope.publishers= publishers.filter(function(publisher){
                            return publisher.organization === user.organization.id;
                        });
                    });

                    scope.submit = function(){
                        scope.error = null;
                        if (scope.accessLinkForm.$valid){
                            scope.loading = true;
                            // create the accessLink first
                            scope.accessLink.$create(function(accessLink){
                                // once it's created, hit endpoint to send to user
                                $http.post('/console/accesslink/' + scope.accessLink._id + '/send-to-user', {})
                                    .success(function(response){
                                        Notify.alert('Invite sent to ' + scope.accessLink.email, {status: 'success'});
                                        scope.closeThisDialog(response);
                                        scope.loading = false;
                                        $scope.accessLinks.splice(0, 0, accessLink);
                                    })
                                    .error(function(response){
                                        $scope.loading = false;
                                        Notify.alert(response.message, {status: 'danger'});
                                    });
                            }, function(errorResponse){
                                scope.loading = false;
                                scope.error = errorResponse.data.message;
                            });
                        }
                    };
                }]
            });
        };
    }
]);
