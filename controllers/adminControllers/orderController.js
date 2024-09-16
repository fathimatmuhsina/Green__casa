const mongoose = require('mongoose');
const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Order = require('../../models/orderModel');
const Razorpay = require('razorpay');

// Show a paginated list of orders
const showOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / limit);
    const orders = await Order.find()
      .populate('items.product')
      .populate('user')
      .sort({ createdAt: -1 })
      .lean()
      .skip((page - 1) * limit)
      .limit(limit);

    res.render('view-orders', {
      orders,
      currentPage: page,
      totalPages,
      limit,
    });
  } catch (error) {
    console.error('Error showing orders:', error.message);
    res.status(500).send('Server Error');
  }
};

// Load order details by ID
const orderDetailLoad = async (req, res) => {
  try {
    const id = req.query.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      req.flash('error', 'Invalid order ID');
      return res.redirect('/admin/view-orders');
    }

    const orderData = await Order.findById(id)
      .populate('items.product')
      .populate('user')
      .lean();

    if (orderData) {
      res.render('view-order-details', {
        order: orderData,
        messages: req.flash(),
      });
    } else {
      req.flash('error', 'Order not found.');
      res.redirect('/admin/view-orders');
    }
  } catch (error) {
    console.error('Error loading order details:', error.message);
    req.flash('error', 'Server Error');
    res.status(500).send('Server Error');
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
      req.flash('error', 'Missing order ID or status');
      return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    const order = await Order.findById(orderId);

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    if (status === 'Delivered' && order.status !== 'Shipped') {
      req.flash('error', 'Order must be shipped before marking as delivered');
      return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    if (order.status === 'Delivered' && status !== 'Delivered') {
      req.flash('error', 'Cannot change status of a delivered order');
      return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    if (order.status === 'Cancelled' && status !== 'Cancelled') {
      req.flash('error', 'Cannot change status of a cancelled order');
      return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    order.status = status;
    order.tracking.push({ status, date: new Date() });

    if (status === 'Delivered') {
      order.actualDeliveryDate = new Date();
      if (order.actualDeliveryDate < order.expectedDeliveryDate) {
        order.earlyDelivery = true;
      }
      order.paymentStatus = 'Success';
    }

    await order.save();

    req.flash('success', `Order status updated to ${status}`);
    res.redirect(`/admin/view-order-details?id=${orderId}`);
  } catch (error) {
    console.error('Error updating order status:', error.message);
    req.flash('error', 'Server error');
    res.redirect(`/admin/view-order-details?id=${orderId}`);
  }
};

// Cancel an order
const cancelOrder = async (req, res) => {
  try {
    const { orderId, cancellationReason, cancellationDescription } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      req.flash('error', 'Invalid order ID.');
      return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    const order = await Order.findById(orderId);

    if (!order) {
      req.flash('error', 'Order not found.');
      return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    // Update product stock
    await Promise.all(order.items.map(async (item) => {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }));

    if (order.paymentStatus === 'Success') {
      const user = await User.findById(order.user);

      if (!user) {
        req.flash('error', 'User not found');
        return res.redirect(`/admin/view-order-details?id=${orderId}`);
      }

      const refundAmount = order.totalAmount;
      user.walletBalance += refundAmount;
      user.walletTransactions.push({
        type: 'refund',
        amount: refundAmount,
        description: `Refund for cancelled order ${orderId}`,
      });

      await user.save();
    } else {
      console.log('No refund processed: Payment was not successful or not paid through Razorpay.');
    }

    order.status = 'Cancelled';
    order.cancellationReason = cancellationReason;
    order.cancellationDescription = cancellationDescription;
    order.tracking.push({
      status: 'Cancelled',
      date: new Date(),
      message: `Order cancelled by admin: ${cancellationReason}. ${cancellationDescription ? `Description: ${cancellationDescription}` : ''}`,
    });

    await order.save();
    req.flash('success', 'Order has been cancelled successfully.');

    res.redirect(`/admin/view-order-details?id=${orderId}`);
  } catch (error) {
    console.error('Error cancelling order:', error.message);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect(`/admin/view-order-details?id=${orderId}`);
  }
};

// Reject a return request
const rejectReturnRequest = async (req, res) => {
  try {
    const { orderId, rejectReason } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    order.status = 'Delivered';
    order.returnStatus = 'Rejected';
    order.returnReason = rejectReason || '';
    await order.save();

    req.flash('success', 'Return request has been rejected.');
    res.redirect(`/admin/view-order-details?id=${orderId}`);
  } catch (err) {
    console.error('Error rejecting return request:', err.message);
    req.flash('error', 'Server error. Please try again.');
    res.status(500).send('Server error');
  }
};

// Accept a return request
const acceptReturnRequest = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/view-orders');
    }

    order.returnStatus = 'Accepted';
    order.tracking.push({
      status: 'Return Request Accepted',
      date: new Date(),
    });
    await order.save();

    req.flash('success', 'Return request accepted');
    res.redirect(`/admin/view-order-details?id=${orderId}`);
  } catch (err) {
    console.error('Error accepting return request:', err.message);
    req.flash('error', 'Server error');
    res.redirect('/admin/view-orders');
  }
};

