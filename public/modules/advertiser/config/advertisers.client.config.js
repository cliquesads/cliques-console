'use strict';

angular.module('advertiser').run(['Menus',
	function(Menus) {
		// Set top bar menu items
      Menus.addMenuItem('sidebar', 'Campaigns', 'all-campaigns', null, 'app.advertiser.allCampaigns', false, ['networkAdmin','advertiser'], 2, 'fa fa-bullhorn');

      Menus.addSubMenuItem('sidebar', 'all-campaigns', 'All Campaigns', 'all-campaigns', null, null, null, null, 'fa fa-bullhorn');
      Menus.addSubMenuItem('sidebar', 'all-campaigns', 'Create a New Campaign', 'advertiser/create', null, null, null, null, 'fa fa-plus');
      Menus.addSubMenuItem('sidebar', 'all-campaigns', 'My Campaign Drafts', 'advertiser/campaign-draft', null, null, null, null, 'fa fa-folder-open');
      Menus.addSubMenuItem('sidebar', 'all-campaigns', 'All Advertisers', 'advertiser', null, null, null, null, 'fa fa-sort');
      Menus.addSubMenuItem('sidebar', 'all-campaigns', 'Create a New Advertiser', 'advertiser/create', null, null, null, null, 'fa fa-plus');
	}
]);