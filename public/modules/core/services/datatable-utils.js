/**
 * Created by bliang on 12/21/15.
 */

angular.module('core').service('DatatableUtils',[function(){
    return {
        /**
         * This makes die a little bit inside:
         * I tried for hours to get the Angular Datatables Buttons extension to behave properly
         * and render buttons with custom DOM structures with absolutely zero success.  See:
         *
         * http://l-lin.github.io/angular-datatables/#/withButtons
         * https://datatables.net/extensions/buttons/
         * https://datatables.net/reference/option/buttons.dom.container
         *
         * Nothing worked, so eventually I just gave up and resorted to the following post-draw jQuery hack,
         * wherein I destroy the original DOM configuration of the button list and reconfigure to my liking.
         *
         * So to use this, use jQuery to bind this function to the 'draw.dt' event, ex:
         *      $.on('draw.dt', restyleButtonsHack)
         *
         * IF YOU FIND ARE READING THIS NOTE IN THE FUTURE, PLEASE RESTORE OUR FAMILY'S HONOR
         * BY FIGURING OUT A NATIVE ANGULAR WAY TO MAKE THIS WORK.
         */
        restyleButtonsHack: function(){
            //// first remove li elements wrapping buttons
            //$('ul.dt-buttons > li > a').unwrap();

            // Now remove surrounding UL
            $('div.dt-buttons > a').unwrap();

            // Wrap all buttons in group in btn-group div
            $('div.dataTables_wrapper > a').wrapAll("<div class='btn btn-group pull-right pr0'></div>");

            // Re-class buttons to look good
            var btnClass = 'btn btn-labeled btn-primary';
            $('div.btn-group > a').each(function(index, val){
                $(val).removeClass().addClass(btnClass);
                var button = $(val.children[0]);
                var buttonType = button.text();
                var iconClass;
                switch (buttonType){
                    case 'Excel':
                        iconClass = 'fa-file-excel-o';
                        break;
                    case 'PDF':
                        iconClass = 'fa-file-pdf-o';
                        break;
                    case 'Copy':
                        iconClass = 'fa-clipboard';
                        break;
                    case 'CSV':
                        iconClass = 'fa-file-text-o';
                        break;
                }
                var label = '<span class="btn-label"><i class="fa ' + iconClass + '"></i></span>';
                if (button.attr('class') != 'btn-label'){
                    $(val).prepend(label);
                }
            });
        }
    }
}]);
