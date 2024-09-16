const Cart = require('../../models/cartModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const Order = require('../../models/orderModel');
const Offer = require('../../models/offerModel');
const Category = require('../../models/categoryModels');
const Coupon = require('../../models/couponModel')

//add product to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const productId = req.body.productId;

    if (!userId) {
      return res.status(401).json({ message: 'User not logged in' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      const newQuantity = cart.items[itemIndex].quantity + 1;
      if (newQuantity > product.stock || newQuantity > 10) {
        return res.status(400).json({ message: 'Exceeds available stock or maximum quantity of 10' });
      }
      cart.items[itemIndex].quantity = newQuantity;
    } else {
      if (product.stock < 1) {
        return res.status(400).json({ message: 'Out of stock' });
      }
      cart.items.push({ product: productId, quantity: 1 });
    }

    await cart.save();

    const cartCount = cart.items.reduce((total, item) => total + item.quantity, 0);

    res.status(200).json({ message: 'Product added to cart', cartCount });
  } catch (error) {
    console.error('Error adding to cart:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

//remove product from cart
const removeFromCart = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const itemId = req.body.itemId;

    if (!userId) {
      return res.status(401).json({ message: 'User not logged in' });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const updatedItems = cart.items.filter(item => item.product.toString() !== itemId);

    cart.items = updatedItems;
    await cart.save();

    res.status(200).json({ message: 'Item removed from cart', cart });
  } catch (error) {
    console.error('Error removing item from cart:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

//update cart quantity
const updateQuantity = async (req, res) => {
  try {
    const userId = req.session.user_id;
    let { productId, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not logged in' });
    }

    if (quantity > 10) {
      return res.status(400).json({ message: 'Cannot exceed quantity of 10' });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ message: 'Exceeds available stock' });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = quantity;
      await cart.save();
      res.status(200).json({ success: true, message: 'Quantity updated', cart });
    } else {
      res.status(404).json({ success: false, message: 'Item not found in cart' });
    }
  } catch (error) {
    console.error('Error updating quantity:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

//get cart count
const getCartCount = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(401).json({ message: 'User not logged in' });
    }
    const cart = await Cart.findOne({ user: userId });
    const cartCount = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

    res.status(200).json({ cartCount });
  } catch (error) {
    console.error('Error fetching cart count:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

//show cart
const getCart = async (req, res) => {
  try {
    let categories = null;
    let cartCount = 0;
    let totalPrice = 0;
    let userData = null;
    let items = [];
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(401).render('login', { message: 'Please log in to view your cart' });
    }
    const couponCode = req.session.appliedCoupon || '';

    const discountAmount = req.session.totalDiscountAmount || 0;
    let deliveryCharge = 0;

    const user = await User.findById(userId);
    let cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart) {
      cart = { items: [] };
    }
    items = cart.items;
    cartCount = items.reduce((sum, item) => sum + item.quantity, 0);


    // Calculate totalPrice using offerPrice if available
    totalPrice = items.reduce((sum, item) => {
      const price = item.product.offerPrice || item.product.discountprice;
      return sum + item.quantity * price;
    }, 0);

    if (totalPrice < 499) {
      deliveryCharge = 40;
    }

    const totalDiscountAmount = items.reduce((sum, item) => {
      const discountPrice = item.product.offerPrice || item.product.discountprice;
      return sum + (item.product.originalprice - discountPrice) * item.quantity;
    }, 0);
    const totalReferralDiscount = req.session.totalReferralDiscount || 0;
    console.log('totalReferralDiscount', totalReferralDiscount)

    let finalPrice = ((totalPrice + deliveryCharge) - (discountAmount + totalReferralDiscount)).toFixed(2);
    console.log('finalPrice', finalPrice)


    finalPrice = finalPrice < 0 ? 0 : finalPrice;
    categories = await Category.find({ status: true });

    res.render('cart', {
      user,
      cart,
      categories,
      discountAmount,
      items,
      cartCount,
      totalPrice: totalPrice.toFixed(2),
      finalPrice,
      couponCode,
      totalDiscountAmount,
      deliveryCharge,
      totalReferralDiscount,

    });
  } catch (error) {
    console.error('Error getting cart:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

//apply and remove coupon
const applyCoupon = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { couponCode } = req.body;

    if (!userId) {
      return res.json({ success: false, message: 'User not logged in' });
    }

    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: 'Your cart is empty' });
    }

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        isActive: true,
        expirationDate: { $gte: new Date() },
      });

      if (!coupon) {
        return res.json({ success: false, message: 'Invalid or expired coupon code' });
      }

      // Check if the coupon has already been used by the user in any orders with 'Delivered', 'Processing', or 'Shipped' status
      const couponUsedInOrder = await Order.findOne({
        user: userId,
        items: {
          $elemMatch: { coupon: couponCode }, // Check if couponCode exists in the items array
        },
        status: { $in: ['Delivered', 'Processing', 'Shipped'] }, // Check if order status is 'Delivered', 'Processing', or 'Shipped'
      });

      console.log('couponUsedInOrder', couponUsedInOrder);
      if (couponUsedInOrder) {
        return res.json({ success: false, message: 'Coupon already used in a previous order with a valid status' });
      }

      let totalDiscountAmount = 0;
      let itemDiscounts = [];

      for (const item of cart.items) {
        let itemCouponDiscount = (coupon.discount / 100) * (item.quantity * (item.product.offerPrice || item.product.discountprice));

        if (coupon.maxDiscount > 0 && totalDiscountAmount + itemCouponDiscount > coupon.maxDiscount) {
          itemCouponDiscount = coupon.maxDiscount - totalDiscountAmount;
        }

        totalDiscountAmount += itemCouponDiscount;
        itemDiscounts.push({ productId: item.product._id, discount: itemCouponDiscount });
      }

      req.session.appliedCoupon = couponCode;
      req.session.totalDiscountAmount = totalDiscountAmount;
      req.session.itemDiscounts = itemDiscounts;
      req.session.couponId = coupon._id;

      return res.json({
        success: true,
        message: `Coupon applied! You saved ₹${totalDiscountAmount.toFixed(2)}`,
        totalDiscountAmount,
        couponCode,
      });
    } else {
      // Remove the applied coupon
      req.session.appliedCoupon = null;
      req.session.totalDiscountAmount = null;
      req.session.itemDiscounts = null;
      req.session.couponId = null;

      return res.json({ success: true, message: 'Coupon removed successfully!' });
    }
  } catch (error) {
    console.error('Error applying coupon:', error);
    return res.json({ success: false, message: 'An error occurred while applying the coupon' });
  }
};

