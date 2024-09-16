// models/offerModel.js

const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['product', 'category', 'referral'], required: true },
  discount: { type: Number, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // For Product Offers
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }, // For Category Offers
  referralCode: { type: String }, // For Referral Offers
  isActive: { type: Boolean, default: true },
  expirationDate: { type: Date },
  createdAt: {type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
