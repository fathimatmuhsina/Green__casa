
const Cart = require('../../models/cartModel');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');
const Order = require('../../models/orderModel');
const crypto = require('crypto');
const instance = require('../../config/razorpay'); // import razorpay instance



const PlaceOrder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.redirect('/login');
    }

    const { deliveryAddress, paymentMethod } = req.body;
    const cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      req.flash('error', 'Cart is empty');
      return res.redirect('/checkout');
    }

    if (!deliveryAddress) {
      req.flash('error', 'Please add a delivery address');
      return res.redirect('/checkout');
    }

    const user = await User.findById(userId);
    const selectedAddress = user.address.id(deliveryAddress);

    let totalOrderAmount = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const itemPrice = item.product.offerPrice > 0 ? item.product.offerPrice :
        item.product.discountprice ? item.product.discountprice :
          item.product.originalprice;

      const itemTotalPrice = item.quantity * itemPrice;
      totalOrderAmount += itemTotalPrice;

      orderItems.push({
        product: item.product._id,
        quantity: item.quantity,
        price: itemPrice,
        coupon: req.session.appliedCoupon || '',
        
        total: itemTotalPrice,
      });
    }

    const deliveryCharge = totalOrderAmount < 499 ? 40 : 0;
    totalOrderAmount += deliveryCharge;

    // Retrieve referral discount amount
    const referralDiscountAmount = req.session.totalReferralDiscount || 0;
    const discountAmount = req.session.totalDiscountAmount || 0;

    totalOrderAmount -= (discountAmount + referralDiscountAmount);
    if (totalOrderAmount < 0) totalOrderAmount = 0;

    const newOrder = new Order({
      user: userId,
      items: orderItems,
      deliveryAddress: {
        housename: selectedAddress.housename,
        mobile: selectedAddress.mobile,
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        country: selectedAddress.country,
        zipcode: selectedAddress.zipcode,
      },
      totalAmount: totalOrderAmount,
      deliveryCharge,
      discountAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Payment Failed',
      retryAllowed: paymentMethod === 'razorpay',
      status: 'Pending',
      expectedDeliveryDate: new Date(new Date().setDate(new Date().getDate() + 14)),
      referralDiscountAmount,
      couponCode: req.session.appliedCoupon || '',
      referralCode: req.session.appliedReferral || '',
    });

    await newOrder.save();
    if (paymentMethod === 'COD' || paymentMethod === 'wallet') {

    // Update product stock after order placement
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.stock -= item.quantity;
        if (product.stock < 0) {
          req.flash('error', `Not enough stock for ${product.name}`);
          return res.redirect('/checkout');
        }
        await product.save();
      }
    }
  }
    // Clear cart after order placement
    cart.items = [];
    await cart.save();

    if (paymentMethod === 'wallet') {
      if (user.walletBalance >= totalOrderAmount) {
        user.walletBalance -= totalOrderAmount;
        user.walletTransactions.push({
          type: 'debit',
          amount: totalOrderAmount,
          description: 'Order payment',
        });
        await user.save();

        newOrder.paymentStatus = 'Success';
        newOrder.status = 'Processing';
        await newOrder.save();

        if (req.session.couponId) {
          user.couponsUsed.push(req.session.couponId);
          await user.save();
        }

        req.session.appliedCoupon = null;
        req.session.totalDiscountAmount = null;
        req.session.itemDiscounts = null;
        req.session.couponId = null;

        req.flash('success', 'Order placed successfully with wallet payment');
        return res.render('order-success', { orders: [newOrder] });
      } else {
        req.flash('error', 'Insufficient wallet balance');
        return res.render('order-failure');
      }
    } else if (paymentMethod === 'COD') {
      newOrder.paymentStatus = 'Pending';
      newOrder.status = 'Processing';
      await newOrder.save();

      if (req.session.couponId) {
        user.couponsUsed.push(req.session.couponId);
        await user.save();
      }

      req.session.appliedCoupon = null;
      req.session.totalDiscountAmount = null;
      req.session.itemDiscounts = null;
      req.session.couponId = null;

      req.flash('success', 'Order placed successfully with Cash on Delivery');
      return res.render('order-success', { orders: [newOrder] });
    } else {
      const amountInPaise = Math.round(totalOrderAmount * 100);
      if (amountInPaise < 100) {
        throw new Error('Invalid amount. Minimum value is 100 paise (1 INR).');
      }

      const receipt = `RZ-${userId.slice(-5)}-${newOrder._id.toString().slice(-6)}-${Date.now().toString().slice(-6)}`;

      const razorpayOrder = await instance.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: receipt,
      });

      newOrder.razorpayOrderId = razorpayOrder.id;
      await newOrder.save();

      if (req.session.couponId) {
        user.couponsUsed.push(req.session.couponId);
        await user.save();
      }

      req.session.appliedCoupon = null;
      req.session.totalDiscountAmount = null;
      req.session.itemDiscounts = null;
      req.session.couponId = null;

      return res.json({
        success: true,
        razorpayKey: instance.key_id,
        orderId: razorpayOrder.id,
        amount: amountInPaise,
        currency: "INR",
        name: "Green Casa",
        description: "Test Transaction",
        image: "/images/greencasa.png",
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.mobile,
        },
        notes: {
          address: "Your Company Address",
        },
        theme: {
          color: "#204f38",
        },
      });
    }
  } catch (error) {
    console.error('Error placing order:', error.message || error);
    req.flash('error', 'Oops something went wrong. ' + (error.message || 'Please try again.'));
    res.redirect('/checkout');
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Order ID, Payment ID, and Signature are required' });
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const order = await Order.findOne({ razorpayOrderId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (expectedSignature === razorpaySignature) {
      // Payment successful, update order status
      order.paymentStatus = 'Success';
      order.status = 'Processing';
      await order.save();

      const bulkOps = order.items.map(item => ({
        updateOne: {
          filter: { _id: item.product },
          update: { $inc: { stock: -item.quantity } },
        }
      }));
      await Product.bulkWrite(bulkOps);

      const cart = await Cart.findOne({ user: order.user });
      cart.items = [];
      await cart.save();

      return res.json({ success: true, orderId: order._id });
    } else {
      // Payment failed, update order status
      order.paymentStatus = 'Payment Failed';
      order.status = 'Pending';
      await order.save();

      // Render order-failure page
      req.flash('error', 'Payment verification failed. Please try again.');
      return res.render('order-failure', { order });
    }

  } catch (error) {
    console.error('Payment verification error:', error.message);
    req.flash('error', 'Something went wrong. Please try again.');
    return res.redirect('/checkout');
  }
};


const retryPayment = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Check if user is authenticated
    if (!req.user) {
      console.error('User not authenticated.');
      return res.json({ success: false, message: 'User not authenticated.' });
    }

    console.log('User authenticated:', req.user);

    const order = await Order.findById(orderId);

    if (!order) {
      console.error('Order not found:', orderId);
      return res.json({ success: false, message: 'Order not found.' });
    }

    if (order.paymentStatus !== 'Payment Failed') {
      console.error('Payment retry not allowed for this order:', orderId);
      return res.json({ success: false, message: 'Payment cannot be retried for this order.' });
    }

    console.log('Creating Razorpay order...');
    const razorpayOrder = await instance.orders.create({
      amount: Math.round(order.totalAmount * 100),
      currency: "INR",
      receipt: `${order._id}-${Date.now()}`,
    });

    if (!razorpayOrder) {
      console.error('Failed to create Razorpay order.');
      return res.json({ success: false, message: 'Failed to create Razorpay order.' });
    }

    order.razorpayOrderId = razorpayOrder.id;
    // order.paymentStatus="Success"
    // order.sattus="Processing"
    await order.save();

    console.log('Payment retry successful:', razorpayOrder.id);

    return res.json({
      success: true,
      razorpayKey: instance.key_id,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: "Green Casa",
      description: "Retry Payment",
      image: "/images/greencasa.png",
      prefill: {
        name: req.user.name || '',
        email: req.user.email || '',
        contact: req.user.mobile || '',
      },
      notes: {
        address: "Your Company Address",
      },
      theme: {
        color: "#204f38",
      },
    });
  } catch (error) {
    console.error('Error during payment retry:', error);
    return res.json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

module.exports={
  PlaceOrder,
  verifyPayment,
  retryPayment,


}