const mongoose = require('mongoose');
const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel');
const Wishlist = require('../../models/wishlistModel');
const Category = require('../../models/categoryModels');
const User = require('../../models/userModel'); // Import User model

// Load product page
const productLoad = async (req, res) => {
  try {
    let cartCount = 0;
    let wishlistCount = 0;
    let totalPrice = 0;
    let userData = null;
    let items = [];

    const sortOption = req.query.sort || 'default';
    const page = parseInt(req.query.page) || 1;
    const limit = 9; // Number of products per page
    const skip = (page - 1) * limit;
    let sortQuery = {};

    // Sorting Logic
    switch (sortOption) {
      case 'price-asc':
        sortQuery = { discountprice: 1 };
        break;
      case 'price-desc':
        sortQuery = { discountprice: -1 };
        break;
      case 'newest':
      case 'new-arrivals':
        sortQuery = { createdAt: -1 };
        break;
      case 'a-z':
        sortQuery = { name: 1 };
        break;
      case 'z-a':
        sortQuery = { name: -1 };
        break;
      default:
        sortQuery = {};
    }

    const allCategories = await Category.find({});
    const priceRanges = req.query.priceRange ? [].concat(req.query.priceRange) : [];
    const categories = req.query.categories ? [].concat(req.query.categories) : [];
    let filterQuery = { is_listed: true };

    // Price Range Filtering Logic
    if (priceRanges.length > 0) {
      filterQuery.$or = priceRanges.map((range) => {
        const [min, max] = range.split('-');
        return max === 'above' ? { discountprice: { $gte: parseInt(min) } } : { discountprice: { $gte: parseInt(min), $lte: parseInt(max) } };
      });
    }

    // Category Filtering Logic
    if (categories.length > 0) {
      filterQuery.category = { $in: categories };
    }

    if (req.session.user_id) {
      userData = await User.findById(req.session.user_id);
      if (userData) {
        const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
        if (cart) {
          items = cart.items;
          cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
          totalPrice = items.reduce((sum, item) => sum + item.quantity * (item.product.offerPrice || item.product.discountprice), 0);
        }
        const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
        if (wishlist) {
          items = wishlist.items;
          wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
        }
      }
    }

    const totalProducts = await Product.countDocuments(filterQuery);
    const productData = await Product.find(filterQuery)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();

    productData.forEach((product) => {
      if (product.offerPrice) {
        product.offerPercentage = Math.round(((product.originalprice - product.offerPrice) / product.originalprice) * 100);
      } else {
        product.offerPercentage = 0;
      }
    });

    res.render('products', {
      items,
      user: userData,
      products: productData,
      cartCount,
      wishlistCount,
      totalPrice: totalPrice.toFixed(2),
      totalProducts,
      sortOption,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      selectedPriceRanges: priceRanges,
      selectedCategories: categories,
      categories: allCategories,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
};

// Load product details page
const loadProductDetail = async (req, res) => {
  let cartCount = 0;
  let wishlistCount = 0;
  let totalPrice = 0;
  let userData = null;
  let items = [];

  try {
    const { id } = req.query;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid product ID');
    }

    if (req.session.user_id) {
      userData = await User.findById(req.session.user_id);
      if (userData) {
        const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
        if (cart) {
          items = cart.items;
          cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
          totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
        }
        const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
        if (wishlist) {
          items = wishlist.items;
          wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
        }
      }
    }

    const productData = await Product.findById(id);
    if (!productData) {
      return res.status(404).send('Product not found');
    }

    const relatedProducts = await Product.find({ category: productData.category }).limit(4);

    res.render('product-detail', {
      products: productData,
      relatedProducts,
      user: userData,
      cartCount,
      wishlistCount,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ message: 'Error fetching product details', error });
  }
};

// Search product
const searchProduct = async (req, res) => {
  try {
    let userData = null;
    let cartCount = 0;
    let totalPrice = 0;
    let wishlistCount = 0;
    let items = [];

    const query = req.query.query;
    const sortOption = req.query.sort || 'default';
    const page = parseInt(req.query.page) || 1;
    const limit = 9; // Number of products per page
    const skip = (page - 1) * limit;

    let sortQuery = {};

    // Sorting Logic
    switch (sortOption) {
      case 'price-asc':
        sortQuery = { discountprice: 1 };
        break;
      case 'price-desc':
        sortQuery = { discountprice: -1 };
        break;
      case 'newest':
      case 'new-arrivals':
        sortQuery = { createdAt: -1 };
        break;
      case 'a-z':
        sortQuery = { name: 1 };
        break;
      case 'z-a':
        sortQuery = { name: -1 };
        break;
      default:
        sortQuery = {};
    }

    const priceRanges = req.query.priceRange ? [].concat(req.query.priceRange) : [];
    const categories = req.query.categories ? [].concat(req.query.categories) : [];
    const allCategories = await Category.find({});

    if (req.session.user_id) {
      userData = await User.findById(req.session.user_id);
      if (userData) {
        const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
        if (cart) {
          items = cart.items;
          cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
          totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
        }
        const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
        if (wishlist) {
          items = wishlist.items;
          wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
        }
      }
    }

    const totalProducts = await Product.countDocuments({ name: new RegExp(query, 'i') });
    const products = await Product.find({ name: new RegExp(query, 'i') })
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    res.render('products', {
      items,
      user: userData,
      products,
      cartCount,
      totalPrice: totalPrice.toFixed(2),
      totalProducts,
      sortOption,
      currentPage: page,
      totalPages: Math.ceil(totalProducts / limit),
      selectedPriceRanges: priceRanges,
      selectedCategories: categories,
      categories: allCategories,
      wishlistCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  loadProductDetail,
  productLoad,
  searchProduct,
};
