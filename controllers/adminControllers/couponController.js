const Coupon = require('../../models/couponModel');
const { validationResult } = require('express-validator');

// Create a new coupon
const createCoupon = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, discount, maxDiscount, expirationDate } = req.body;
    const existingCoupon = await Coupon.findOne({ code });

    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists.' });
    }

    const coupon = new Coupon({
      code,
      discount,
      maxDiscount,
      expirationDate
    });

    await coupon.save();
    res.status(201).json({ message: 'Coupon created successfully.' });
  } catch (error) {
    console.error('Error creating coupon:', error.message);
    res.status(500).json({ message: 'Server error. Could not create coupon.' });
  }
};

// Get all coupons with optional search, sort, and pagination
const getAllCoupons = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || '';
    const sortField = req.query.sortField || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const query = searchQuery 
      ? { code: { $regex: searchQuery, $options: 'i' } } 
      : {};

    const [coupons, totalCount] = await Promise.all([
      Coupon.find(query).sort({ [sortField]: sortOrder }).skip(skip).limit(limit),
      Coupon.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.render('coupon-management', { 
      coupons,
      currentPage: page,
      totalPages,
      searchQuery,
      totalCount,
      sortField,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc',
      limit 
    });
  } catch (error) {
    console.error('Error retrieving coupons:', error.message);
    res.status(500).json({ message: 'Server error. Could not retrieve coupons.' });
  }
};

// Delete a coupon
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found.' });
    }

    res.status(200).json({ message: 'Coupon deleted successfully.' });
  } catch (error) {
    console.error('Error deleting coupon:', error.message);
    res.status(500).json({ message: 'Server error. Could not delete coupon.' });
  }
};

module.exports = {
  getAllCoupons,
  createCoupon,
  deleteCoupon
};
