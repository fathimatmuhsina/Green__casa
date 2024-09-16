const Offer = require('../../models/offerModel');
const Category = require('../../models/categoryModels');
const Product = require('../../models/productModel');
const { validationResult } = require('express-validator');

// Create a new offer
const createOffer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('validationErrors', errors.array());
    req.flash('formData', req.body);
    return res.redirect('/admin/offers');
  }

  try {
    const { name, type, discount, productId, categoryId, referralCode, expirationDate } = req.body;
    const newOffer = new Offer({
      name,
      type,
      discount,
      productId: type === 'product' ? productId : undefined,
      categoryId: type === 'category' ? categoryId : undefined,
      referralCode: type === 'referral' ? referralCode : undefined,
      expirationDate,
    });

    await newOffer.save();
    req.flash('success', 'Offer created successfully!');
    res.redirect('/admin/offers');
  } catch (error) {
    console.error('Error creating offer:', error.message);
    req.flash('error', 'An error occurred while creating the offer.');
    res.redirect('/admin/offers');
  }
};

// Get list of offers with filters
const getOffers = async (req, res) => {
  try {
    const filterType = req.query.filterType || 'all';
    const sortField = req.query.sortField || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const query = filterType !== 'all' ? { type: filterType } : {};

    const totalOffers = await Offer.countDocuments(query);
    const totalPages = Math.ceil(totalOffers / limit);

    const offers = await Offer.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit);

    const categories = await Category.find();
    const products = await Product.find();

    const validationErrors = req.flash('validationErrors');
    const formData = req.flash('formData')[0] || {};

    res.render('offers', {
      offers,
      categories,
      filterType,
      sortField,
      sortOrder,
      currentPage: page,
      totalPages,
      limit,
      messages: req.flash(),
      product:products,
      validationErrors,
      formData,
    });
  } catch (error) {
    console.error('Error fetching offers:', error.message);
    req.flash('error', 'An error occurred while fetching offers.');
    res.redirect('/admin');
  }
};

// Update an existing offer
const updateOffer = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('validationErrors', errors.array());
    req.flash('formData', req.body);
    return res.redirect('/admin/offers');
  }

  try {
    const { id, name, type, discount, productId, categoryId, referralCode, expirationDate } = req.body;

    const updatedOffer = {
      name,
      type,
      discount,
      productId: type === 'product' ? productId : undefined,
      categoryId: type === 'category' ? categoryId : undefined,
      referralCode: type === 'referral' ? referralCode : undefined,
      expirationDate,
    };

    await Offer.findByIdAndUpdate(id, updatedOffer);
    req.flash('success', 'Offer updated successfully!');
    res.redirect('/admin/offers');
  } catch (error) {
    console.error('Error updating offer:', error.message);
    req.flash('error', 'An error occurred while updating the offer.');
    res.redirect('/admin/offers');
  }
};

// Delete an existing offer
const deleteOffer = async (req, res) => {
  try {
    const { id } = req.body;
    await Offer.findByIdAndDelete(id);
    req.flash('success', 'Offer deleted successfully!');
    res.redirect('/admin/offers');
  } catch (error) {
    console.error('Error deleting offer:', error.message);
    req.flash('error', 'An error occurred while deleting the offer.');
    res.redirect('/admin/offers');
  }
};

// Apply an offer to products or categories
const applyOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const offer = await Offer.findById(offerId).populate('categoryId');

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    if (offer.expirationDate && offer.expirationDate < new Date()) {
      return res.status(400).json({ success: false, message: 'Offer expired' });
    }

    if (offer.type === 'product' && offer.productId) {
      const product = await Product.findById(offer.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      product.offerPrice = product.originalprice * (1 - offer.discount / 100);
      product.currentOffer = offer._id;
      await product.save();
    } else if (offer.type === 'category' && offer.categoryId) {
      const products = await Product.find({ category: offer.categoryId.name });
      for (const product of products) {
        product.offerPrice = product.originalprice * (1 - offer.discount / 100);
        product.currentOffer = offer._id;
        await product.save();
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid offer type or missing associated data' });
    }

    req.flash('offerApplied', offer._id);
    res.json({ success: true, message: 'Offer applied successfully' });
  } catch (error) {
    console.error('Error applying offer:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  createOffer,
  updateOffer,
  deleteOffer,
  getOffers,
  applyOffer,
};
