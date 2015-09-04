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
    });