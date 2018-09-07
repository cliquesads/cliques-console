'use strict';

angular.module('advertiser').run(['Menus',
	function(Menus) {
      // Set top bar menu items
      Menus.addMenuItem('sidebar', 'Campaigns', 'advertiser', null, 'app.advertiser.allAdvertisers', false, ['networkAdmin','advertiser'], 2, 'fa fa-bullhorn');
      Menus.addSubMenuItem('sidebar', 'advertiser', 'All Campaigns', 'advertiser', null, null, null, null, 'fa fa-bullhorn');
      Menus.addSubMenuItem('sidebar', 'advertiser', 'Create a New Campaign', 'new-campaign', null, null, null, null, 'fa fa-plus');
      Menus.addSubMenuItem('sidebar', 'advertiser', 'My Campaign Drafts', 'advertiser/campaign-draft', null, null, null, null, 'fa fa-folder-open');
      // Menus.addSubMenuItem('sidebar', 'all-campaigns', 'All Advertisers', 'advertiser', null, null, null, null, 'fa fa-sort');
      Menus.addSubMenuItem('sidebar', 'advertiser', 'Create a New Advertiser', 'advertiser/create', null, null, null, null, 'fa fa-plus');
	}
]);