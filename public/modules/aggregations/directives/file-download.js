'use strict';
angular.module('aggregations').directive('fileDownload', [function() {
    return {
        restrict: 'A',
        scope: {
            fileDownload: '=',
            fileName: '=',
        },

        link: function(scope, elem, atrs) {
            scope.$watch('fileDownload', function(newValue, oldValue) {
                if (newValue !== undefined && newValue !== null) {
                    console.debug('Downloading a new file');
                    var isFirefox = typeof InstallTrigger !== 'undefined' || navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
                    var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
                    var isIE = /*@cc_on!@*/ false || !!document.documentMode;
                    var isEdge = !isIE && !!window.StyleMedia;
                    var isChrome = (!!window.chrome && !!window.chrome.webstore) || navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
                    var isOpera = (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
                    var isBlink = (isChrome || isOpera) && !!window.CSS;

                    var url, fileURL;
                    if (isFirefox || isIE || isChrome) {
                        if (isChrome) {
                            url = window.URL || window.webkitURL;
                            fileURL = url.createObjectURL(scope.fileDownload);
                            var downloadLink = angular.element('<a></a>'); //create a new  <a> tag element
                            downloadLink.attr('href', fileURL);
                            downloadLink.attr('download', scope.fileName);
                            downloadLink.attr('target', '_self');
                            downloadLink[0].click(); //call click function
                            url.revokeObjectURL(fileURL); //revoke the object from URL
                        }
                        if (isIE) {
                            window.navigator.msSaveOrOpenBlob(scope.fileDownload, scope.fileName);
                        }
                        if (isFirefox) {
                            url = window.URL || window.webkitURL;
                            fileURL = url.createObjectURL(scope.fileDownload);
                            var a = elem[0]; //recover the <a> tag from directive
                            a.href = fileURL;
                            a.download = scope.fileName;
                            a.target = '_self';
                            a.click(); //we call click function
                        }
                    } else {
                        console.error('Sorry, your browser is not compatible');
                    }
                }
            });
        }
    };
}]);
