'use strict';

angular.module('advertiser').run(['Menus',
	function(Menus) {
		// Set top bar menu items
        Menus.addMenuItem('sidebar', 'Advertisers', 'advertiser', null, 'app.listAdvertiser', false, ['admin','advertiser'], 2, 'icon-bar-chart');
        Menus.addSubMenuItem('sidebar', 'advertiser', 'New Advertiser', 'advertiser/create');
        Menus.addMenuItem('sidebar', 'Campaigns', 'advertiser/campaign', null, 'app.listCampaign', false, ['admin','advertiser'], 2);
        Menus.addSubMenuItem('sidebar', 'advertiser/campaign', 'Drafts', 'advertiser/campaign-drafts');
	}
]);