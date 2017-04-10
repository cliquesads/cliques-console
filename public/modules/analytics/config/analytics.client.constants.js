/**
 * Created by bliang on 1/13/17.
 */

// split into pairs b/c typical UI presentation is in col-4's, so each pair represents one column
angular.module('analytics')
    .constant('QUICKQUERIES', {
        'networkAdmin': [
            {
                name: 'Time',
                type: 'time',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.'
            },
            {
                name: 'Sites',
                type: 'site',
                description: 'See all sites you\'ve served impressions on and how well each site has performed.'
            },
            {
                name: 'Campaigns',
                type: 'campaign',
                description: 'See all campaigns you\'ve served impressions on and how well each campaigns has performed.'
            },
            {
                name: 'Creatives',
                type: 'creative',
                description: 'The best way to tell what brand messaging is resonating. See which creatives are performing well '
                + '& which ones aren\'t.'
            },
            {
                name: 'Placements',
                type: 'placement',
                description: 'The best way to tell what brand messaging is resonating. See which placements are performing well '
                + '& which ones aren\'t.'
            },
            {
                name: 'Cities',
                type: 'city',
                description: 'Drill down to the city level to spot any hyper-regional trends.'
            },
            {
                name: 'States',
                type: 'state',
                description: 'Check on performance by state/region to see what\'s happening at a regional level'
            },
            {
                name: 'Countries',
                type: 'country',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.'
            }
        ],
        'advertiser': [
            {
                name: 'Time',
                type: 'time',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.'
            },
            {
                name: 'Sites',
                type: 'site',
                description: 'See all sites you\'ve served impressions on and how well each site has performed.'
            },
            {
                name: 'Creatives',
                type: 'creative',
                description: 'The best way to tell what brand messaging is resonating. See which creatives are performing well '
                + '& which ones aren\'t.'
            },
            {
                name: 'Cities',
                type: 'city',
                description: 'Drill down to the city level to spot any hyper-regional trends.'
            },
            {
                name: 'States',
                type: 'state',
                description: 'Check on performance by state/region to see what\'s happening at a regional level'
            },
            {
                name: 'Countries',
                type: 'country',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.'
            }
        ],
        'publisher': [
            {
                name: 'Time',
                type: 'time',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.'
            },
            {
                name: 'Campaigns',
                type: 'campaign',
                description: 'See all campaigns you\'ve served impressions on and how well each campaigns has performed.'
            },
            {
                name: 'Placements',
                type: 'placement',
                description: 'The best way to tell what brand messaging is resonating. See which placements are performing well '
                + '& which ones aren\'t.'
            },
            {
                name: 'Cities',
                type: 'city',
                description: 'Drill down to the city level to spot any hyper-regional trends.'
            },
            {
                name: 'States',
                type: 'state',
                description: 'Check on performance by state/region to see what\'s happening at a regional level'
            },
            {
                name: 'Countries',
                type: 'country',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.'
            }
        ]
    })
    /**
     * Will be used to set query name for different quick queries
     */
    .constant('QUERY_ROUTES', {
        time: 'app.analytics.quickQueries.timeQuery',
        site: 'app.analytics.quickQueries.sitesQuery',
        campaign: 'app.analytics.quickQueries.campaignsQuery',
        creative: 'app.analytics.quickQueries.creativesQuery',
        placement: 'app.analytics.quickQueries.placementsQuery',
        state: 'app.analytics.quickQueries.statesQuery',
        city: 'app.analytics.quickQueries.citiesQuery',
        country: 'app.analytics.quickQueries.countriesQuery',
        custom: 'app.analytics.customizeQuery',
        quickQueries: 'app.analytics.quickQueries'
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
        'advertiser': [
            {
                index: 1,
                name: 'Impressions',
                type: 'default'
            },
            {
                index: 2,
                name: 'Spend',
                type: 'default'
            },
            { 
                index: 3,
                name: 'CPM',
                type: 'default'
            },
            {
                index: 4,
                name: 'Clicks',
                type: 'default'
            },
            {
                index: 5,
                name: 'CPC',
                type: 'default'
            },
            {
                index: 6,
                name: 'CTR',
                type: 'default'
            },
            {
                index: 7,
                name: 'Total Actions',
                type: 'default'
            },
            {
                index: 8,
                name: 'Bids',
                type: 'additional',
                selected: false
            },
            {
                index: 9,
                name: 'Uniques',
                type: 'additional',
                selected: false
            },
            {
                index: 10,
                name: 'Win Rate',
                type: 'additional',
                selected: false
            },
            {
                index: 11,
                name: 'View-Through Actions',
                type: 'additional',
                selected: false
            },
            {
                index: 12,
                name: 'Click-Through Actions',
                type: 'additional',
                selected: false
            },
            {
                index: 13,
                name: 'CPAV',
                type: 'additional',
                selected: false
            },
            {
                index: 14,
                name: 'CPAC',
                type: 'additional',
                selected: false
            },
            {
                index: 15,
                name: 'CPA',
                type: 'additional',
                selected: false
            }
        ],
        'publisher': [
            {
                index: 1,
                name: 'Impressions',
                type: 'default'
            },
            {
                index: 2,
                name: 'Revenue',
                type: 'default'
            },
            {
                index: 3,
                name: 'RPM',
                type: 'default'
            },
            {
                index: 4,
                name: 'Defaults',
                type: 'default'
            },
            {
                index: 5,
                name: 'Fill Rate',
                type: 'default'
            },
            {
                index: 6,
                name: 'Clicks',
                type: 'default'
            },
            {
                index: 7,
                name: 'RPC',
                type: 'default'
            },
            {
                index: 8,
                name: 'CTR',
                type: 'default'
            },
            {
                index: 9,
                name: 'Total Actions',
                type: 'default'
            },
            {
                index: 10,
                name: 'Uniques',
                type: 'additional',
                selected: false
            },
            {
                index: 11,
                name: 'View-Through Actions',
                type: 'additional',
                selected: false
            },
            {
                index: 12,
                name: 'Click-Through Actions',
                type: 'additional',
                selected: false
            },
            {
                index: 13,
                name: 'RPAV',
                type: 'additional',
                selected: false
            },
            {
                index: 14,
                name: 'RPAC',
                type: 'additional',
                selected: false
            },
            {
                index: 15,
                name: 'RPA',
                type: 'additional',
                selected: false
            }
        ]
    });