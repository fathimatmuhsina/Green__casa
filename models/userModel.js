const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  housename: String,
  street: String,
  city: String,
  state: String,
  zipcode: String,
  country: String,
  mobile: String,
});

const walletTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['refund', 'deposit','debit'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  description: String,
});

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
  },
  name: {
    type: String,
    required: true,   
  },
  email: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: false,
  },
  password: {
    type: String,
    required: true,
  },
  address: [addressSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  is_admin: {
    type: Number,
    required: true,
  },
  is_verified: {
    type: Number,
    default: 0,
  },
  isBlocked: {
    type: Boolean,
    default: 0,
  },
  token: {
    type: String,
    default: '',
  },
  walletBalance: {
    type: Number,
    default: 0,
  },
 
  couponsUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }],
  walletTransactions: [walletTransactionSchema],
});

module.exports = mongoose.model('User', userSchema);