// Update return status
const updateReturnStatus = async (req, res) => {
  try {
    const { orderId, returnStatus, rejectionReason } = req.body;

    if (!orderId || !returnStatus) {
      req.flash('error', 'Missing order ID or return status');
      return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    const order = await Order.findById(orderId);

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/view-orders');
    }

    if (order.returnStatus !== 'Requested') {
      req.flash('error', 'Return request already processed');
      return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    order.returnStatus = returnStatus;

    if (returnStatus === 'Rejected') {
      order.returnReason = rejectionReason;
      order.status = 'Delivered';
      order.tracking.push({
        status: 'Return Request Rejected',
        date: new Date(),
      });
    } else if (returnStatus === 'Accepted') {
      order.tracking.push({
        status: 'Return Request Accepted',
        date: new Date(),
      });
    }

    await order.save();
    req.flash('success', `Return request ${returnStatus.toLowerCase()}`);
    res.redirect(`/admin/view-order-details?id=${orderId}`);
  } catch (err) {
    console.error('Error updating return status:', err.message);
    req.flash('error', 'Server error');
    res.redirect('/admin/view-orders');
  }
};

// Update return progress
const updateReturnProgress = async (req, res) => {
  try {
    const { orderId, returnProgress } = req.body;

    if (!orderId || !returnProgress) {
      req.flash('error', 'Missing order ID or return progress status');
      return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    const order = await Order.findById(orderId).populate('items.product');

    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/admin/view-orders');
    }

    if (order.returnStatus !== 'Accepted') {
      req.flash('error', 'Invalid return status');
      return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    // Ensure correct order of return progress
    switch (returnProgress) {
      case 'Pickup':
        order.status = 'Pickup';
        break;

      case 'Returned':
        if (order.status !== 'Pickup') {
          req.flash('error', 'Cannot mark as Returned before Pickup');
          return res.redirect(`/admin/view-order-details?id=${orderId}`);
        }
        order.status = 'Returned';

        // Update product stock
        await Promise.all(order.items.map(async (item) => {
          const product = item.product;
          if (product) {
            product.stock += item.quantity;
            await product.save();
          } else {
            req.flash('error', 'Product not found during return');
          }
        }));
        break;

      case 'Refund':
        if (order.status !== 'Returned') {
          req.flash('error', 'Cannot issue refund before return is completed');
          return res.redirect(`/admin/view-order-details?id=${orderId}`);
        }
        order.status = 'Refund';

        // Refund handling
        if (order.paymentStatus === 'Success') {
          const user = await User.findById(order.user);

          if (!user) {
            req.flash('error', 'User not found');
            return res.redirect(`/admin/view-order-details?id=${orderId}`);
          }

          const refundAmount = order.totalAmount;
          user.walletBalance += refundAmount;
          user.walletTransactions.push({
            type: 'refund',
            amount: refundAmount,
            description: `Refund for returned order ${orderId}`,
          });

          await user.save();
        }
        break;

      default:
        req.flash('error', 'Invalid return progress status');
        return res.redirect(`/admin/view-order-details?id=${orderId}`);
    }

    // Add tracking information
    order.tracking.push({
      status: returnProgress,
      date: new Date(),
    });

    await order.save();
    req.flash('success', `Return status updated to ${returnProgress}`);
    res.redirect(`/admin/view-order-details?id=${orderId}`);
  } catch (err) {
    console.error('Error updating return progress:', err.message);
    req.flash('error', 'Server error');
    res.redirect('/admin/view-orders');
  }
};

module.exports = {
  showOrders,
  updateOrderStatus,
  orderDetailLoad,
  cancelOrder,
  acceptReturnRequest,
  rejectReturnRequest,
  updateReturnStatus,
  updateReturnProgress,
};
