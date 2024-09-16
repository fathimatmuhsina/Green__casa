const { validationResult } = require('express-validator');
const User = require('../../models/userModel');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Cart = require('../../models/cartModel')
const Wishlist = require('../../models/wishlistModel')

// Show user profile
const loadProfile = async (req, res) => {
  let wishlistCount = 0;
  let cartCount = 0;

  let items = [];
  try {
    if (req.session.user_id) {
      userData = await User.findById(req.session.user_id).populate('address');
      if (userData) {
        const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
        if (cart) {
          items = cart.items;
          cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
          totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
        }
        const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
        if (wishlist) {
          items = wishlist.items;
          wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
        }
      }
    }
    res.render('profile', {
      user: userData,
      errors: null,
      cartCount,
      wishlistCount,
      messages: req.flash()
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

// Render Change Password Page
const renderChangePasswordPage = async (req, res) => {
  let wishlistCount = 0;
  let cartCount = 0;
  let items = [];
  try {
    if (req.session.user_id) {
      userData = await User.findById(req.session.user_id).populate('address');
      if (userData) {
        const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
        if (cart) {
          items = cart.items;
          cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
          totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
        }
        const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
        if (wishlist) {
          items = wishlist.items;
          wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
        }
      }
    }
    res.render('change-password', { user:userData,errors: null,cartCount,wishlistCount });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

// Handle Password Change
const changePassword = async (req, res) => {
  let wishlistCount = 0;
  let cartCount = 0;
  let items = [];
  const errors = validationResult(req);
  if (req.session.user_id) {
    userData = await User.findById(req.session.user_id).populate('address');
    if (userData) {
      const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
      if (cart) {
        items = cart.items;
        cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
        totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
      }
      const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
      if (wishlist) {
        items = wishlist.items;
        wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }
  }
  if (!errors.isEmpty()) {
    return res.render('change-password', { user:userData,errors: errors.mapped(),cartCount,wishlistCount });
  }

  try {
    const userId = req.session.user_id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return res.render('change-password', { errors: { confirmPassword: { msg: 'New password and confirmation do not match' } } });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.render('change-password', { errors: { currentPassword: { msg: 'Incorrect current password' } } });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    req.flash('success_msg', 'Password changed successfully');
    res.redirect('/profile');
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

//load edit profile page
const editLoad = async (req, res) => {
  let wishlistCount = 0;
  let cartCount = 0;
  let items = [];
  try {
    const id = req.query.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid user ID');
    }
    const userData = await User.findById({ _id: id });
    if (userData) {
      const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
      if (cart) {
        items = cart.items;
        cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
        totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
      }
      const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
      if (wishlist) {
        items = wishlist.items;
        wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
      }
      res.render('edit-profile', { user: userData, errors: null , cartCount,
        wishlistCount,});
    } else {
      res.redirect('/home');
    }
  } catch (error) {
    console.log(error.message);
  }
}

//update profile
const updateProfile = async (req, res) => {
  let wishlistCount = 0;
  let cartCount = 0;

  let items = [];
  try {
    const errors = validationResult(req);
    const { image, name, mobile } = req.body;

    if (!errors.isEmpty()) {
      const id = req.body.user_id;
      const userData = await User.findById(id);
      if (userData) {
        const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
        if (cart) {
          items = cart.items;
          cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
          totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
        }
        const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
        if (wishlist) {
          items = wishlist.items;
          wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
        }

      }
      return res.render('edit-profile', { user: userData, errors: errors.mapped(),cartCount,
        wishlistCount, });
    }

    const user = {
      image, name, mobile
    };

    let userData;

    if (req.file) {
      userData = await User.findByIdAndUpdate(
        { _id: req.body.user_id },
        {
          $set: {
            name,

            mobile,
            image: req.file.filename,
          }
        }, { new: true });
    } else {
      userData = await User.findByIdAndUpdate(
        { _id: req.body.user_id },
        {
          $set: {
            name,

            mobile,
          }
        }, { new: true }
      );
    }

    if (!userData) {
      return res.status(404).send('User not found');
    }

    
    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (error) {
    console.log(error.message);
  }
};


// Render Add Address Page
const AddressLoad = async (req, res) => {
  let wishlistCount = 0;
  let cartCount = 0;

  let items = [];
  try {
    const id = req.query.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid user ID');
      return res.status(400).send('Invalid user ID');
    }
    const userData = await User.findById(id);
    if (userData) {
      const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
      if (cart) {
        items = cart.items;
        cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
        totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
      }
      const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
      if (wishlist) {
        items = wishlist.items;
        wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }
    else {
      console.log('User not found');
      return res.redirect('/profile');
    }

    console.log('User Data:', userData);
    res.render('add-address', { user: userData, errors: null,cartCount,
      wishlistCount, });
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

//add new address
const addAddress = async (req, res) => {
  let wishlistCount = 0;
  let cartCount = 0;
  let items = [];
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const userId = req.body.user_id;
    const userData = await User.findById(userId);
    if (userData) {
      const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
      if (cart) {
        items = cart.items;
        cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
        totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
      }
      const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
      if (wishlist) {
        items = wishlist.items;
        wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
      }

    }
    return res.render('add-address', { user: userData, errors: errors.mapped(),cartCount,wishlistCount });
  }
  try {
    const userId = req.session.user_id;
    if (!userId) {
      return res.status(401).json({ message: 'User not logged in' });
    }

    const { housename, street, city, state, zipcode, country, mobile } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newAddress = { housename, street, city, state, zipcode, country, mobile };
    user.address.push(newAddress);
    await user.save();

    req.flash('success_msg', 'Address added successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error('Error adding address:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

//load edit address page
const renderEditAddressPage = async (req, res) => {
  let wishlistCount = 0;
  let cartCount = 0;
  let items = [];
  try {
    const userData = await User.findById(req.query.id);
    if (userData) {
      const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
      if (cart) {
        items = cart.items;
        cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
        totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
      }
      const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
      if (wishlist) {
        items = wishlist.items;
        wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }
    const address = userData.address.id(req.query.address_id);
    res.render('edit-address', { user:userData, address, errors: null ,cartCount,wishlistCount});
  } catch (err) {
    res.status(500).send(err);
  }
};

//edit address
const editAddress = async (req, res) => {
  let wishlistCount = 0;
  let cartCount = 0;
  let items = [];
 
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const { user_id, address_id } = req.body;
      const userData = await User.findById(user_id);
      if (userData) {
        const cart = await Cart.findOne({ user: userData._id }).populate('items.product');
        if (cart) {
          items = cart.items;
          cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
          totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
        }
        const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
        if (wishlist) {
          items = wishlist.items;
          wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
        }
      }
      const address = userData.address.id(address_id);

      return res.render('edit-address', { user:userData, address, errors: errors.mapped(),cartCount,wishlistCount });
    }
    try {
    const { user_id, address_id, housename, street, city, state, zipcode, country, mobile } = req.body;
    const userData = await User.findById(user_id);

    if (!userData) {
      return res.status(404).send('User not found');
    }

    const address = userData.address.id(address_id);
    if (!address) {
      return res.status(404).send('Address not found');
    }

    // Update address fields
    address.housename = housename;
    address.street = street;
    address.city = city;
    address.state = state;
    address.zipcode = zipcode;
    address.country = country;
    address.mobile = mobile;

    await userData.save();

    req.flash('success_msg', 'Address updated successfully');
    res.redirect('/profile');
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Server error');
  }
};

//delete existing address
const deleteAddress = async (req, res) => {
  try {
    const { user_id, address_id } = req.body;
    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Remove address from the array
    user.address.pull(address_id);
    await user.save();

    res.redirect('/profile');
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};


module.exports = {
  loadProfile,
  addAddress,
  editAddress,
  deleteAddress,
  AddressLoad,
  editLoad,
  updateProfile,
  renderEditAddressPage,
  renderChangePasswordPage,
  changePassword
};
