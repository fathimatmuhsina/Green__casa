const mongoose = require('mongoose');
const Cart = require('../../models/cartModel');
const Wishlist = require('../../models/wishlistModel');
const { validationResult } = require('express-validator');
const User = require('../../models/userModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModels');
const passport = require('passport')
require('../../passport')
const bycrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

//secure Password
const securePassword = async (password) => {
  try {
    const passwordHash = await bycrypt.hash(password, 10);
    return passwordHash
  } catch (error) {
    console.log(error.message)
  }
}

//for send mail
const sendVerifyMail = async (name, email, user_id) => {
  try {
    const transporter = nodemailer.createTransport({

      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.emailUser,
        pass: process.env.emailPassword,
      },
    });

    const mailOptions = {
      from: process.env.emailUser,
      to: email,
      subject: "Verify Mail",
      html: '<p>Hi' + name + ', please click here to <a href="http://127.0.0.1:3002/verify?id=' + user_id + '">Verify</a> Your Mail.</p> '

    }
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error)
      }
      else {
        console.log("Email has been sent:-", info.response)
      }
    })

  } catch (error) {
    console.log(error.message)

  }
}

//load Registration page
const loadRegister = async (req, res) => {
  try {
    res.render('registration', { errors: null, });
  }
  catch (error) {
    console.log(error.message);

  }
}

//add new user
const insertUser = async (req, res) => {
  const errors = validationResult(req);
  const { name, email, mobile, password } = req.body;

  if (!errors.isEmpty()) {
    return res.render('registration', { name, email, mobile, password, errors: errors.mapped() });
  }
  try {
    const spassword = await securePassword(req.body.password);
    const user = new User({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: spassword,
      is_admin: 0,
    });
    const userData = await user.save();

    if (userData) {
      sendVerifyMail(req.body.name, req.body.email, userData._id);

      const successMessage = 'Your registration has been success. Verify your email';
      console.log("Message before rendering:", successMessage);
      res.render('registration', { message: successMessage, errors: {} });
    }
    else {
      res.render('registration', { message: " Your registration has been failed", errors: {} })
    }
  }
  catch (error) {
    console.log(error.message)
  }
};

//load login page
const loginLoad = async (req, res) => {
  try {
    res.render('login')
  } catch (error) {
    console.log(error.message);
  }
}

//verify login details
const verifyLogin = async (req, res) => {
  try {
    const email = req.body.email;
    console.log(email)
    const password = req.body.password;
    console.log(password)
    const userData = await User.findOne({ email: email })
    if (userData) {
      const passwordMatch = await bycrypt.compare(password, userData.password)

      if (passwordMatch) {

        if (userData.is_verified === 0) {

          res.render('login', { message: "Verify please" });
        } else if (userData.isBlocked) {
          res.render('login', { message: "Your account is blocked. Contact support for assistance." });
        }
        else {
          req.session.user_id = userData._id;
          res.redirect('/home');
        }
      }
      else {
        res.render('login', { message: "Invalid username or password." })
      }
    }
    else {
      res.render('login', { message: "Invalid username or password." })
    }

  } catch (error) {
    console.log(error.message)
  }
}

//verify mail
const verifyMail = async (req, res) => {
  try {
    const updateInfo = await User.updateOne({ _id: req.query.id }, { $set: { is_verified: 1 } })
    console.log(updateInfo);
    res.render("Email-verified")

  } catch (error) {
    console.log(error.message)
  }
}

//google login
const googleLoginLoad = async (req, res) => {
  try {
    const user = req.user; // Get the user from the request object set by passport
    console.log(user);

    if (user) {
      req.session.user_id = user._id; // Set session with user ID

      // Load the user's cart details
      const cart = await Cart.findOne({ user: user._id }).populate('items.product');

      // Calculate cartCount and totalPrice based on user's cart items
      let cartCount = 0;
      let totalPrice = 0;
      let wishlistCount = 0;
      let categories = null;

      if (req.session.user_id) {
        userData = await User.findById(req.session.user_id);
        const cart = await Cart.findOne({ user: userData._id }).populate('items.product');

        if (cart) {
          items = cart.items;
          cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
          totalPrice = cart.items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
        }
        const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
        if (wishlist) {
          items = wishlist.items;
          wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
        }
      }

      const productData = await Product.find({ is_listed: true });
      categories = await Category.find({ status: true });

      res.render('home', {
        user: user,
        cartCount,
        items: cart ? cart.items : [], // Pass cart items to the view
        products: productData,
        totalPrice: totalPrice.toFixed(2),
        wishlistCount,
        categories,
      });
    } else {
      res.render('home', { user: null, cartCount: 0, items: [], products: [], totalPrice: '0.00' });
    }
  } catch (error) {
    console.error('Error in googleLoginLoad:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

//load home page
const loadHome = async (req, res) => {
  try {
    let cartCount = 0;
    let totalPrice = 0;
    let wishlistCount = 0;
    let userData = null;
    let items = [];
    let categories = null;

    if (req.session.user_id) {
      userData = await User.findById(req.session.user_id);
      const cart = await Cart.findOne({ user: userData._id }).populate('items.product');

      if (cart) {
        items = cart.items;
        cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
        totalPrice = cart.items.reduce((sum, item) => sum + item.quantity * (item.product.offerPrice || item.product.discountprice), 0);
      }
      const wishlist = await Wishlist.findOne({ user: userData._id }).populate('items.product');
      if (wishlist) {
        items = wishlist.items;
        wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }
    categories = await Category.find({ status: true });
    let filter = { is_listed: true };
    console.log(filter);

    if (req.query.showOffers) {
      filter.offerPrice = { $gt: 0 };
      console.log(filter.offerPrice);
    }

    const productData = await Product.find(filter);
    productData.forEach(product => {
      if (product.offerPrice) {
        product.offerPercentage = Math.round(((product.originalprice - product.offerPrice) / product.originalprice) * 100);
      } else {
        product.offerPercentage = 0;
      }
    });

    res.render('home', {
      items,
      user: userData,
      products: productData,
      cartCount,
      totalPrice: totalPrice.toFixed(2),
      categories,
      wishlistCount,
    });
  } catch (error) {
    console.error('Error in loadHome:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

//logout
const userLogout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect('/');

  } catch (error) {
    console.log(error.message)
  }
}

module.exports = {
  loadRegister,
  insertUser,
  verifyMail,
  loginLoad,
  verifyLogin,
  googleLoginLoad,
  loadHome,
  userLogout
}
