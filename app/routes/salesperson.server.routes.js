/* jshint node: true */
'use strict';

module.exports = function(db, routers) {
    const salesperson = require('../controllers/salesperson.server.controller')(db);
    const router = routers.apiRouter;

    router.param('salesPersonId', salesperson.salesPersonByID);

    /**
     * @apiDefine SalesPersonSchema
     * @apiParam (Body (SalesPerson Schema)) {ObjectId} [id]      SalesPerson ID. Will be auto-generated for new salespersons
     * @apiParam (Body (SalesPerson Schema)) {String} [created=Date.now] Date created
     * @apiParam (Body (SalesPerson Schema)) {String} firstName   First name of salesPerson
     * @apiParam (Body (SalesPerson Schema)) {String} lastName   Last name of salesPerson
     * @apiParam (Body (SalesPerson Schema)) {String} [email]     Optional email address of salesPerson
     * @apiParam (Body (SalesPerson Schema)) {String} [user]     Optional ref to User object for this salesPerson. Use if this sales person also
     *  has a Cliques account.
     * @apiParam (Body (SalesPerson Schema)) {String} [externalId]  Optional externalID for external mapping/tracking purposes
     */
    router.route('/salesperson')
        /**
         * @api {post} /salesperson Create a New Salesperson
         * @apiName CreateSalesPerson
         * @apiGroup SalesPerson
         * @apiDescription Create a new SalesPerson.
         *  Pass a new SalesPerson object in the request `body`.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiUse SalesPersonSchema
         *
         * @apiSuccess {Object} SalesPerson SalesPerson object as response body
         */
        .post(salesperson.create)
        /**
         * @api {get} /salesperson Get All SalesPersons
         * @apiName GetSalesPersons
         * @apiGroup SalesPerson
         * @apiDescription Get all salespersons available to your account. If you're a networkAdmin,
         *  this will be all salespersons, if you're not, it will just be salespersons you've created
         *  as the `issuerOrg`.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiSuccess {Object[]} ::salesPersons:: Array of SalesPersons as response `body` (see [above](#api-SalesPerson)
         *  for all fields).
         */
        .get(salesperson.getMany);

    router.route('/salesperson/:salesPersonId')
        /**
         * @api {get} /salesperson/:salesPersonId Get One Salesperson
         * @apiName ReadSalesPerson
         * @apiGroup SalesPerson
         * @apiDescription Gets a single salesperson.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters){String} salesPersonId ObjectID of SalesPerson
         *
         * @apiSuccess {Object} ::salesPerson:: SalesPerson object as response body (see [above](#api-SalesPerson)
         *  for all fields).
         */
        .get(salesperson.hasAuthorization, salesperson.read)
        /**
         * @api {patch} /salesperson/:salesPersonId Update Salesperson
         * @apiName UpdateSalesPerson
         * @apiGroup SalesPerson
         * @apiDescription Updates an [SalesPerson](#api-SalesPerson) by ID. SalesPerson will be updated completely
         *  with the contents of request `body`.
         *
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters){String} salesPersonId ObjectID of SalesPerson
         *
         * @apiSuccess {Object} ::salesPerson:: Updated SalesPerson object as response body (see [above](#api-SalesPerson)
         *  for all fields).
         */
        .patch(salesperson.hasAuthorization, salesperson.update)
        /**
         * @api {delete} /salesperson/:salesPersonId Remove SalesPerson
         * @apiName RemoveSalesPerson
         * @apiGroup SalesPerson
         * @apiDescription Removes an [SalesPerson](#api-SalesPerson) by ID.
         * @apiVersion 0.1.0
         * @apiPermission networkAdmin
         *
         * @apiParam (Path Parameters){String} salesPerson ObjectID of SalesPerson
         *
         * @apiSuccess {Object} ::salesperson:: SalesPerson object that was just removed as response `body`
         */
        .delete(salesperson.hasAuthorization, salesperson.remove);

};