const Coupon = require('../models/couponModel');
const moment = require('moment')
const { check } = require('express-validator');

const couponValidator = [
  check('code')
    .notEmpty().withMessage('Coupon code is required.')
    .isLength({ min: 3 }).withMessage('Coupon code must be at least 3 characters long.'),

  check('discount')
    .notEmpty().withMessage('Discount is required.')
    .isNumeric().withMessage('Discount must be a number.')
    .isInt({ min: 1, max: 100 }).withMessage('Discount must be a Valid percentage.'),

  check('maxDiscount')
    .notEmpty().withMessage('Maximum Discount Amount is required.')
    .isNumeric().withMessage('Maximum Discount Amount must be a number.'),
  check('expirationDate')
    .optional({ checkFalsy: true })
    .isISO8601().withMessage('Expiration date must be a valid date.')
    .custom((value) => {
      if (moment(value).isBefore(moment(), 'day')) {
        throw new Error('Expiration date must be on or after the current date.');
      }
      return true;
    }),
];


module.exports = { couponValidator };

