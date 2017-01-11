'use strict';

angular.module('advertiser').run(['Menus',
	function(Menus) {
		// Set top bar menu items
      Menus.addMenuItem('sidebar', 'Campaigns', 'advertiser/campaign', null, 'app.listCampaign', false, ['networkAdmin','advertiser'], 2, 'fa fa-bullhorn');

			Menus.addSubMenuItem('sidebar', 'advertiser/campaign', 'All Campaigns', 'advertiser/campaign', null, null, null, null, 'fa fa-bullhorn');

      Menus.addSubMenuItem('sidebar', 'advertiser/campaign', 'Create a New Campaign', 'advertiser/create/campaign', null, null, null, null, 'fa fa-plus');

      Menus.addSubMenuItem('sidebar', 'advertiser/campaign', 'My Campaign Drafts', 'advertiser/campaign-draft', null, null, null, null, 'fa fa-folder-open');

      Menus.addSubMenuItem('sidebar', 'advertiser/campaign', 'All Advertisers', 'advertiser', null, null, null, null, 'fa fa-sort');
      Menus.addSubMenuItem('sidebar', 'advertiser/campaign', 'Create a New Advertiser', 'advertiser/create', null, null, null, null, 'fa fa-plus');
	}
]);