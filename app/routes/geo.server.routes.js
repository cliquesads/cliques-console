/* jshint node: true */ 'use strict';

module.exports = function(db, routers){
	var users = require('../controllers/users.server.controller')(db);
    var geo = require('../controllers/geo.server.controller.js')(db);
    var router = routers.apiRouter;

    /**
     * @api {get} /[geo-endpoint] Geo Primer
     * @apiName GeoResources
     * @apiGroup Geo
     * @apiVersion 0.1.0
     * @apiDescription Geo resources are read-only endpoints to access geo data for **Countries, DMA's & Regions**,
     *  all of which are individual collections containing various geo metadata about each entity. These are primarily
     *  useful for populating user select lists for geo-targeting purposes, and populating geo aggregation results against
     *  (GeoAdStats)[#api-GetGeoAdStats].
     */

    /* ---- DMA API Routes ---- */
    router.route('/dma')
        /**
         * @api {get} /dma Get All DMAs (apiQuery)
         * @apiName GetAllDMAs
         * @apiGroup Geo.DMA
         * @apiDescription Gets all available DMAs. Supports all [apiQuery](https://github.com/ajb/mongoose-api-query)
         * parameters & filters, including pagination.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiSuccess {Object[]} ::dmas:: Array of all DMA objects as response `body` (see [above](#api-DMA)
         *  for all fields).
         */
        .get(geo.dma.getManyDmas);

    router.route('/dma/:dmaId')
        /**
         * @api {get} /dma/:dmaId Get DMA
         * @apiName DMA
         * @apiGroup Geo.DMA
         * @apiDescription Gets a single Designated Marketing Areas, or DMAs. DMAs are population regions
         *  in the USA that marketing people / statisticians cooked up like 50 years ago to roughly categorized all of the
         *  population centers in the USA. Marketing people still use them heavily, so here we are.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters){Number} dmaId Numerical DMA Code, which is the `_id` for the DMA object.
         *
         * @apiSuccess (Body){Number} _id dmaId Numerical DMA Code, which is the `_id` for the DMA object.
         * @apiSuccess (Body){String} name name of DMA, ex: `"Champaign & Springfield-Decatur, IL"`
         * @apiSuccess (Body){Number} code same as `_id`, of questionable value right now
         */
        .get(geo.dma.readDma);

    router.param('dmaId', geo.dma.dmaByID);

    /* ---- Country API Routes ---- */
    router.route('/country')
        /**
         * @api {get} /country Get All Countries (apiQuery)
         * @apiName GetAllCountries
         * @apiGroup Geo.Country
         * @apiDescription Gets all available Countries. Supports all [apiQuery](https://github.com/ajb/mongoose-api-query)
         * parameters & filters, including pagination.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiSuccess {Object[]} ::countries:: Array of all Country objects as response `body` (see [above](#api-Country)
         *  for all fields).
         */
        .get(geo.country.getManyCountries);

    router.route('/country/getGeoChildren')
        /**
         * @api {get} /getGeoChildren For a given country, get all its cities populating the region field
         * @apiName GetGeoChildren
         * @apiGroup Geo
         * @apiDescription For a given country, get all its cities populating the region field
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam {Object} geo object with the following format:
         * {
         *    id: 'USA',
         * }
         *
         * @apiSuccess {Object[]} an array containing all cities with regions populated in this country
         */
        .get(geo.country.getGeoChildren);

    router.route('/country/:countryId')
        /**
         * @api {get} /country/:countryId Get Country
         * @apiName Country
         * @apiGroup Geo.Country
         * @apiDescription Gets a single Country object, which represents...well a country in the world. Contains some
         *  metadata about the country including continent & various ISO codes, as well as name.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters){String} countryId ISO-3166 Alpha-3 Country Code as `_id`
         *
         * @apiSuccess (Body){String} _id ISO-3166 Alpha-3 Country Code as `_id`
         * @apiSuccess (Body){String} name name of Country, ex: `"United States of America"`
         * @apiSuccess (Body){String} alpha2code ISO-3166 Alpha-2 2 letter alternative country code
         * @apiSuccess (Body){String} continent name of continent the country belongs to
         * @apiSuccess (Body){String} continentCode 2-letter code of continent the country belongs to
         */
        .get(geo.country.readCountry);

    router.param('countryId', geo.country.countryByID);

    /* ---- Region API Routes ---- */
    router.route('/region')
        /**
         * @api {get} /region Get All Regions (apiQuery)
         * @apiName GetAllRegions
         * @apiGroup Geo.Region
         * @apiDescription Gets all available Regions. Supports all [apiQuery](https://github.com/ajb/mongoose-api-query)
         * parameters & filters, including pagination.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiSuccess {Object[]} ::regions:: Array of all Region objects as response `body` (see [above](#api-Region)
         *  for all fields).
         */
        .get(geo.region.getManyRegions);

    router.route('/region/getCities')
        /**
         * @api {get} /region/getCities Get All cities for given region (apiQuery)
         * @apiName GetRegionCities
         * @apiGroup Geo.Region
         * @apiDescription Gets all available cities for given region. Supports all [apiQuery](https://github.com/ajb/mongoose-api-query)
         * parameters & filters, including pagination.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiSuccess {Object[]} ::cities:: Array of all City objects as response `body` (see [above](#api-Region)
         *  for all fields).
         */
        .get(geo.region.getCities);

    router.route('/region/updateRegionId')
        /**
         * This is a one time thing, its function is to update region ids for `Australia` so that region ids in regions collection are consistent to those in city collections for Australia
         * Currently in database, the region ids in region collection are `AUS-1`, `AUS-2 and etc, yet region ids in city collection are `AUS-01`, `AUS-02`...
         */
        .get(geo.region.updateRegionId);

    router.route('/region/:regionId')
        /**
         * @api {get} /region/:regionId Get Region
         * @apiName Region
         * @apiGroup Geo.Region
         * @apiDescription Gets a single Region object, which is a first-level subdivision of a country, i.e.
         *  states, provinces, etc.
         *
         *  **NOTE**: Composite country code / region code key is used for ID because region ID's provided by Maxmind
         *  GeoIP database are not universally unique, only unique per country. So had to use this hack to create a
         *  unique identifier.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters){String} regionId Composite key of {ISO-3166 Alpha-3 Country Code}-{Maxmind Region Code}
         *
         * @apiSuccess (Body){String} _id Composite key of {ISO-3166 Alpha-3 Country Code}-{Maxmind Region Code}
         * @apiSuccess (Body){String} name name of Region, ex: `"Texas"`
         * @apiSuccess (Body){String} country ISO-3166 Alpha-3 code of country the region belongs to (FK to Country)
         * @apiSuccess (Body){String} code Maxmind region code
         */
        .get(geo.region.readRegion)
        /**
         * @api {patch} /region Update geo-coordinates for region (apiQuery)
         * @apiName updateRegion
         * @apiGroup Geo.Region
         * @apiDescription Update geo-coordinates for region. Supports all [apiQuery](https://github.com/ajb/mongoose-api-query)
         * parameters & filters, including pagination.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam ({Object}) ::region:: region object
         * @apiSuccess {Object} ::region:: saved region object
         *  for all fields).
         */
        .patch(geo.region.update);

    router.param('regionId', geo.region.regionByID);

    /* ---- City API Routes ---- */
    router.route('/city')
        /**
         * @api {get} /city Get cities based on given city names
         * @apiName GetCities
         * @apiGroup Geo.CITY
         * @apiDescription Gets cities based on given city names. Supports all [apiQuery](https://github.com/ajb/mongoose-api-query)
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam ([String]) ::city names:: required city names
         * @apiSuccess {Object[]} ::cities:: Array of cities objects as response `body` (see [above](#api-CITY)
         *  for all fields).
         */
        .get(geo.city.getManyCities)
        /**
         * @api {post} /city Create new city/cities by given city name(s), country/region(countries/regions) and queried geo coordinates
         * @apiName createCity
         * @apiGroup Geo.CITY
         * @apiDescription Receives city name, country and region from client, then query geocode API to get geo-coordinates for the city, then save the city model in database. Allows batch city creation
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam ({Object} or Object[]) ::city name/country/region:: city name, country and region info
         * @apiSuccess {Object} or Object[] ::city:: the successfully saved city model that contains its geo coordinates
         */
        .post(geo.city.create);

};
