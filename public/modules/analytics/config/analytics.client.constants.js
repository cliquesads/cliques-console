/**
 * Created by bliang on 1/13/17.
 */
/* global _, angular, user, pricing */

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
                iconClass: 'fa fa-clock-o',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.',
                route: 'app._analytics.analytics.quickQueries.time',
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
                    hasTable: true,
                    pagination: false
                }
            },
            site: {
                name: 'Sites',
                iconClass: "icon-book-open",
                description: 'See all Sites you\'ve served impressions on and how well each site has performed.',
                route: 'app._analytics.analytics.quickQueries.site',
                defaultQueryParam: {
                    name: 'Sites',
                    type: 'site',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'publisher,site',
                    populate: 'publisher,site'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false,
                }
            },
            campaign: {
                name: 'Campaigns',
                iconClass: 'fa fa-bullhorn',
                description: 'See all campaigns you\'ve served impressions on and how well each campaign has performed.',
                route: 'app._analytics.analytics.quickQueries.campaign',
                defaultQueryParam: {
                    name: 'Campaigns',
                    type: 'campaign',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,campaign',
                    populate: 'advertiser,campaign'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            advertiser: {
                name: 'Advertisers',
                iconClass: 'fa fa-bullhorn',
                description: 'High-level report that provides an advertiser performance summary.',
                route: 'app._analytics.analytics.quickQueries.advertiser',
                defaultQueryParam: {
                    name: 'Advertisers',
                    type: 'advertiser',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser',
                    populate: 'advertiser'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            creative: {
                name: 'Creatives',
                iconClass: 'fa fa-image',
                description: 'The best way to tell what brand messaging is resonating. See which creatives are performing well '
                + '& which ones aren\'t.',
                route: 'app._analytics.analytics.quickQueries.creative',
                defaultQueryParam: {
                    name: 'Creatives',
                    type: 'creative',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,creative',
                    populate: 'advertiser,creative'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            placement: {
                name: 'Placements',
                iconClass: 'fa fa-newspaper-o',
                description: 'Placements are the individual ad units that a Publisher makes available for purchase. See how' +
                    'each individual placement is performing for your campaigns.',
                route: 'app._analytics.analytics.quickQueries.placement',
                defaultQueryParam: {
                    name: 'Placements',
                    type: 'placement',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'publisher,site,placement',
                    populate: 'publisher,site,placement'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            keyword: {
                name: 'Keywords',
                iconClass: 'fa fa-search',
                description: 'keywords helps you to better define placements/pages.',
                route: 'app._analytics.analytics.quickQueries.keyword',
                defaultQueryParam: {
                    name: 'Keywords',
                    type: 'keyword',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'keywords',
                    resultsPage: 1,
                    perPage: 25,
                    sort: "imps,desc"
                },
                availableSettings: {
                    timePeriod: false,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    keywordFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    hasKeywordCloud: true,
                    pagination: true,
                }
            },
            city: {
                name: 'Cities',
                iconClass: 'fa fa-map-marker',
                description: 'Drill down to the city level to spot any hyper-regional trends.',
                route: 'app._analytics.analytics.quickQueries.city',
                defaultQueryParam: {
                    name: 'Cities',
                    type: 'city',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'city',
                    resultsPage: 1,
                    perPage: 25,
                    sort: "imps,desc"
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    countryFilter: true,
                    regionFilter: true,
                    hasMap: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: true
                }
            },
            state: {
                name: 'Regions/States',
                iconClass: 'fa fa-map',
                description: 'Check on performance by state/region to see what\'s happening at a regional level (US Only).',
                route: 'app._analytics.analytics.quickQueries.state',
                defaultQueryParam: {
                    name: 'Regions/States',
                    type: 'state',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'region',
                    populate: 'region'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    countryFilter: true,
                    hasMap: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            country: {
                name: 'Countries',
                iconClass: 'fa fa-globe',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.',
                route: 'app._analytics.analytics.quickQueries.country',
                defaultQueryParam: {
                    name: 'Countries',
                    type: 'country',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'country',
                    populate: 'country'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasMap: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            }
        },
        'advertiser': {
            time: {
                name: 'Time',
                iconClass: 'fa fa-clock-o',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.',
                route: 'app._analytics.analytics.quickQueries.time',
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
                    hasTable: true,
                    pagination: false
                }
            },
            site: {
                name: 'Sites',
                iconClass: "icon-book-open",
                description: 'See all Sites you\'ve served impressions on and how well each site has performed.',
                route: 'app._analytics.analytics.quickQueries.site',
                defaultQueryParam: {
                    name: 'Sites',
                    type: 'site',
                    dateRangeShortCode: '7d',
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
                    hasTable: true,
                    pagination: false
                }
            },
            campaign: {
                name: 'Campaigns',
                iconClass: 'fa fa-bullhorn',
                description: 'See all campaigns you\'ve served impressions on and how well each campaign has performed.',
                route: 'app._analytics.analytics.quickQueries.campaign',
                defaultQueryParam: {
                    name: 'Campaigns',
                    type: 'campaign',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,campaign',
                    populate: 'advertiser,campaign'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            advertiser: {
                name: 'Advertisers',
                iconClass: 'fa fa-bullhorn',
                description: 'High-level report that provides an advertiser performance summary.',
                route: 'app._analytics.analytics.quickQueries.advertiser',
                defaultQueryParam: {
                    name: 'Advertisers',
                    type: 'advertiser',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser',
                    populate: 'advertiser'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            creative: {
                name: 'Creatives',
                iconClass: 'fa fa-image',
                description: 'The best way to tell what brand messaging is resonating. See which creatives are performing well '
                + '& which ones aren\'t.',
                route: 'app._analytics.analytics.quickQueries.creative',
                defaultQueryParam: {
                    name: 'Creatives',
                    type: 'creative',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,creative',
                    populate: 'advertiser,creative'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: false,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            placement: {
                name: 'Placements',
                iconClass: 'fa fa-newspaper-o',
                description: 'Placements are the individual ad units that a Publisher makes available for purchase. See how' +
                ' each individual Placement is performing for your Campaigns.',
                route: 'app._analytics.analytics.quickQueries.placement',
                defaultQueryParam: {
                    name: 'Placements',
                    type: 'placement',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'publisher,site,placement',
                    populate: 'publisher,site,placement'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: false,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            keyword: {
                name: 'Keywords',
                iconClass: 'fa fa-search',
                description: 'keywords helps you to better define placements/pages.',
                route: 'app._analytics.analytics.quickQueries.keyword',
                defaultQueryParam: {
                    name: 'Keywords',
                    type: 'keyword',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'keywords',
                    resultsPage: 1,
                    perPage: 25,
                    sort: "imps,desc"
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    keywordFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    hasKeywordCloud: true,
                    pagination: true
                }
            },
            city: {
                name: 'Cities',
                iconClass: 'fa fa-map-marker',
                description: 'Drill down to the city level to spot any hyper-regional trends.',
                route: 'app._analytics.analytics.quickQueries.city',
                defaultQueryParam: {
                    name: 'Cities',
                    type: 'city',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'city',
                    resultsPage: 1,
                    perPage: 25,
                    sort: "imps,desc"
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: false,
                    countryFilter: true,
                    regionFilter: true,
                    hasMap: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: true
                }
            },
            state: {
                name: 'States',
                iconClass: 'fa fa-map',
                description: 'Check on performance by state/region to see what\'s happening at a regional level (US Only).',
                route: 'app._analytics.analytics.quickQueries.state',
                defaultQueryParam: {
                    name: 'States',
                    type: 'state',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'region',
                    populate: 'region'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: false,
                    countryFilter: true,
                    hasMap: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            country: {
                name: 'Countries',
                iconClass: 'fa fa-globe',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.',
                route: 'app._analytics.analytics.quickQueries.country',
                defaultQueryParam: {
                    name: 'Countries',
                    type: 'country',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'country',
                    populate: 'country'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: false,
                    hasMap: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            }
        },
        'publisher': {
            time: {
                name: 'Time',
                iconClass: 'fa fa-clock-o',
                description: 'View vital stats by hour, day & month. Spot hourly performance trends to help you bid smarter.',
                route: 'app._analytics.analytics.quickQueries.time',
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
                    hasTable: true,
                    pagination: false
                }
            },
            advertiser: {
                name: 'Advertisers',
                iconClass: 'fa fa-bullhorn',
                description: 'High-level report that provides an advertiser performance summary.',
                route: 'app._analytics.analytics.quickQueries.advertiser',
                defaultQueryParam: {
                    name: 'Advertisers',
                    type: 'advertiser',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser',
                    populate: 'advertiser'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            campaign: {
                name: 'Campaigns',
                iconClass: 'fa fa-bullhorn',
                description: 'See all campaigns you\'ve served impressions on and how well each campaigns has performed.',
                route: 'app._analytics.analytics.quickQueries.campaign',
                defaultQueryParam: {
                    name: 'Campaigns',
                    type: 'campaign',
                    dateRangeShortCode: '7d',
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
                    hasTable: true,
                    pagination: false
                }
            },
            placement: {
                name: 'Placements',
                description: 'See which of your Placements are making you the most money.',
                iconClass: 'fa fa-newspaper-o',
                route: 'app._analytics.analytics.quickQueries.placement',
                defaultQueryParam: {
                    name: 'Placements',
                    type: 'placement',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'publisher,site,placement',
                    populate: 'publisher,site,placement'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: false,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            creative: {
                name: 'Creatives',
                iconClass: 'fa fa-image',
                description: 'The best way to tell what brand messaging is resonating. See which creatives are performing well '
                + '& which ones aren\'t.',
                route: 'app._analytics.analytics.quickQueries.creative',
                defaultQueryParam: {
                    name: 'Creatives',
                    type: 'creative',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'advertiser,creative',
                    populate: 'advertiser,creative'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: false,
                    siteFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            keyword: {
                name: 'Keywords',
                iconClass: 'fa fa-search',
                description: 'keywords helps you to better define placements/pages.',
                route: 'app._analytics.analytics.quickQueries.keyword',
                defaultQueryParam: {
                    name: 'Keywords',
                    type: 'keyword',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'keywords',
                    resultsPage: 1,
                    perPage: 25,
                    sort: "imps,desc"
                },
                availableSettings: {
                    timePeriod: false,
                    dateGroupBy: false,
                    campaignFilter: true,
                    siteFilter: true,
                    keywordFilter: true,
                    hasGraph: false,
                    hasTable: true,
                    hasKeywordCloud: true,
                    pagination: true
                }
            },
            city: {
                name: 'Cities',
                iconClass: 'fa fa-map-marker',
                description: 'Drill down to the city level to spot any hyper-regional trends.',
                route: 'app._analytics.analytics.quickQueries.city',
                defaultQueryParam: {
                    name: 'Cities',
                    type: 'city',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'city',
                    resultsPage: 1,
                    perPage: 25,
                    sort: "imps,desc"
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: false,
                    siteFilter: true,
                    countryFilter: true,
                    regionFilter: true,
                    hasMap: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: true
                }
            },
            state: {
                name: 'States',
                iconClass: 'fa fa-map',
                description: 'Check on performance by state/region to see what\'s happening at a regional level (US Only).',
                route: 'app._analytics.analytics.quickQueries.state',
                defaultQueryParam: {
                    name: 'States',
                    type: 'state',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'region',
                    populate: 'region'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: false,
                    siteFilter: true,
                    countryFilter: true,
                    hasMap: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
                }
            },
            country: {
                name: 'Countries',
                iconClass: 'fa fa-globe',
                description: 'Zoom way out and see if there are any interesting trends at the country level for your campaigns.',
                route: 'app._analytics.analytics.quickQueries.country',
                defaultQueryParam: {
                    name: 'Countries',
                    type: 'country',
                    dateRangeShortCode: '7d',
                    humanizedDateRange: 'Last 7 Days',
                    groupBy: 'country',
                    populate: 'country'
                },
                availableSettings: {
                    timePeriod: true,
                    dateGroupBy: false,
                    campaignFilter: false,
                    siteFilter: true,
                    hasMap: true,
                    hasGraph: false,
                    hasTable: true,
                    pagination: false
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
                type: 'data',
                selected: true
            },
            {
                index: 2,
                name: 'Spend',
                type: 'data',
                selected: true
            },
            { 
                index: 3,
                name: 'CPM',
                type: 'data',
                selected: pricing === 'CPM'
            },
            {
                index: 4,
                name: 'Clicks',
                type: 'data',
                selected: true
            },
            {
                index: 5,
                name: 'CPC',
                type: 'data',
                selected: pricing === 'CPC'
            },
            {
                index: 6,
                name: 'CTR',
                type: 'data',
                selected: true
            },
            {
                index: 7,
                name: 'Total Actions',
                type: 'data',
                selected: true
            },
            {
                index: 8,
                name: 'Bids',
                type: 'data',
                selected: false
            },
            {
                index: 9,
                name: 'Win Rate',
                type: 'data',
                selected: false
            },
            {
                index: 10,
                name: 'View-Through Actions',
                type: 'data',
                selected: false
            },
            {
                index: 11,
                name: 'Click-Through Actions',
                type: 'data',
                selected: false
            },
            {
                index: 12,
                name: 'CPAV',
                type: 'data',
                selected: false
            },
            {
                index: 13,
                name: 'CPAC',
                type: 'data',
                selected: false
            },
            {
                index: 14,
                name: 'CPA',
                type: 'data',
                selected: false
            },
            {
                index: 15,
                name: 'Avg. Clear Price',
                type: 'data',
                selected: pricing === 'CPC'
            }
        ],
        'networkAdmin': [
            {
                index: 1,
                name: 'Impressions',
                type: 'data',
                selected: true
            },
            {
                index: 2,
                name: 'Spend',
                type: 'data',
                selected: true
            },
            { 
                index: 3,
                name: 'CPM',
                type: 'data',
                selected: pricing === 'CPM'
            },
            {
                index: 4,
                name: 'Clicks',
                type: 'data',
                selected: true
            },
            {
                index: 5,
                name: 'CPC',
                type: 'data',
                selected: pricing === 'CPC'
            },
            {
                index: 6,
                name: 'CTR',
                type: 'data',
                selected: true
            },
            {
                index: 7,
                name: 'Total Actions',
                type: 'data',
                selected: true
            },
            {
                index: 8,
                name: 'Defaults',
                type: 'data',
                selected: true
            },
            {
                index: 9,
                name: 'Fill Rate',
                type: 'data',
                selected: true
            },
            {
                index: 10,
                name: 'Bids',
                type: 'data',
                selected: false
            },
            {
                index: 11,
                name: 'Win Rate',
                type: 'data',
                selected: false
            },
            {
                index: 12,
                name: 'View-Through Actions',
                type: 'data',
                selected: false
            },
            {
                index: 13,
                name: 'Click-Through Actions',
                type: 'data',
                selected: false
            },
            {
                index: 14,
                name: 'CPAV',
                type: 'data',
                selected: false
            },
            {
                index: 15,
                name: 'CPAC',
                type: 'data',
                selected: false
            },
            {
                index: 16,
                name: 'CPA',
                type: 'data',
                selected: false
            },
            {
                index: 17,
                name: 'Avg. Clear Price',
                type: 'data',
                selected: pricing === 'CPC'
            },
        ],
        'publisher': [
            {
                index: 1,
                name: 'Impressions',
                type: 'data',
                selected: true
            },
            {
                index: 2,
                name: 'Revenue',
                type: 'data',
                selected: true
            },
            {
                index: 3,
                name: 'RPM',
                type: 'data',
                selected: pricing === 'CPM'
            },
            {
                index: 4,
                name: 'Defaults',
                type: 'data',
                selected: true
            },
            {
                index: 5,
                name: 'Fill Rate',
                type: 'data',
                selected: true
            },
            {
                index: 6,
                name: 'Clicks',
                type: 'data',
                selected: true
            },
            {
                index: 7,
                name: 'RPC',
                type: 'data',
                selected: pricing === 'CPC'
            },
            {
                index: 8,
                name: 'CTR',
                type: 'data',
                selected: true
            },
            {
                index: 9,
                name: 'Total Actions',
                type: 'data',
                selected: true
            },
            {
                index: 10,
                name: 'View-Through Actions',
                type: 'data',
                selected: false
            },
            {
                index: 11,
                name: 'Click-Through Actions',
                type: 'data',
                selected: false
            },
            {
                index: 12,
                name: 'RPAV',
                type: 'data',
                selected: false
            },
            {
                index: 13,
                name: 'RPAC',
                type: 'data',
                selected: false
            },
            {
                index: 14,
                name: 'RPA',
                type: 'data',
                selected: false
            },
            {
                index: 15,
                name: 'Avg. Clear Price',
                type: 'data',
                selected: pricing === 'CPC'
            }
        ]
    });
