const Cart = require('../../models/cartModel');
const User = require('../../models/userModel');
const Wishlist = require('../../models/wishlistModel');
const Category = require('../../models/categoryModels');
const mongoose = require('mongoose'); // Import mongoose
const instance = require('../../config/razorpay'); // import razorpay instance
const { validationResult } = require('express-validator');

// Get Checkout page
const getCheckOut = async (req, res) => {
  try {
    let cartCount = 0;
    let categories = null;
    let totalPrice = 0;
    let totalOriginalPrice = 0;
    let items = [];
    let deliveryCharge = 0;
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(401).render('login', { message: 'Please log in to view your cart' });
    }

    const user = await User.findById(userId).populate('address');
    if (!user) {
      return res.redirect('/profile');
    }

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) {
      return res.redirect('/cart');
    }

    const errorMessage = req.flash('error');
    const successMessage = req.flash('success');
    const discountAmount = req.session.totalDiscountAmount || 0;
    const couponCode = req.session.couponCode || '';

    items = cart.items;
    totalOriginalPrice = items.reduce((sum, item) => sum + item.quantity * (item.product.offerPrice || item.product.discountPrice), 0);

    if (totalOriginalPrice < 499) {
      deliveryCharge = 40;
    }

    cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

    totalPrice = items.reduce((sum, item) => {
      const price = item.product.offerPrice || item.product.discountprice;
      return sum + item.quantity * price;
    }, 0);

    const totalReferralDiscount = req.session.totalReferralDiscount || 0;
    let finalPrice = (totalPrice + deliveryCharge) - (discountAmount + totalReferralDiscount);
    finalPrice = finalPrice < 0 ? 0 : finalPrice;

    const totalDiscountAmount = cart.items.reduce((sum, item) => {
      const discountPrice = item.product.offerPrice || item.product.discountprice;
      return sum + (item.product.originalprice - discountPrice) * item.quantity;
    }, 0);

    categories = await Category.find({ status: true });

    res.render('checkout', {
      items,
      cartCount,
      totalPrice: totalPrice.toFixed(2),
      finalPrice,
      categories,
      user,
      totalReferralDiscount,
      address: user.address,
      cart,
      errorMessage: errorMessage.length > 0 ? errorMessage[0] : null,
      successMessage: successMessage.length > 0 ? successMessage[0] : null,
      errors: null,
      razorpayKey: instance.key_id,
      razorpayOrderId: 'your_order_id',
      totalAmount: finalPrice,
      couponCode,
      discountAmount,
      totalDiscountAmount,
      deliveryCharge,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
};

// Load address for the checkout page
const AddressLoad = async (req, res) => {
  let cartCount = 0;
  let totalPrice = 0;
  let wishlistCount = 0;
  let items = [];
  let categories = null;

  try {
    const id = req.query.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid user ID');
    }

    const userData = await User.findById(id);
    if (!userData) {
      return res.redirect('/checkout');
    }

    const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
    if (cart) {
      items = cart.items;
      cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
      totalPrice = items.reduce((sum, item) => sum + item.quantity * (item.product.offerPrice || item.product.discountprice), 0);
    }

    const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
    if (wishlist) {
      const wishlistItems = wishlist.items;
      wishlistCount = wishlistItems.reduce((sum, item) => sum + item.quantity, 0);
    }

    categories = await Category.find({ status: true });

    res.render('add-deliveryaddress', {
      user: userData,
      cartCount,
      wishlistCount,
      categories,
      totalPrice: totalPrice.toFixed(2),
      items,
      errors: null,
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
};

// Add new address
const addAddress = async (req, res) => {
  let cartCount = 0;
  let totalPrice = 0;
  let wishlistCount = 0;
  let items = [];
  let categories = null;

  try {
    const errors = validationResult(req);
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(401).json({ message: 'User not logged in' });
    }

    const userData = await User.findById(userId);
    if (!userData) {
      return res.status(404).json({ message: 'User not found' });
    }

    const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
    if (cart) {
      items = cart.items;
      cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
      totalPrice = items.reduce((sum, item) => sum + item.quantity * (item.product.offerPrice || item.product.discountprice), 0);
    }

    const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
    if (wishlist) {
      const wishlistItems = wishlist.items;
      wishlistCount = wishlistItems.reduce((sum, item) => sum + item.quantity, 0);
    }

    categories = await Category.find({ status: true });

    if (!errors.isEmpty()) {
      return res.render('add-deliveryaddress', {
        user: userData,
        cartCount,
        wishlistCount,
        categories,
        totalPrice: totalPrice.toFixed(2),
        items,
        errors: errors.mapped(),
      });
    }

    const { housename, street, city, state, zipcode, country, mobile } = req.body;
    const newAddress = { housename, street, city, state, zipcode, country, mobile };

    userData.address.push(newAddress);
    await userData.save();

    res.redirect('/checkout');
  } catch (error) {
    console.error('Error adding address:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Load edit address page
const renderEditAddressPage = async (req, res) => {
  let cartCount = 0;
  let totalPrice = 0;
  let wishlistCount = 0;
  let items = [];
  let categories = null;

  try {
    const userData = await User.findById(req.query.id);
    if (!userData) {
      req.flash('error', 'User not found');
      return res.redirect('/checkout');
    }

    const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
    if (cart) {
      items = cart.items;
      cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
      totalPrice = items.reduce((sum, item) => sum + item.quantity * (item.product.offerPrice || item.product.discountprice), 0);
    }

    const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
    if (wishlist) {
      const wishlistItems = wishlist.items;
      wishlistCount = wishlistItems.reduce((sum, item) => sum + item.quantity, 0);
    }

    const address = userData.address.id(req.query.address_id);
    if (!address) {
      req.flash('error', 'Address not found');
      return res.redirect('/checkout');
    }

    categories = await Category.find({ status: true });

    res.render('edit-deliveryaddress', {
      user: userData,
      address,
      successMessages: req.flash('success'),
      errorMessages: req.flash('error'),
      cart,
      cartCount,
      wishlistCount,
      totalPrice: totalPrice.toFixed(2),
      items,
      categories,
      errors: null,
    });
  } catch (err) {
    console.error('Error:', err.message);
    req.flash('error', 'Server error');
    res.redirect('/checkout');
  }
};

// Edit address
const editAddress = async (req, res) => {
  let cartCount = 0;
  let totalPrice = 0;
  let wishlistCount = 0;
  let items = [];
  let categories = null;

  try {
    const errors = validationResult(req);
    const { user_id, address_id } = req.body;

    const userData = await User.findById(user_id);
    if (!userData) {
      req.flash('error', 'User not found');
      return res.redirect('/checkout');
    }

    const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
    if (cart) {
      items = cart.items;
      cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
      totalPrice = items.reduce((sum, item) => sum + item.quantity * (item.product.offerPrice || item.product.discountprice), 0);
    }

    const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
    if (wishlist) {
      const wishlistItems = wishlist.items;
      wishlistCount = wishlistItems.reduce((sum, item) => sum + item.quantity, 0);
    }

    categories = await Category.find({ status: true });

    if (!errors.isEmpty()) {
      const address = userData.address.id(address_id);
      return res.render('edit-deliveryaddress', {
        user: userData,
        address,
        cartCount,
        wishlistCount,
        categories,
        totalPrice: totalPrice.toFixed(2),
        items,
        errors: errors.mapped(),
      });
    }

    const address = userData.address.id(address_id);
    if (!address) {
      req.flash('error', 'Address not found');
      return res.redirect('/checkout');
    }

    const { housename, street, city, state, zipcode, country, mobile } = req.body;
    Object.assign(address, { housename, street, city, state, zipcode, country, mobile });

    await userData.save();

    req.flash('success', 'Address updated successfully');
    res.redirect('/checkout');
  } catch (err) {
    console.error('Error updating address:', err.message);
    req.flash('error', 'Server error');
    res.redirect('/checkout');
  }
};

//delete address
const deleteAddress = async (req, res) => {
  try {
    const { user_id, address_id } = req.body;

    // Validate address_id
    if (!mongoose.Types.ObjectId.isValid(address_id)) {
      return res.status(400).json({ error: 'Invalid address ID' });
    }

    // Find the user by user_id
    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Pull (remove) the address from the user's addresses array
    user.address.pull(address_id)

    // Save the user object to persist the changes
    await user.save();
    res.redirect('/checkout')
  } catch (error) {
    console.error('Error deleting address:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getCheckOut,
  AddressLoad,
  addAddress,
  renderEditAddressPage,
  editAddress,
  deleteAddress
};

