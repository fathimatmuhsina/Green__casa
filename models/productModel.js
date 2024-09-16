const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  image: {
    type: [String],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  originalprice: {
    type: Number,
    required: true
  },
  offerPrice: {
    type: Number,
    default: 0
  },
  discountprice: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    required: true
  },
  is_listed: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String, // Storing category names as strings
    required: true // Set to false if category is optional
  },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
