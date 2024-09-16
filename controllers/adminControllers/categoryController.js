const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Category = require('../../models/categoryModels');

// View Categories
const viewCategories = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);

    const categories = await Category.find()
      .skip((page - 1) * limit)
      .limit(limit);

    res.render('view-category', {
      categories,
      currentPage: page,
      totalPages,
      limit,
      errors: null,
    });
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

// Add Category
const addCategory = async (req, res) => {
  const { name } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.mapped() });
  }

  try {
    const category = new Category({
      name,
      status: true,
      createdAt: Date.now(),
    });

    const savedCategory = await category.save();

    if (savedCategory) {
      return res.status(200).json({ message: 'Category added successfully' });
    } else {
      return res.status(500).json({ message: 'Something went wrong' });
    }
  } catch (error) {
    console.error('Error saving category:', error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Update Category
const updateCategory = async (req, res) => {
  const errors = validationResult(req);

  if (!req.body.id || !mongoose.Types.ObjectId.isValid(req.body.id)) {
    return res.status(400).json({ error: 'Invalid category ID' });
  }

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.mapped() });
  }

  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.body.id,
      { $set: { name: req.body.name } },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating category:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Toggle Category Status
const toggleCategoryStatus = async (req, res, next) => {
  const categoryId = req.params.id;

  try {
    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.status = !category.status;
    await category.save();

    res.redirect('/admin/view-category');
  } catch (error) {
    console.error('Error toggling category status:', error.message);
    res.status(500).send('Internal Server Error');
    next(error);
  }
};

module.exports = {
  viewCategories,
  addCategory,
  updateCategory,
  toggleCategoryStatus,
};