//apply referral code
const applyReferral = async (req, res) => {
  const userId = req.session.user_id;
  const { referralCode } = req.body;

  try {
    // Find the referral offer by code
    const offer = await Offer.findOne({ referralCode, type: 'referral', isActive: true });
    if (!offer) {
      return res.json({ success: false, message: 'Invalid referral code' });
    }

    // Check if the user has ever used any referral code in any previous orders
    const referralUsedBefore = await Order.findOne({
      user: userId,
      referralCode: { $ne: '' },  // Check if any referral code has been applied in the past
      status: { $in: ['Delivered', 'Processing', 'Shipped'] } // Check orders with a valid status
    });

    if (referralUsedBefore) {
      return res.json({ success: false, message: 'You have already used a referral code in the past. Only one referral code is allowed per user.' });
    }

    // Retrieve the cart for the current user
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: 'Cart not found or empty' });
    }

    // Calculate total price, offer price, and referral discount
    let totalPrice = 0;
    let totalReferralDiscount = 0;
    let totalOfferPrice = 0;

    cart.items.forEach(item => {
      let discountPrice = item.product.offerPrice || item.product.discountprice;
      totalPrice += item.quantity * discountPrice;

      const offerPrice = discountPrice - (discountPrice * offer.discount / 100);
      totalOfferPrice += offerPrice * item.quantity;
      totalReferralDiscount += (discountPrice - offerPrice) * item.quantity;

      item.product.offerPrice = offerPrice;
    });

    // Save the updated cart
    await cart.save();

    // Update session with referral details
    req.session.appliedReferral = referralCode;
    req.session.totalReferralDiscount = totalReferralDiscount;

    return res.json({
      success: true,
      message: `Referral applied! You saved ₹${totalReferralDiscount.toFixed(2)}`,
      referralCode,
      totalPrice,
      totalOfferPrice,
      totalReferralDiscount
    });

  } catch (error) {
    console.error('Error applying referral code:', error);
    return res.json({ success: false, message: 'An error occurred while applying the referral code.' });
  }
};

//remove referral code
const removeReferral = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: 'Your cart is empty' });
    }

    req.session.appliedReferral = null;
    req.session.totalReferralDiscount = null;

    let totalPrice = 0;
    cart.items.forEach(item => {
      totalPrice += item.quantity * (item.product.offerPrice || item.product.discountprice);
    });

    await cart.save();

    return res.json({ success: true, message: 'Referral removed successfully!', totalPrice });
  } catch (error) {
    console.error('Error removing referral code:', error);
    return res.json({ success: false, message: 'An error occurred while removing the referral code.' });
  }
};


module.exports = {
  addToCart,
  getCart,
  getCartCount,
  removeFromCart,
  updateQuantity,
  applyCoupon,
  applyReferral,
  removeReferral
};


