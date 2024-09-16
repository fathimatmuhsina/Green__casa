const { check } = require('express-validator');
const User = require('../models/userModel'); // Ensure the path is correct

const userValidationRules = 
  [
    check('name')
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2 }).withMessage('Username must be at least 2 characters long')
      .matches(/[a-zA-Z]/).withMessage('Username can only contain letters'),
    check('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address')
      .custom(async (value) => {
        const user = await User.findOne({ email: value });
        if (user) {
          return Promise.reject('Email is already in use');
        }
        return true;
      }),
    check('mobile')
      .notEmpty().withMessage('Mobile Number is required')
      .isLength(10).withMessage('Invalid Mobile number')
      .matches(/[0-9]/).withMessage('Invalid mobile  number')
      .custom(async (value) => {
        const user = await User.findOne({ mobile: value });
        if (user) {
          return Promise.reject('This mobile number is already in use');
        }
        return true;
      }),
        check('password')
        .notEmpty().withMessage('password is required')

    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    check('confirmPassword')
    .custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords do not match');
        }
        return true;
    }),
    
  ]

  const addUserValidationRule=
  [
    check('name')
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2 }).withMessage('Username must be at least 2 characters long')
      .matches(/[a-zA-Z]/).withMessage('Username can only contain letters'),
      check('email')
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email address')
      .custom(async (value, { req }) => {
        const user = await User.findOne({ email: value });
        if (user && user._id.toString() !== req.body.user_id) {
          return Promise.reject('Email is already in use');
        }
        return true;
      }),
    
    check('mobile')
      .notEmpty().withMessage('Mobile Number is required')
      .isLength({ min: 10, max: 10 }).withMessage('Invalid Mobile number')
      .matches(/[0-9]/).withMessage('Invalid mobile number')
      .custom(async (value, { req }) => {
        const user = await User.findOne({ mobile: value });
        if (user && user._id.toString() !== req.body.user_id) {
          return Promise.reject('This mobile number is already in use');
        }
        return true;
      }),
    ]


module.exports = {
  userValidationRules,
  addUserValidationRule
}


