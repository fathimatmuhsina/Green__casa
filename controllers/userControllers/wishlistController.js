const Wishlist = require('../../models/wishlistModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const Cart = require('../../models/cartModel');
const Category=require('../../models/categoryModels')
const mongoose = require('mongoose'); // Import mongoose

//add to wishlist
const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.body.productId;

    console.log(`User ID: ${userId}, Product ID: ${productId}`);

    if (!userId) {
      return res.status(401).json({ message: 'User not logged in' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, items: [] });
    }

    const itemIndex = wishlist.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex === -1) {
      wishlist.items.push({ product: productId });
    }

    await wishlist.save();

    const wishlistCount = wishlist.items.length; // Update to correct count

    console.log(`Wishlist updated: ${wishlist}`);

    res.status(200).json({ message: 'Product added to wishlist', wishlistCount });
  } catch (error) {
    console.log('Error adding to wishlist:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

//get wishlist
const getWishlist = async (req, res) => {
  try {
    let cartCount = 0;
    let wishlistCount = 0;
    let totalPrice = 0;
    let userData = null;
    let wishlistItems = [];
    let items = [];
    let categories=null;
    const userId = req.session.user_id;

    if (!userId) {
      return res.status(401).render('login', { message: 'Please log in to view your wishlist' });
    }

    userData = await User.findById(userId);

    if (userData) {
      const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
      if (cart) {
        items = cart.items;
        cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
        totalPrice = items.reduce((sum, item) => sum + item.quantity * (item.product.offerPrice || item.product.discountprice), 0);
      }

      const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
      console.log('wishlist', wishlist)
      if (wishlist) {
        wishlistItems = wishlist.items;
        wishlistCount = wishlistItems.reduce((sum, item) => sum + item.quantity, 0);
      }
    }
    categories = await Category.find({ status: true });


    res.render('wishlist', {
      wishlist: wishlistItems,
      items,
      categories,
      user: userData,
      cartCount,
      wishlistCount,
      totalPrice: totalPrice.toFixed(2),
      error: null, // No error
    });
  } catch (error) {
    console.error('Error fetching wishlist:', error.message);
    res.render('wishlist', {
      wishlist: [],
      cartItems: [],
      user: null,
      cartCount: 0,
      wishlistCount: 0,
      totalPrice: '0.00',
      error: 'Internal Server Error', // Error message
    });
  }
};

//remove from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user_id; // Ensure user_id is being set in the session
    const productId = req.body.productId;

    if (!userId) {
      return res.status(401).json({ message: 'Please log in to view your wishlist' });
    }

    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    const itemIndex = wishlist.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }

    wishlist.items.splice(itemIndex, 1); // Remove the item from the array

    await wishlist.save();

    res.status(200).json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Error removing item from wishlist:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist
};
