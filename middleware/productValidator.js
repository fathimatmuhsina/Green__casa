const { check } = require('express-validator');
 
const updateProductRules = [
  check('name').notEmpty().withMessage('Name is required')
  .isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),

  check('description').notEmpty().withMessage('Description is required')
  .isLength({ min: 5 }).withMessage('Name must be at least 5 characters long'),
  
  check('category').notEmpty().withMessage('Category is required'),
  check('originalprice').isFloat({ gt: 0 }).withMessage('Enter a valid price'),
  check('discountprice')
    .isFloat({ gt: 0 })
    .withMessage('Enter a valid price')
    .custom((value, { req }) => {
      const originalPrice = parseFloat(req.body.originalprice);
      const discountPrice = parseFloat(value);
      if (discountPrice >= originalPrice) {
        throw new Error('Discount Price must be less than Original Price');
      }
      return true;
    }),
  check('stock').isInt({ gt: 0 }).withMessage('Enter a valid count'),
  check('image').custom((value, { req }) => {
    // Check if at least one image is provided
    if ((!req.files || req.files.length === 0) && (!req.body.existingImages || req.body.existingImages.length === 0)) {
      throw new Error('At least one image is required');
    }

    // Validate file type and size for each uploaded image
    if (req.files) {
      req.files.forEach(file => {
        if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
          throw new Error(`Invalid file type: ${file.originalname}. Only JPEG, PNG, WebP, and GIF are allowed.`);
        }
        if (file.size > 5 * 1024 * 1024) { // 5 MB limit
          throw new Error(`File too large: ${file.originalname}. Maximum size is 5MB.`);
        }
      });
    }
    
    return true;
  })
];



const productValidationRules = [ 
  check('name').notEmpty().withMessage('Name is required')
.isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),

check('description').notEmpty().withMessage('Description is required')
.isLength({ min: 5 }).withMessage('Name must be at least 5 characters long'),


  check('category').notEmpty().withMessage('Category is required'),
  check('originalprice').isFloat({ gt: 0 }).withMessage('Enter a valid price'),
  check('discountprice').isFloat({ gt: 0 }).withMessage('Enter a valid price')
    .custom((value, { req }) => {
      const originalPrice = parseFloat(req.body.originalprice);
      const discountPrice = parseFloat(value);
      if (discountPrice >= originalPrice) {
        throw new Error('Discount Price must be less than Original Price');
      }
      return true;
    }),
  check('stock').isInt({ gt: 0 }).withMessage('Enter a valid count'),
  
  // Custom image validation
  check('image').custom((value, { req }) => {
    if (!req.files || req.files.length === 0) {
      throw new Error('At least one image is required');
    }
    if (req.files.length > 5) {
      throw new Error('You can upload a maximum of 5 images');
    }
    req.files.forEach(file => {
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
        throw new Error(`Invalid file type: ${file.originalname}. Only JPEG, PNG, WEBP, and GIF are allowed.`);
      }
      if (file.size > 5 * 1024 * 1024) { // 5 MB limit
        throw new Error(`File too large: ${file.originalname}. Maximum size is 5MB.`);
      }
    });
    return true;
  })
];



const stockValidationRules=[
  check('stock').isInt({ gt: 0 }).withMessage('Enter a valid count'),

]
module.exports = {
  productValidationRules,
  updateProductRules,
  stockValidationRules
};
