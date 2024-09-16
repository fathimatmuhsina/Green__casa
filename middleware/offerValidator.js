// middlewares/offerValidator.js
const moment = require('moment')
const { check } = require('express-validator');

const offerValidator = [
  // Validate name
  check('name')
    .notEmpty().withMessage('Offer name is required.')
    .isLength({ min: 3 }).withMessage('Offer name must be at least 3 characters long.'),

  // Validate type
  check('type')
    .notEmpty().withMessage('Offer type is required.')
    .isIn(['product', 'category', 'referral']).withMessage('Invalid offer type.'),

  // Validate discount
  check('discount')
    .notEmpty().withMessage('Discount is required.')
    .isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100.'),

  // Validate productId if type is product
  check('productId')
    .if(check('type').equals('product'))
    .notEmpty().withMessage('Product is required for product offers.'),

  // Validate categoryId if type is category
  check('categoryId')
    .if(check('type').equals('category'))
    .notEmpty().withMessage('Category is required for category offers.'),

  // Validate referralCode if type is referral
  check('referralCode')
    .if(check('type').equals('referral'))
    .notEmpty().withMessage('Referral code is required for referral offers.'),

  // Validate expirationDate
  check('expirationDate')
    .optional({ checkFalsy: true }) // Allows the field to be optional
    .isISO8601().withMessage('Expiration date must be a valid date.') // Ensures it's a valid date format
    .custom((value) => {
      if (moment(value).isBefore(moment(), 'day')) {
        throw new Error('Expiration date must be on or after the current date.');
      }
      return true;
    }),
  // Handle validation results

];

module.exports = offerValidator;
