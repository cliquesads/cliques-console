angular.module('advertiser')
    .constant('BID_SETTINGS', {
        // Set mins & maxes
        min_base_bid: 1,
        max_base_bid: 20
    })
    .constant('TOOLTIPS',{
        budget: "Tell us how much money you would like to spend over the lifetime of this campaign.  Don't worry, our bidders will pace your budget evenly over the lifetime of the campaign (set below)",
        base_bid: "Your base bid is what you'd like your average bid to be for qualified impressions.  (CPM = Cost per Thousand Impressions)",
        max_bid: "Your max bid is the absolute most amount you'd ever want to spend on an impression. All targeting settings will respect your max bid.  (CPM = Cost per Thousand Impressions)"
    });