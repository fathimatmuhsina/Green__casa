const Order = require('../../models/orderModel');
const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Cart = require('../../models/cartModel')
const Wishlist = require('../../models/wishlistModel')
const Category=require('../../models/categoryModels')
const playwright = require('playwright');
const { validationResult } = require('express-validator');

//order success page
const orderSuccess = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }
    const order = await Order.findById(orderId).populate('items.product');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.render('order-success', { order });
  } catch (error) {
    console.error('Error fetching order confirmation:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

//order failure page
const orderFailure = async (req, res) => {
  try {

    res.render('order-failure');
  } catch (error) {
    console.error('Error fetching order confirmation:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

//get all orders
const getOrders = async (req, res) => {
  try {
    let wishlistCount = 0
    let categories=null;
    let cartCount = 0;
    let totalPrice = 0;
    let userData = null;
    let items = [];
    const userId = req.session.user_id;
    const page = parseInt(req.query.page) || 1; // Get the page number from query parameter, default to 1
    const limit = 10; // Number of orders per page
    const skip = (page - 1) * limit;
    const filter = req.query.filter || 'all'; // Get the filter parameter, default to 'all'
    if (!userId) {
      return res.status(401).render('login', { message: 'Please log in to view your orders' });
    }
    if (userId) {
      userData = await User.findById(userId);
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
    let dateRange;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Set the time to the start of the day
    switch (filter) {
      case 'today':
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999); // Set the time to the end of the day
        dateRange = {
          $gte: currentDate,
          $lte: endOfToday
        };
        break;
      case 'lastMonth':
        dateRange = {
          $gte: new Date(currentDate.setMonth(currentDate.getMonth() - 1)),
        };
        break;
      case 'lastThreeMonths':
        dateRange = {
          $gte: new Date(currentDate.setMonth(currentDate.getMonth() - 3)),
        };
        break;
      case 'currentYear':
        dateRange = {
          $gte: new Date(currentDate.getFullYear(), 0, 1),
        };
        break;
      case 'all':
      default:
        dateRange = null;
        break;
    }
    // Count total number of orders with the date filter
    const query = { user: userId };
    if (dateRange) {
      query.createdAt = dateRange;
    }
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);
    // Fetch paginated orders with the date filter
    const orders = await Order.find(query)
      .populate('items.product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      categories = await Category.find({ status: true });

    res.render('orders', {
      messages: req.flash('messages') || {}, // Ensure messages is passed even if it's empty
      categories,
      orders,
      items: items,
      user: userData,
      cartCount,
      totalPrice: totalPrice.toFixed(2),
      currentPage: page,
      totalPages: totalPages,
      filter: filter,
    });
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

//load order details
const loadOrderDetail = async (req, res) => {
  let cartCount = 0;
  let wishlistCount = 0;
  let totalPrice = 0;

  let items = [];
  try {
    const format = req.query;
    const orderId = req.query.id;
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(401).render('login', { message: 'Please log in to view your orders' });
    }
    const user = await User.findById(userId).lean();

    if (user) {
      const cart = await Cart.findOne({ user: user._id }).populate('items.product');
      if (cart) {
        items = cart.items;
        cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
        totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
      }
      const wishlist = await Wishlist.findOne({ user: user._id }).populate('items.product');
      if (wishlist) {
        items = wishlist.items;
        wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }

    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate('items.product')
      .lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const address = user.address.find(addr => addr._id.toString() === order.deliveryAddress.toString());
    order.deliveryAddressDetails = address || {};
    order.tracking = Array.isArray(order.tracking) ? order.tracking : [];

    const couponCode = order.couponCode || 'N/A';
    const discountAmount = order.discountAmount || 0;
    if (format === 'pdf') {
      return generateInvoicePDF(order, res);
    }
    console.log('order', order);
    res.render('order-detail', {
      order,
      couponCode,
      discountAmount,
      user,
      cartCount,
      wishlistCount,

    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ message: 'Error fetching order details', error });
  }
};

//cancel an order
const cancelOrder = async (req, res) => {
  try {
    const { orderId, reason, description } = req.body;
    const userId = req.user._id;

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure the user is authorized to cancel this order
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Check if the order is already cancelled
    if (order.status === 'Cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    // Update the stock for each item in the order
    await Promise.all(order.items.map(async item => {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }));

    // Mark the order as cancelled
    order.status = 'Cancelled';
    order.cancellationReason = reason;
    order.cancellationDescription = description;

    // Handle refunds if applicable
    if (['razorpay', 'wallet'].includes(order.paymentMethod)) {
      const refundAmount = order.totalAmount; // Refund the entire amount for the order
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      user.walletBalance += refundAmount;
      user.walletTransactions.push({
        type: 'refund',
        amount: refundAmount,
        description: `Refund for cancelled order ${orderId}`,
      });
      await user.save();
    }

    await order.save();
    return res.redirect('/orders');
  } catch (error) {
    console.error('Error cancelling order:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

//return an order
const returnOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { orderId, returnReason, returnDescription } = req.body;
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    if (order.user.toString() !== req.session.user_id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    if (order.status !== 'Delivered') {
      return res.status(400).json({ msg: 'Order cannot be returned' });
    }
    if (order.returnStatus) {
      return res.status(400).json({ msg: 'Return request already submitted' });
    }
    // Update order with return details
    order.returnReason = returnReason;
    order.returnDescription = returnDescription;
    order.status = 'Return Requested';
    order.returnStatus = 'Requested';
    await order.save();
    res.redirect(`/order-detail?id=${orderId}`);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

//cancel return request of an order
const cancelReturn = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const userId = req.session.user_id;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this return request' });
    }
    if (order.returnStatus !== 'Requested') {
      return res.status(400).json({ message: 'No active return request to cancel' });
    }
    // Reset return details
    order.returnReason = null;
    order.returnDescription = null;
    order.returnStatus = null;
    order.status = 'Delivered'; // Reset status to delivered after canceling return
    await order.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error canceling return:', error.message);
    res.status(500).json({ success: false, message: 'Error cancelling return request.' });
  }
};

//general invoice
const generateInvoicePDF = async (req, res) => {
  try {
    const { html, orderId } = req.body;
    // Launch a headless browser using Playwright
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();
    // Wait for the content to be fully loaded and styled
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    // Close the browser
    await browser.close();

    // Send the PDF to the client
    res.writeHead(200, {
      'Content-Length': pdf.length,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=invoice_${orderId}.pdf`,
    }).end(pdf);

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
};

module.exports = {
  orderSuccess,
  orderFailure,
  getOrders,
  loadOrderDetail,
  cancelOrder,
  returnOrder,
  cancelReturn,
  generateInvoicePDF,
 
};





