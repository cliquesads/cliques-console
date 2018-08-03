/* global _, angular, moment, user */
'use strict';

angular.module('publisher').controller('EditNativeSpecs', ['$scope','Authentication',
    function($scope, Authentication) {
        $scope.authentication = Authentication;
        $scope.placement = $scope.ngDialogData.placement;
        $scope.publisher = $scope.ngDialogData.publisher;
        $scope.submitted = false;

        $scope.validateInput = function(name, type) {
            var input = $scope.nativeSpecsForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };

        /****************************************/
        /************ CodeMirror Setup **********/
        /****************************************/
        // to hold CodeMirror control objects for each CM instance
        $scope.codeMirrors = {
            desktop: null,
            mobile: null
        };
        // holds error messages for codemirror instances
        $scope.templateErrors = {
            desktop: null,
            mobile: null
        };

        // onLoad functions to pass to directive init to bind instances
        // to vars in this $scope

        $scope.onDesktopCMLoad =  function(codeMirror){
            $scope.codeMirrors.desktop = codeMirror;
        };
        $scope.onMobileCMLoad =  function(codeMirror){
            $scope.codeMirrors.mobile = codeMirror;
        };

        // options to pass to ui-codemirror directive
        $scope.codeMirrorOpts = {
            mode: 'htmlmixed',
            placeholder: "<div>I am a native template! {{ panes }}</div>",
            lineNumbers: true,
            lineWrapping : true,
            htmlMode: true,
            autoRefresh: true,
            foldGutter: true,
            autoCloseTags: true,
            matchTags: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
        };

        /**
         * Wrapper to handle validation of codemirror instances, which aren't
         * part of the form
         * @returns {boolean}
         */
        $scope.validateTemplates = function(){
            var requiredErrorMessage = 'This field is required.';
            var valid = true;
            var forms = ['desktop', 'mobile'];
            for (var i = 0; i < forms.length; i++) {
                var form = forms[i];
                var val = $scope.codeMirrors[form].getValue();
                if (val === null || val === '') {
                    $scope.templateErrors[form] = requiredErrorMessage;
                    valid = false;
                }
            }
            return valid;
        };

        $scope.save = function(){$scope.submitted = true;
            var templatesValid = this.validateTemplates();
            if (this.nativeSpecsForm.$valid && templatesValid){
                $scope.publisher.$update(function(){
                    $scope.closeThisDialog('Success');
                }, function(errorResponse){
                    $scope.saveerror = errorResponse.message;
                });
            } else {
                return false;
            }
        };
    }
])
.controller('EditMultiPaneNativeSpecs', ['$scope','Authentication',
    function($scope, Authentication) {
        $scope.authentication = Authentication;
        $scope.placement = $scope.ngDialogData.placement;
        $scope.publisher = $scope.ngDialogData.publisher;
        $scope.submitted = false;

        $scope.validateInput = function(name, type) {
            var input = $scope.multiPaneNativeSpecsForm[name];
            return (input.$dirty || $scope.submitted) && input.$error[type];
        };

        /****************************************/
        /************ CodeMirror Setup **********/
        /****************************************/
        // to hold CodeMirror control objects for each CM instance
        $scope.codeMirrors = {
            wrapper: {
                desktop: null,
                mobile: null
            },
            panes: {
                desktop: null,
                mobile: null
            }
        };
        // holds error messages for codemirror instances
        $scope.templateErrors = {
            wrapper: {
                desktop: null,
                mobile: null
            },
            panes: {
                desktop: null,
                mobile: null
            }
        };

        // onLoad functions to pass to directive init to bind instances
        // to vars in this $scope

        $scope.onDesktopWrapperCMLoad =  function(codeMirror){
            $scope.codeMirrors.wrapper.desktop = codeMirror;
        };
        $scope.onMobileWrapperCMLoad =  function(codeMirror){
            $scope.codeMirrors.wrapper.mobile = codeMirror;
        };
        $scope.onDesktopPaneCMLoad =  function(codeMirror){
            $scope.codeMirrors.panes.desktop = codeMirror;
        };
        $scope.onMobilePaneCMLoad =  function(codeMirror){
            $scope.codeMirrors.panes.mobile = codeMirror;
        };

        // options to pass to ui-codemirror directive
        $scope.codeMirrorOpts = {
            mode: 'htmlmixed',
            placeholder: "<div>I am a native template! {{ panes }}</div>",
            lineNumbers: true,
            lineWrapping : true,
            htmlMode: true,
            autoRefresh: true,
            foldGutter: true,
            autoCloseTags: true,
            matchTags: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
        };

        /**
         * Wrapper to handle validation of codemirror instances, which aren't
         * part of the form
         * @returns {boolean}
         */
        $scope.validateTemplates = function(){
            var requiredErrorMessage = 'This field is required.';
            function validateCodeMirrors(namespace) {
                var valid = true;
                var forms = ['desktop', 'mobile'];
                for (var i = 0; i < forms.length; i++) {
                    var form = forms[i];
                    if ($scope.placement.multiPaneNative.wrapper[form].active){
                        var val = $scope.codeMirrors[namespace][form].getValue();
                        if (val === null || val === '') {
                            $scope.templateErrors[namespace][form] = requiredErrorMessage;
                            valid = false;
                        }
                    }
                }
                return valid;
            }
            var valid = validateCodeMirrors('wrapper');
            valid = valid && validateCodeMirrors('panes');
            return valid;
        };

        $scope.loading = false;
        $scope.save = function(){
            $scope.loading = true;
            $scope.submitted = true;
            var templatesValid = this.validateTemplates();
            if (this.multiPaneNativeSpecsForm.$valid && templatesValid){
                $scope.publisher.$update(function(){
                    $scope.loading = false;
                    $scope.closeThisDialog('Success');
                }, function(errorResponse){
                    $scope.loading = false;
                    $scope.saveerror = errorResponse.data.message;
                });
            } else {
                $scope.loading = false;
                $scope.saveerror = "Please correct the form and re-submit.";
                return false;
            }
        };

        $scope.$watch('placement.multiPaneNative.wrapper.desktop.active', function(newVal, oldVal){
            if (oldVal !== newVal){
                $scope.placement.multiPaneNative.pane.desktop.active = newVal;
            }
        });

        $scope.$watch('placement.multiPaneNative.wrapper.mobile.active', function(newVal, oldVal){
            if (oldVal !== newVal){
                $scope.placement.multiPaneNative.pane.mobile.active = newVal;
            }
        });
    }
]);