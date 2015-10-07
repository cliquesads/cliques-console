'use strict';

function insertMacros(url){
    // insert click param & macro right before ord param
    // TODO: this seems super fragile, needs fixing
    url = url.replace(';ord',';click=${CLICK_URL};ord');
    // [timestamp] comes pretty standard with most DFA tags
    url = url.replace('[timestamp]','${CACHEBUSTER}');
    return url;
}

//Articles service used for communicating with the articles REST endpoints
angular.module('advertiser').factory('DoubleClickTags', [
    function() {
        return {
            javascriptTagMacroExpander: function(tag){
                tag = $(tag);
                // First inject macros into script portion
                var script = tag[0];
                var src = script.getAttribute('src');
                src = insertMacros(src);
                script.setAttribute('src', src);

                //Get noscript element as separate thing
                var noscript = $(elem[1]);
                //actual <a><img></img></a> tag is stored as text in noscript
                var noscript_text = noscript.contents()[0].textContent;
                var noscript_elem = $(noscript_text)[0];
                var noscript_href = noscript_elem.getAttribute('href');
                noscript_href = insertMacros(noscript_href);
                noscript_elem.setAttribute('href', noscript_href);

                // Don't know why you can't just use jQuery to cast array of HTML
                // objects back to HTML string, so have to do this instead.
                return $(script).prop('outerHTML') + '<noscript>\"' +
                    $(noscript_elem).prop('outerHTML') + '\"</noscript>';
            }
        }
    }
]);
