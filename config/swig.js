/**
 * Swig custom filters & config
 */

module.exports = function(swig){

    swig.setFilter('number', function(number, decimals) {
        decimals = decimals || 0;
        var x = number.toFixed(decimals);
        return x.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    });

};
