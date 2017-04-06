/**
 * Created by bliang on 1/13/17.
 */

// split into pairs b/c typical UI presentation is in col-4's, so each pair represents one column
angular.module('analytics')
    .constant('QUICKQUERIES', {
        'networkAdmin': [
            {
                name: 'Time',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.'
            },
            {
                name: 'Sites',
                description: 'See all sites you\'ve served impressions on and how well each site has performed.'
            },
            {
                name: 'Campaigns',
                description: 'See all campaigns you\'ve served impressions on and how well each campaigns has performed.'
            },
            {
                name: 'Creatives',
                description: 'The best way to tell what brand messaging is resonating. See which creatives are performing well '
                + '& which ones aren\'t.'
            },
            {
                name: 'Placements',
                description: 'The best way to tell what brand messaging is resonating. See which placements are performing well '
                + '& which ones aren\'t.'
            },
            {
                name: 'Cities',
                description: 'Drill down to the city level to spot any hyper-regional trends.'
            },
            {
                name: 'States',
                description: 'Check on performance by state/region to see what\'s happening at a regional level'
            },
            {
                name: 'Countries',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.'
            }
        ],
        'advertiser': [
            {
                name: 'Time',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.'
            },
            {
                name: 'Sites',
                description: 'See all sites you\'ve served impressions on and how well each site has performed.'
            },
            {
                name: 'Creatives',
                description: 'The best way to tell what brand messaging is resonating. See which creatives are performing well '
                + '& which ones aren\'t.'
            },
            {
                name: 'Cities',
                description: 'Drill down to the city level to spot any hyper-regional trends.'
            },
            {
                name: 'States',
                description: 'Check on performance by state/region to see what\'s happening at a regional level'
            },
            {
                name: 'Countries',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.'
            }
        ],
        'publisher': [
            {
                name: 'Time',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.'
            },
            {
                name: 'Campaigns',
                description: 'See all campaigns you\'ve served impressions on and how well each campaigns has performed.'
            },
            {
                name: 'Placements',
                description: 'The best way to tell what brand messaging is resonating. See which placements are performing well '
                + '& which ones aren\'t.'
            },
            {
                name: 'Cities',
                description: 'Drill down to the city level to spot any hyper-regional trends.'
            },
            {
                name: 'States',
                description: 'Check on performance by state/region to see what\'s happening at a regional level'
            },
            {
                name: 'Countries',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.'
            }
        ]
    })
    /**
     * Will be used to set query name for different quick queries
     */
    .constant('QUERY_ROUTES', {
        Time: 'app.analytics.quickQueries.timeQuery',
        Sites: 'app.analytics.quickQueries.sitesQuery',
        Campaigns: 'app.analytics.quickQueries.campaignsQuery',
        Creatives: 'app.analytics.quickQueries.creativesQuery',
        Placements: 'app.analytics.quickQueries.placementsQuery',
        States: 'app.analytics.quickQueries.statesQuery',
        Cities: 'app.analytics.quickQueries.citiesQuery',
        Countries: 'app.analytics.quickQueries.countriesQuery',
        Custom: 'app.analytics.customizeQuery',
        QuickQueries: 'app.analytics.quickQueries'
    })
    /**
     * Crontab day options and corresponding crontab string
     */
    .constant('CRONTAB_DAY_OPTIONS', {
        'Every day': ' * * *',
        'Every week day': ' * * 1-5',
        'The 1st of each month': ' 1 * *',
        'The last day of each month': ' 28 * *',
        'Every Monday': ' * * 1',
        'Every Tuesday': ' * * 2',
        'Every Wednesday': ' * * 3',
        'Every Thursday': ' * * 4',
        'Every Friday': ' * * 5',
        'Every Saturday': ' * * 6',
        'Every Sunday': ' * * 7'
    })
    .constant('TABLE_HEADERS', {
        'Default Advertiser Metrics': [
            'Impressions',
            'Spend',
            'CPM',
            'Clicks',
            'CPC',
            'CTR',
            'Total Actions',
        ],
        'Additional Advertiser Metrics': [
            'Bids',
            'Uniques',
            'Win Rate',
            'View-Through Actions',
            'Click-Through Actions',
            'CPAV',
            'CPAC',
            'CPA'
        ],
        'Default Publisher Metrics': [
            'Impressions',
            'Revenue',
            'RPM',
            'Defaults',
            'Fill Rate',
            'Clicks',
            'RPC',
            'CTR',
            'Total Actions'
        ],
        'Additional Publisher Metrics': [
            'Uniques',
            'View-Through Actions',
            'Click-Through Actions',
            'RPAV',
            'RPAC',
            'RPA'
        ]
    });