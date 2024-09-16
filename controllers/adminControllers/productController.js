const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModels');
const path = require('path');
const fs = require('fs');

// Show paginated products
const adminProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    const productData = await Product.find()
      .populate('category')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const categoryData = await Category.find({ status: true });

    res.render('view-products', {
      products: productData,
      category: categoryData,
      currentPage: page,
      totalPages,
      limit
    });
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

// Load new products page
const newProductsLoad = async (req, res) => {
  try {
    const categoryData = await Category.find({ status: true });
    res.render('add-products', { category: categoryData, errors: null });
  } catch (error) {
    console.error('Error loading new products page:', error.message);
    res.status(500).send('Server Error');
  }
};

// Add new product
const addProducts = async (req, res) => {
  const errors = validationResult(req);
  const { name, description, category, originalprice, discountprice, stock } = req.body;

  if (!errors.isEmpty()) {
    return res.render('add-products', {
      name,
      description,
      category,
      originalprice,
      discountprice,
      stock,
      errors: errors.mapped()
    });
  }

  try {
    const image = req.files ? req.files.map(file => file.filename) : [];

    const product = new Product({
      image,
      name,
      description,
      category,
      discountprice,
      originalprice,
      stock,
      is_listed: true
    });

    const productData = await product.save();

    req.flash('addsuccess', 'New Product Added successfully.');
    res.redirect('/admin/view-products');
  } catch (error) {
    console.error('Error saving product:', error.message);
    res.status(500).send('An error occurred during new product creation.');
  }
};

// Load product details page
const productDetailLoad = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid product ID');
    }
    const productData = await Product.findById(id);
    const categoryData = await Category.find({ status: true });

    if (productData) {
      res.render('view-product-details', { products: productData, category: categoryData, errors: null });
    } else {
      res.redirect('/admin/view-products');
    }
  } catch (error) {
    console.error('Error loading product details:', error.message);
    res.status(500).send('Server Error');
  }
};

// Load edit product page
const editProductLoad = async (req, res) => {
  try {
    const id = req.query.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid product ID');
    }
    const productData = await Product.findById(id);
    const categoryData = await Category.find({ status: true });

    if (productData) {
      res.render('edit-product', { products: productData, category: categoryData, errors: null });
    } else {
      res.redirect('/admin/view-products');
    }
  } catch (error) {
    console.error('Error loading edit product page:', error.message);
    res.status(500).send('Server Error');
  }
};

// Update product details
const updateProduct = async (req, res) => {
  const errors = validationResult(req);
  const productId = req.body.id;

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.redirect('/admin/view-products');
  }

  try {
    let product = await Product.findById(productId);
    const categoryData = await Category.find({ status: true });

    if (!errors.isEmpty()) {
      return res.render('edit-product', {
        category: categoryData,
        products: product,
        errors: errors.mapped()
      });
    }

    let {
      existingImages = [],
      deletedImages = [],
      name,
      description,
      category,
      originalprice,
      discountprice,
      offerPrice,
      stock
    } = req.body;

    if (!Array.isArray(existingImages)) {
      existingImages = [existingImages];
    }

    if (!Array.isArray(deletedImages)) {
      deletedImages = [deletedImages];
    }

    // Remove deleted images from server
    deletedImages.forEach(image => {
      try {
        fs.unlinkSync(path.join(__dirname, '../public/images', image));
      } catch (error) {
        console.error(`Error deleting image file: ${image}`, error);
      }
    });

    // Collect all images, existing and new
    const allImages = [...existingImages];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        allImages.push(file.filename);
      });
    }

    if (allImages.length === 0) {
      return res.render('edit-product', {
        category: categoryData,
        products: product,
        errors: { image: { msg: 'At least one image is required.' } }
      });
    }

    // Update product data
    product = await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          image: allImages,
          name,
          description,
          category,
          originalprice,
          offerPrice,
          discountprice,
          stock
        }
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).send('Product not found');
    }

    res.render('edit-product', {
      products: product,
      category: categoryData,
      message: 'Product updated successfully!',
      errors: null
    });
  } catch (error) {
    console.error('Error updating product:', error.message);
    res.status(500).send('Server Error');
  }
};

// Toggle product status between listed and unlisted
const toggleProductStatus = async (req, res, next) => {
  const id = req.params.id;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    product.is_listed = !product.is_listed;
    await product.save();
    res.redirect('/admin/view-products');
  } catch (error) {
    console.error('Error toggling product status:', error.message);
    res.status(500).send('Internal Server Error');
    next(error);
  }
};

// View inventory with pagination
const viewInventory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;

    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.render('inventory', {
      products,
      errors: null,
      currentPage: page,
      totalPages,
      limit
    });
  } catch (error) {
    console.error('Error viewing inventory:', error.message);
    res.status(500).send('Server Error');
  }
};

// Update product stock
const updateStock = async (req, res) => {
  const errors = validationResult(req);
  const { productId, stock } = req.body;

  try {
    if (!errors.isEmpty()) {
      const products = await Product.find().lean();
      return res.render('inventory', {
        products,
        errors: errors.array(),
        currentPage: req.query.page || 1,
        totalPages: Math.ceil(await Product.countDocuments() / (req.query.limit || 10)),
        limit: req.query.limit || 10
      });
    }

    if (!productId || stock === undefined) {
      return res.status(400).send('Missing product ID or stock');
    }

    await Product.findByIdAndUpdate(productId, { stock });

    res.redirect(`/admin/inventory?page=${req.query.page || 1}&limit=${req.query.limit || 10}&success=Stock updated successfully`);
  } catch (error) {
    console.error('Error updating stock:', error.message);
    res.status(500).send('Error updating stock');
  }
};

module.exports = {
  viewInventory,
  updateStock,
  newProductsLoad,
  addProducts,
  adminProducts,
  editProductLoad,
  updateProduct,
  toggleProductStatus,
  productDetailLoad
};
