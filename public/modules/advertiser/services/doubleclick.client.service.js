'use strict';

function insertMacros(url){
    // insert click param & macro right before ord param
    // TODO: this seems super fragile, needs fixing
    url = url.replace(';ord=[timestamp]',';click=${CLICK_URL};ord=[timestamp]');
    // [timestamp] comes pretty standard with most DFA tags
    url = url.replace('[timestamp]','${CACHEBUSTER}');
    return url;
}

//Articles service used for communicating with the articles REST endpoints
angular.module('advertiser').factory('DoubleClickTag', [
    function() {
        var JavascriptTag = function(tag){
            // replace newlines
            tag = tag.replace(/(?:\r\n|\r|\n)/g, '');
            this.tag = $(tag);
            this.script = this.tag[0];
            this.noscript = $(this.tag[1]);
            this.noscript_contents = $(this.noscript.contents()[0].textContent);

            this.img = this.noscript_contents[0].children[0];
            this.img_src = this.img.getAttribute('src');
            this.w = this.img.getAttribute('width');
            this.h = this.img.getAttribute('height');
        };
        JavascriptTag.prototype.insertMacros = function(){
            // First inject macros into script portion
            var script = this.script;
            var src = script.getAttribute('src');
            src = insertMacros(src);
            script.setAttribute('src', src);

            //actual <a><img></img></a> tag is stored as text in noscript
            var a = this.noscript_contents[0];
            var noscript_href = a.getAttribute('href');
            noscript_href = insertMacros(noscript_href);
            a.setAttribute('href', noscript_href);

            // Don't know why you can't just use jQuery to cast array of HTML
            // objects back to HTML string, so have to do this instead.
            return $(script).prop('outerHTML') + '<noscript>' +
                $(a).prop('outerHTML') + '</noscript>';
        };
        return {
            Javascript: JavascriptTag
        };
    }
]);
