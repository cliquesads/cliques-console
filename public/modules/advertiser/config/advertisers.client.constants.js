/* global _, angular, user, nativeSpecs, rootCliqueId */
angular.module('advertiser')
    .constant('BID_SETTINGS', {
        // Set mins & maxes
        min_base_bid: 1,
        max_base_bid: 20
    })
    .constant('MAX_CREATIVE_SIZE_KB',120)
    .constant('ADVERTISER_TOOLTIPS',{
        budget: "Tell us how much money you would like to spend over the lifetime of this campaign.  Don't worry, our bidders will pace your budget evenly over the lifetime of the campaign (set below)",
        base_bid: "Your base bid is what you'd like your average bid to be for qualified impressions.  (CPM = Cost per Thousand Impressions)",
        max_bid: "Your max bid is the absolute most amount you'd ever want to spend on an impression. All targeting settings will respect your max bid.  (CPM = Cost per Thousand Impressions)",
        view_lookback: "Match actions from this beacon to any impressions shown this many days prior (or more recently)",
        click_lookback: "Match actions from this beacon to any clicks that occurred this many days prior (or more recently)",
        actionbeacons: "View/Create Action Beacons, which are trackers that go on your website to track ad-effectiveness & ROI.",
        multi_bid: "Turn Multi-Bid OFF if you do not wish to bid for simultaneous impressions made available from a single Multi-Pane Native placement. Turn ON if you do."
    })
    .constant('REVIEW_TIME','2 - 4 Business Hours')
    .constant('THIRD_PARTY_CLIQUE_ID', 'Third Party')
    .constant('FIRST_PARTY_CLIQUE_ID', 'First Party')
    // TODO: resolve deploymentMode differences
    .constant('ROOT_CLIQUE_ID', rootCliqueId)
    .constant('NATIVE_SPECS', nativeSpecs);