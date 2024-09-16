const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const addressSchema = new Schema({
  housename: String,
  street: String,
  city: String,
  state: String,
  zipcode: String,
  country: String,
  mobile: String
});

const trackingSchema = new Schema({
  status: { type: String, required: true },
  date: { type: Date, required: true }
});
const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },  // New field for the price of the item
    coupon: { type: String, default: '' },  // New field for the coupon applied to the item
    status: { type: String, default: 'Processing', enum: [ 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Reject Return Request', 'Accepted', 'Pickup', 'Returned', 'Refund'] },
  }],
  deliveryAddress: addressSchema,
  paymentMethod: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Requested', 'Reject Return Request', 'Accepted', 'Pickup', 'Returned', 'Refund'] },
  tracking: { type: [trackingSchema], default: [] },
  expectedDeliveryDate: { type: Date, required: true },
  actualDeliveryDate: { type: Date },
  cancellationReason: { type: String, default: '' },
  cancellationDescription: { type: String, default: '' },
  earlyDelivery: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  returnStatus: { type: String, enum: ['Accepted', 'Rejected', 'Requested', ''], default: '' },
  returnReason: { type: String, default: '' },
  returnDescription: { type: String, default: '' },
  paymentStatus: { type: String, default: 'Pending', enum: ['Pending', 'Payment Failed', 'Success'] },
  discountAmount: { type: Number, default: 0 },
  couponCode: { type: String, default: '' },
  referralCode: { type: String, default: '' },
  referralDiscountAmount:{ type: Number, default: 0 }
});


module.exports = mongoose.model('Order', orderSchema);
