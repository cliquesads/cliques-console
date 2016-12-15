/* jshint node: true */ 'use strict';
var users = require('../controllers/users.server.controller');

module.exports = function(db, routers){
    var cliques = require('../controllers/cliques.server.controller')(db);
    var router = routers.apiRouter;

    /**
     * @apiDefine CliqueSchema
     * @apiParam (Body (Clique Schema)) {String} id     Clique ID. For Cliques, `id` is the Clique name due to the "array of ancestors"
     *  tree representation structure used. See [here](http://docs.mongodb.org/manual/tutorial/model-tree-structures-with-materialized-paths/)
     *  for more details on this model structure (it's similar to a "closure"-style SQL table).
     * @apiParam (Body (Clique Schema)) {Boolean} [active=false]    Active flag for Clique.
     * @apiParam (Body (Clique Schema)) {String} [tstamp=Date.now]  UTC timestamp of object creation. Not currently updated on
     *  object modification.
     * @apiParam (Body (Clique Schema)) {String[]} ancestors    Array of `id`'s of Clique ancestors, ordered in reverse proximity
     *  (i.e. `[<most_distant_ancestor>, ..., <immediate_parent>]`).
     * @apiParam (Body (Clique Schema)) {String} [parent=null]   `id` of immediate parent Clique. `null` value indicates that this
     *  is a root Clique.
     * @apiParam (Body (Clique Schema)) {Object} [bidder]   Each Clique has its own bidder (server that handles real-time-bidding, and
     *  in which bidding agent for each Campaign in this Clique is spun up). This field contains the networking URL's used by
     *  the Exchange server to direct bid requests.
     * @apiParam (Body (Clique Schema)) {String} bidder.url URL to send bid requests to.
     * @apiParam (Body (Clique Schema)) {String} bidder.nurl URL to send win notifications to.
     * @apiParam (Body (Clique Schema)) {String[]} [default_advertisers]    **TO BE DEPRECATED, DO NOT USE**
     */

    /* ---- Advertiser API Routes ---- */
    router.route('/clique')
        /**
         * @api {post} /publisher Create a New Clique
         * @apiName CreateClique
         * @apiGroup Clique
         * @apiDescription Create a new Clique.  Pass a new Clique object in the request `body`.
         *
         * ## WTF is a Clique?
         * A Clique is basically an object representing a special interest category.  Each Clique is part of a
         * specific Clique taxonomy, and is what connects [Advertisers](#api-Advertiser) & [Publishers](#api-Publisher).
         * Campaigns & Sites are required to specify a Clique to which they belong.
         *
         * Campaigns in a Clique get first-priority bid access to impressions from Sites in the same Clique,
         * and lower-priority bid access to impressions from Sites in child Cliques. This design is loosely referred to
         * as [Bottom-Up Bidding](http://support.cliquesads.com/article/24-what-is-bottom-up-bidding).
         *
         * Currently, only **networkAdmins** can create or modify Cliques.
         *
         * @apiUse CliqueSchema
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiSuccess {Object} ::clique:: Newly-created Clique object as response `body` (see [above](#api-Clique)
         *  for all fields).
         */
        .post(cliques.hasAuthorization, cliques.create)
        /**
         * @api {get} /clique Get All Cliques
         * @apiName GetAllCliques
         * @apiGroup Clique
         * @apiDescription Get all Cliques.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiSuccess {Object[]} ::cliques:: Array of all Cliques objects as response `body` (see [above](#api-Clique)
         *  for all fields).
         */
        .get(cliques.getMany)
        /**
         * @api {put} /clique Update or Create Clique (TO BE DEPRECATED)
         * @apiName UpdateOrCreateClique
         * @apiGroup Clique
         * @apiDescription Update or Create Clique. (**TO BE DEPRECATED SOON**, along with all "update or create" endpoints,
         *  which I hate).
         *
         *  If Clique object in body has `id` param, will update that Clique with body.
         *  Otherwise, will behave the same away as [CreateClique](#api-Clique-CreateClique).
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiParam (Body (Clique Schema)) {Object} ::clique:: Clique object as request `body` (see [above](#api-Clique) for all fields).
         *
         * @apiSuccess {Object} ::clique:: Clique object that was either updated or created as response `body`
         *  (see [above](#api-Clique) for all fields)..
         */
        .put(cliques.hasAuthorization, cliques.updateOrCreate);


    router.route('/clique/:cliqueId')
        /**
         * @api {get} /clique/:cliqueId Get One Clique
         * @apiName GetOneClique
         * @apiGroup Clique
         * @apiDescription Finds single [Clique](#api-Clique) by ID.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         * @apiPermission advertiser
         * @apiPermission publisher
         *
         * @apiParam (Path Parameters) {String} cliqueId `id` of Clique
         *
         * @apiSuccess {Object[]} ::clique:: Matching Clique object as response `body` (see [above](#api-Clique)
         * for all fields)..
         */
        .get(cliques.read)
        /**
         * @api {patch} /clique/:cliqueId Update Clique
         * @apiName UpdateClique
         * @apiGroup Clique
         * @apiDescription Updates a [Clique](#api-Clique) by ID. Clique will be updated completely
         *  with the contents of request `body`.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters) {String} cliqueId `id` of Clique
         *
         * @apiSuccess {Object[]} ::clique:: Updated Clique object as response `body` (see [above](#api-Clique)
         * for all fields)..
         */
        .patch(cliques.hasAuthorization, cliques.update)
        /**
         * @api {delete} /clique/:cliqueId Remove Clique
         * @apiName RemoveClique
         * @apiGroup Clique
         * @apiDescription Removes a [Clique](#api-Clique) by ID.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters) {String} cliqueId `id` of Clique
         *
         * @apiSuccess {Object[]} ::clique:: Removed Clique object as response `body` (see [above](#api-Clique)
         * for all fields). (TODO: sort of weird to return deleted advertiser object as response)
         */
        .delete(cliques.hasAuthorization, cliques.remove);

    router.param('cliqueId', cliques.cliqueByID);
};