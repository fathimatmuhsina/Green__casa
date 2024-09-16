const { check } = require('express-validator');
const User = require('../models/userModel'); // Ensure the path is correct

const passwordValidationRule=[
  check('password')
      .isLength({ min: 8}).withMessage('Password must be at least 8 characters long')
      .notEmpty().withMessage('password is required')
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
module.exports = passwordValidationRule

