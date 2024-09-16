const { check } = require('express-validator');
const profileValidator = [
  check('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 50 }).withMessage('Name must be less than 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name must contain only alphabetic characters and spaces'),
  check('mobile')
    .notEmpty().withMessage('Mobile number is required')
    .isLength({ min: 10, max: 10 }).withMessage('Mobile number must be exactly 10 digits')
    .isNumeric().withMessage('Mobile number must contain only digits')];

const addressValidator = [
  check('housename').notEmpty().withMessage('This is required').isLength({ max: 100 }).withMessage('House name must be less than 100 characters'),
  check('street').notEmpty().withMessage('This is required').isLength({ max: 100 }).withMessage('Street must be less than 100 characters'),
  check('city').notEmpty().withMessage('This is required').isLength({ max: 100 }).withMessage('City must be less than 100 characters'),
  check('state').notEmpty().withMessage('This is required').isLength({ max: 100 }).withMessage('State must be less than 100 characters'),
  check('country').notEmpty().withMessage('This is required').isLength({ max: 100 }).withMessage('Country must be less than 100 characters'),
  check('zipcode').notEmpty().isPostalCode('any').withMessage('Valid zip code is required'), // Use 'any' locale or specify a specific locale like 'US'
  check('mobile')
    .notEmpty().withMessage('Mobile number is required')
    .isLength({ min: 10, max: 10 }).withMessage('Mobile number must be exactly 10 digits')
    .isNumeric().withMessage('Mobile number must contain only digits')];


const changePasswordValidator = [
  check('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  check('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .notEmpty().withMessage('New password is required')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  check('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
];
module.exports = {
  profileValidator,
  addressValidator,
  changePasswordValidator
}    