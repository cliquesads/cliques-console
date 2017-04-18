/**
 * Created by bliang on 1/13/17.
 */
/* global _, angular, user */

// split into pairs b/c typical UI presentation is in col-4's, so each pair represents one column
angular.module('analytics')
    .constant('CUSTOMQUERY', {
        'networkAdmin': {
            defaultQueryParam: {
                name: 'Custom',
                type: 'custom',
                dateRangeShortCode: '7d',
                dateGroupBy: 'day',
                humanizedDateRange: 'Last 7 Days',
                groupBy: 'advertiser,publisher',
                populate: 'advertiser,publisher'
            },
            availableSettings: {
                campaignFilter: true,
                siteFilter: true
            }
        },
        'advertiser': {
            defaultQueryParam: {
                name: 'Custom',
                type: 'custom',
                dateRangeShortCode: '7d',
                dateGroupBy: 'day',
                humanizedDateRange: 'Last 7 Days',
                groupBy: 'publisher',
                populate: 'publisher'
            },
            availableSettings: {
                campaignFilter: true,
                siteFilter: false
            }
        },
        'publisher': {
            defaultQueryParam: {
                name: 'Custom',
                type: 'custom',
                dateRangeShortCode: '7d',
                dateGroupBy: 'day',
                humanizedDateRange: 'Last 7 Days',
                groupBy: 'advertiser',
                populate: 'advertiser'
            },
            availableSettings: {
                campaignFilter: false,
                siteFilter: true
            }
        }
    })
    .constant('QUICKQUERIES', {
        'networkAdmin': {
            time: {
                name: 'Time',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.',
                route: 'app.analytics.quickQueries.time',
                defaultQueryParam: {
                    name: 'Time',
                    type: 'time',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: true,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: true,
                    hasTable: true
                }
            },
            site: {
                name: 'Sites',
                description: 'See all sites you\'ve served impressions on and how well each site has performed.',
                route: 'app.analytics.quickQueries.site',
                defaultQueryParam: {
                    name: 'Sites',
                    type: 'site',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,publisher,site',
                    populate: 'advertiser,publisher,site'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            },
            campaign: {
                name: 'Campaigns',
                description: 'See all campaigns you\'ve served impressions on and how well each campaigns has performed.',
                route: 'app.analytics.quickQueries.campaign',
                defaultQueryParam: {
                    name: 'Campaigns',
                    type: 'campaign',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,publisher,campaign',
                    populate: 'advertiser,publisher,campaign'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            },
            creative: {
                name: 'Creatives',
                description: 'The best way to tell what brand messaging is resonating. See which creatives are performing well '
                + '& which ones aren\'t.',
                route: 'app.analytics.quickQueries.creative',
                defaultQueryParam: {
                    name: 'Creatives',
                    type: 'creative',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,publisher,creative',
                    populate: 'advertiser,publisher,creative'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            },
            placement: {
                name: 'Placements',
                description: 'The best way to tell what brand messaging is resonating. See which placements are performing well '
                + '& which ones aren\'t.',
                route: 'app.analytics.quickQueries.placement',
                defaultQueryParam: {
                    name: 'Placements',
                    type: 'placement',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,publisher,placement',
                    populate: 'advertiser,publisher,placement'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            },
            city: {
                name: 'Cities',
                description: 'Drill down to the city level to spot any hyper-regional trends.',
                route: 'app.analytics.quickQueries.city',
                defaultQueryParam: {
                    name: 'Cities',
                    type: 'city',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,publisher,city',
                    populate: 'advertiser,publisher,city'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            },
            state: {
                name: 'States',
                description: 'Check on performance by state/region to see what\'s happening at a regional level',
                route: 'app.analytics.quickQueries.state',
                defaultQueryParam: {
                    name: 'States',
                    type: 'state',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,publisher,state',
                    populate: 'advertiser,publisher,state'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            },
            country: {
                name: 'Countries',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.',
                route: 'app.analytics.quickQueries.country',
                defaultQueryParam: {
                    name: 'Countries',
                    type: 'country',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,publisher,country',
                    populate: 'advertiser,publisher,country'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            }
        },
        'advertiser': {
            time: {
                name: 'Time',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.',
                route: 'app.analytics.quickQueries.time',
                defaultQueryParam: {
                    name: 'Time',
                    type: 'time',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: true,
                    campaignFilter: true,
                    siteFilter: false,
                    hasGraph: true,
                    hasTable: true
                }
            },
            site: {
                name: 'Sites',
                description: 'See all sites you\'ve served impressions on and how well each site has performed.',
                route: 'app.analytics.quickQueries.site',
                defaultQueryParam: {
                    name: 'Sites',
                    type: 'site',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'publisher,site',
                    populate: 'publisher,site'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: false,
                    hasGraph: false,
                    hasTable: true
                }
            },
            creative: {
                name: 'Creatives',
                description: 'The best way to tell what brand messaging is resonating. See which creatives are performing well '
                + '& which ones aren\'t.',
                route: 'app.analytics.quickQueries.creative',
                defaultQueryParam: {
                    name: 'Creatives',
                    type: 'creative',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'publisher,creative',
                    populate: 'publisher,creative'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: false,
                    hasGraph: false,
                    hasTable: true
                }
            },
            city: {
                name: 'Cities',
                description: 'Drill down to the city level to spot any hyper-regional trends.',
                route: 'app.analytics.quickQueries.city',
                defaultQueryParam: {
                    name: 'Cities',
                    type: 'city',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'publisher,city',
                    populate: 'publisher,city'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: false,
                    hasGraph: false,
                    hasTable: true
                }
            },
            state: {
                name: 'States',
                description: 'Check on performance by state/region to see what\'s happening at a regional level',
                route: 'app.analytics.quickQueries.state',
                defaultQueryParam: {
                    name: 'States',
                    type: 'state',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'publisher,state',
                    populate: 'publisher,state'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: false,
                    hasGraph: false,
                    hasTable: true
                }
            },
            country: {
                name: 'Countries',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.',
                route: 'app.analytics.quickQueries.country',
                defaultQueryParam: {
                    name: 'Countries',
                    type: 'country',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'publisher,country',
                    populate: 'publisher,country'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: false,
                    hasGraph: false,
                    hasTable: true
                }
            }
        },
        'publisher': {
            time: {
                name: 'Time',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.',
                route: 'app.analytics.quickQueries.time',
                defaultQueryParam: {
                    name: 'Time',
                    type: 'time',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: true,
                    campaignFilter: false,
                    siteFilter: true,
                    hasGraph: true,
                    hasTable: true
                }
            },
            campaign: {
                name: 'Campaigns',
                description: 'See all campaigns you\'ve served impressions on and how well each campaigns has performed.',
                route: 'app.analytics.quickQueries.campaign',
                defaultQueryParam: {
                    name: 'Campaigns',
                    type: 'campaign',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,campaign',
                    populate: 'advertiser,campaign'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: false,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            },
            placement: {
                name: 'Placements',
                description: 'The best way to tell what brand messaging is resonating. See which placements are performing well '
                + '& which ones aren\'t.',
                route: 'app.analytics.quickQueries.placement',
                defaultQueryParam: {
                    name: 'Placements',
                    type: 'placement',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,placement',
                    populate: 'advertiser,placement'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: false,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            },
            city: {
                name: 'Cities',
                description: 'Drill down to the city level to spot any hyper-regional trends.',
                route: 'app.analytics.quickQueries.city',
                defaultQueryParam: {
                    name: 'Cities',
                    type: 'city',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,city',
                    populate: 'advertiser,city'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: false,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            },
            state: {
                name: 'States',
                description: 'Check on performance by state/region to see what\'s happening at a regional level',
                route: 'app.analytics.quickQueries.state',
                defaultQueryParam: {
                    name: 'States',
                    type: 'state',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,state',
                    populate: 'advertiser,state'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: false,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            },
            country: {
                name: 'Countries',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.',
                route: 'app.analytics.quickQueries.country',
                defaultQueryParam: {
                    name: 'Countries',
                    type: 'country',
                    dateRangeShortCode: '7d',
                    dateGroupBy: 'day',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,country',
                    populate: 'advertiser,country'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: false,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true
                }
            }
        }
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
        'networkAdmin': [
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
                name: 'Defaults',
                type: 'default'
            },
            {
                index: 9,
                name: 'Fill Rate',
                type: 'default'
            }, 
            {
                index: 10,
                name: 'Bids',
                type: 'additional',
                selected: false
            },
            {
                index: 11,
                name: 'Uniques',
                type: 'additional',
                selected: false
            },
            {
                index: 12,
                name: 'Win Rate',
                type: 'additional',
                selected: false
            },
            {
                index: 13,
                name: 'View-Through Actions',
                type: 'additional',
                selected: false
            },
            {
                index: 14,
                name: 'Click-Through Actions',
                type: 'additional',
                selected: false
            },
            {
                index: 15,
                name: 'CPAV',
                type: 'additional',
                selected: false
            },
            {
                index: 16,
                name: 'CPAC',
                type: 'additional',
                selected: false
            },
            {
                index: 17,
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