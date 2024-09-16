const { check } = require('express-validator');
const Category = require('../models/categoryModels'); // Ensure the path is correct

const categoryValidationRules = [
  check('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 3 }).withMessage('Category name must be at least 3 characters long')
    .matches(/^[a-zA-Z0-9 ]+$/).withMessage('Name can only contain numbers, letters, and spaces')
    .custom(async (value, { req }) => {
      const category = await Category.findOne({
        name: { $regex: new RegExp(`^${value}$`, 'i') }, // Case-insensitive regex
        _id: { $ne: req.body.id } // Exclude the current category from the check
      });
      if (category) {
        throw new Error('Category name is already in use');
      }
      return true;
    }),
];

module.exports = categoryValidationRules;
