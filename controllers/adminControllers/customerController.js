const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const User = require('../../models/userModel');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const randomstring = require('randomstring');

// Load the login page
const loadLogin = async (req, res) => {
  try {
    res.render('login');
  } catch (error) {
    console.error('Error loading login page:', error.message);
    if (!res.headersSent) {
      res.status(500).send('An error occurred while loading the login page.');
    }
  }
};

// Verify user login credentials
const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userData = await User.findOne({ email });

    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);

      if (passwordMatch) {
        if (userData.is_admin === 0) {
          return res.render('login', { message: 'Invalid email or password.' });
        } else {
          req.session.user_id = userData._id;
          return res.redirect('/admin/home');
        }
      } else {
        return res.render('login', { message: 'Invalid email or password.' });
      }
    } else {
      return res.render('login', { message: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error('Error verifying login:', error.message);
    res.status(500).send('Server error during login verification.');
  }
};

// Load the profile page
const loadProfile = async (req, res) => {
  try {
    const userData = await User.findById(req.session.user_id);

    if (userData && userData.is_admin === 1) {
      res.render('profile', { admin: userData });
    } else {
      res.redirect('/admin/home');
    }
  } catch (error) {
    console.error('Error loading profile page:', error.message);
    res.status(500).send('Server error while loading profile page.');
  }
};

// Load the dashboard
const loadDashboard = async (req, res) => {
  try {
    res.render('home');
  } catch (error) {
    console.error('Error loading dashboard:', error.message);
    res.status(500).send('Server error while loading dashboard.');
  }
};

// Log out the user
const logout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect('/admin');
  } catch (error) {
    console.error('Error during logout:', error.message);
    res.status(500).send('Server error during logout.');
  }
};

// Load the admin dashboard with user data
const adminDashboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const page = parseInt(req.query.page, 10) || 1;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments({ is_admin: 0 });
    const totalPages = Math.ceil(totalUsers / limit);

    const usersData = await User.find({ is_admin: 0 })
      .skip(skip)
      .limit(limit);

    const successMessage = req.flash('success');
    const updateMessage = req.flash('updatesuccess');
    const addMessage = req.flash('addsuccess');

    res.render('dashboard', {
      users: usersData,
      currentPage: page,
      totalPages,
      limit,
      successMessage,
      updateMessage,
      addMessage,
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error.message);
    res.status(500).send('Server error while loading admin dashboard.');
  }
};

// Toggle user status (block/unblock)
const toggleUserStatus = async (req, res, next) => {
  const id = req.params.id;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: `User not found with ID ${id}` });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Error toggling user status:', error.message);
    res.status(500).send('Internal Server Error');
    next(error);
  }
};

// View user details
const viewUserDetail = async (req, res) => {
  try {
    const id = req.query.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid user ID');
    }

    const userData = await User.findById(id);

    if (userData) {
      res.render('viewUserDetail', { users: userData });
    } else {
      res.redirect('/admin/dashboard');
    }
  } catch (error) {
    console.error('Error viewing user details:', error.message);
    res.status(500).send('Server error while viewing user details.');
  }
};

// Export all controller functions
module.exports = {
  loadLogin,
  verifyLogin,
  loadProfile,
  logout,
  adminDashboard,
  loadDashboard,
  viewUserDetail,
  toggleUserStatus,
};
