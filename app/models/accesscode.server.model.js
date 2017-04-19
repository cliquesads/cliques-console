/* jshint node: true */ 'use strict';
/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto'),
    async = require('async'),
    _ = require('lodash'),
    user = require('./user.server.model'),
    billing = require('./billing.server.model'),
    Organization = require('./organization.server.model').Organization;

/**
 * Access codes for private beta to allow users to sign up
 * @type {Schema}
 */
var AccessCodeSchema = new Schema({
    code: {
        type: String,
        default: '',
        validate: [user.validateLocalStrategyPassword, 'Code should be longer'],
        unique: true,
        index: true
    },
    created: {
        type: Date,
        default: Date.now
    },
    active: { type: Boolean, default: true, required: true },
    fees: [billing.FeeSchema],
    promos: [billing.PromoSchema],
    // stuff to track who "issued" the access code, and what they get when it's used
    issuerOrgs: [{ type: Schema.ObjectId, ref: 'Organization'}],
    issuerSignupPromo: billing.PromoSchema,
    issuerCampaignPromo: billing.PromoSchema,
    issuerSitePromo: billing.PromoSchema
});

AccessCodeSchema.statics.validate = function(code, callback) {
    var _this = this;
    _this.findOne({ code: code }, function(err, code) {
        if (!err && code){
            var valid = true;
            callback(null, valid, code);
        } else {
            callback(err);
        }
    });
};

/**
 * Adds appropriate promos to issuer organizations and sends them an email letting them
 * know that their access code was redeemed.
 *
 * @param promoType either "Signup", "Campaign" or "Site"
 * @param callback gets (err, usersAndPromos).  usersAndPromos is array of
 * 		{ user: <User instance>, promo: <Promo instance> } objects
 * 		indicating which users to email messages to regarding promos issued.
 */
AccessCodeSchema.methods.redeemIssuerPromos = function(promoType, callback){
    var self = this;
    var promo;

    switch (promoType){
        case 'Signup':
            promo = self.issuerSignupPromo;
            break;
        case 'Campaign':
            promo = self.issuerCampaignPromo;
            break;
        case 'Site':
            promo = self.issuerSitePromo;
            break;
    }

    if (!_.isNil(this.issuerOrgs) && this.issuerOrgs.length > 0){
        Organization.find({ _id: this.issuerOrgs }, function(err, orgs){
            if (err) return callback(err);
            var parallel = [];
            // create parallel functions to add promos to org, save and email org owner
            orgs.forEach(function(issuerOrg){

                parallel.push(function(cb){
                    // inner function to find owner of org & push obj to results
                    var _inner = function(err, o){
                        if (err) return cb(err);
                        User.findById(o.owner, function(err, user){
                            if (err) return cb(err);
                            // push user & promo object to results array
                            return cb(null, { user: user, promo: promo });
                        });
                    };

                    // push promo to org promos to be redeemed
                    if (promo && promo.active){
                        issuerOrg.promos.push(promo);
                        issuerOrg.save(function(err,issuerOrg){
                            _inner(err,issuerOrg);
                        });
                    } else {
                        _inner(err, issuerOrg);
                    }
                });
            });
            async.parallel(parallel, callback);
        });
    }
};

exports.AccessCode = mongoose.model('AccessCode', AccessCodeSchema);
