/**
 * Created by bliang on 1/13/17.
 */

// split into pairs b/c typical UI presentation is in col-4's, so each pair represents one column
angular.module('analytics')
    .constant('QUICKQUERIES',[
        [
            {
                name: 'Time',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.'
            },
            {
                name: 'States',
                description: 'Check on performance by state/region to see what\'s happening at a regional level'
            }
        ],[
            {
                name: 'Sites',
                description: 'See all sites youve served impressions on and how well each site has performed.'
            },
            {
                name: 'Cities',
                description: 'Drill down to the city level to spot any hyper-regional trends.'
            }
        ],[
            {
                name: 'Creatives',
                description: 'The best way to tell what brand messaging is resonating. See which creatives are performing well '
                + '& which ones aren\'t.'
            },
            {
                name: 'Countries',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.'
            }
        ]
    ])
    /**
     * Will be used to set query name for different quick queries
     */
    .constant('QUERY_ROUTES', {
        Time: 'app.analytics.timeQuery',
        Sites: 'app.analytics.sitesQuery',
        Creatives: 'app.analytics.creativesQuery',
        States: 'app.analytics.statesQuery',
        Cities: 'app.analytics.citiesQuery',
        Countries: 'app.analytics.countriesQuery',
        Custom: 'app.analytics.customizeQuery'
    })
    /**
     * Will be used as filters for different quick queries
     */
    .constant('QUERY_FILTERS', {
        Time: [],
        Sites: [],
        Creatives: [],
        States: [],
        Cities: [],
        Countries: [],
        Custom: []
    });