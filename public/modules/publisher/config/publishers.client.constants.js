angular.module('publisher')
    .constant('BID_FLOOR_SETTINGS', {
        // Set mins & maxes
        min_bid_floor: 1,
        max_bid_floor: 5
    })
    .constant('PUBLISHER_TOOLTIPS',{
        budget: "Tell us how much money you would like to spend over the lifetime of this campaign.  Don't worry, our bidders will pace your budget evenly over the lifetime of the campaign (set below)",
        bid_floor: "The lowest price at which you're willing to sell impressions on your site, in CPM (Cost per Thousand Impressions). For the best fill rates, we recommend NOT setting this.",
        domain_name: "The base domain name associated with your site.",
        blacklist: "Let us know if there are any advertisers who are not allowed to purchase impressions on your site due to direct-sale or content restrictions.  Note: You must use the advertiser's domain name in order to ensure they are uniquely identified.",
        page_url: "The URL for this particular page.  If the URL is dynamic you can just use placeholders, e.g. http://example.com/[DATE]/[POST_NAME]"
    })
    .constant('TAG_TYPES',{
        iframe: {
            displayName: 'iFrame',
            description: 'Our iFrame tags load ads asynchronously and require marginally less bandwidth than JavaScript tags. ' +
                'However, they are not supported by a small percentage of internet browsers.'
        },
        javascript: {
            displayName : 'JavaScript',
            description: 'Our JavaScript tags load ads asynchronously and are supported by virtually all browsers, but ' +
                'require about 2KB of additional bandwidth per page-load.'
        }
    })
    .constant('PLACEMENT_TYPES',{
        display: {
            displayName: 'Display',
            description: 'Standard IAB Banner ads. Choose from a list of supported dimensions to create a placement with a fixed height & width. ' +
                'In general, display ads yield lower CPM\'s, but are easier to implement.'
        },
        native: {
            displayName : 'Native',
            description: 'Ads that are custom-styled to resemble a piece of content on your site. No fixed dimensions & styling is totally custom. ' +
                'Higher CPM\'s but slightly more integration work.'
        }
    })
    .constant('NATIVE_POSITIONS', [
        // TODO: Replace w/ IAB codes if there are any
        {name: "In-Stream", code: 99},
        {name: "Sidebar", code: 100},
        {name: "Beneath Content", code: 101},
        {name: "Above Content", code: 102}
    ])
    .constant('DEFAULT_TYPES',{
        passback: {
            name: 'Passback Tag',
            description: 'A snippet of HTML code to be called. Common examples: DFP Passback Tags, affiliate links, etc.',
            icon: 'fa fa-exchange',
            tagTypes: ['javascript','iframe']
        },
        'hostedCreative': {
            name: 'Custom Creative',
            description: 'An uploaded image that fits this placement\'s dimensions.',
            icon: 'fa fa-picture-o',
            tagTypes: ['javascript','iframe']
        },
        'hide': {
            name: 'Hide',
            description: 'Ad unit collapses & goes away.',
            icon: 'icon-ghost',
            tagTypes: ['javascript']
        }
    });
