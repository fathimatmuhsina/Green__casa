const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const User = require('../../models/userModel');
const bcrypt = require('bcryptjs'); // Corrected the spelling of 'bcrypt'
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');

// Function to hash passwords
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error('Error hashing password:', error.message);
    throw new Error('Password hashing failed');
  }
}

// Function to send reset password email
const sendResetPasswordMail = async (name, email, token) => {
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
      subject: "Reset Password",
      html: `<p>Hi ${name}, please click <a href="http://127.0.0.1:3002/admin/forget-password?token=${token}">here</a> to reset your password.</p>`
    };

    await transporter.sendMail(mailOptions);
    console.log("Email has been sent to:", email);
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw new Error('Email sending failed');
  }
}

// Load the password reset request page
const forgetLoad = async (req, res) => {
  try {
    res.render('forget');
  } catch (error) {
    console.error('Error loading forget password page:', error.message);
    res.status(500).send('Internal Server Error');
  }
}

// Verify email and send reset password mail
const forgetVerify = async (req, res) => {
  try {
    const email = req.body.email;
    const userData = await User.findOne({ email });

    if (userData) {
      if (userData.is_admin === 0) {
        res.render('forget', { message: "Please verify your mail" });
      } else {
        const randomString = randomstring.generate();
        await User.updateOne({ email }, { $set: { token: randomString } });
        await sendResetPasswordMail(userData.name, userData.email, randomString);
        res.render('forget', { message: "Please check your mail to reset your password" });
      }
    } else {
      res.render('forget', { message: "Incorrect Mail ID" });
    }
  } catch (error) {
    console.error('Error verifying forget password request:', error.message);
    res.status(500).send('Internal Server Error');
  }
}

// Load the password reset form
const forgetPasswordLoad = async (req, res) => {
  try {
    const token = req.query.token;
    console.log('Received token:', token);
    
    const tokenData = await User.findOne({ token });

    if (tokenData) {
      res.render('forget-password', { user_id: tokenData._id, errors: null });
    } else {
      res.render('404', { message: "Token is invalid" });
    }
  } catch (error) {
    console.error('Error loading forget password form:', error.message);
    res.status(500).send('Internal Server Error');
  }
}

// Reset password and update user record
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('forget-password', {
        user_id: req.body.user_id,
        errors: errors.array(),
      });
    }

    console.log('Received request:', req.body);
    const { password, user_id } = req.body;

    console.log('Received password:', password);
    console.log('Received user_id:', user_id);

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      console.error('Invalid user_id');
      return res.status(400).send('Invalid user_id');
    }

    const secure_password = await securePassword(password);
    console.log('Secure password:', secure_password);

    await User.findByIdAndUpdate(user_id, { $set: { password: secure_password, token: '' } });
    console.log('Password updated successfully');

    res.redirect('/admin');
  } catch (error) {
    console.error('Error resetting password:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  forgetLoad,
  forgetVerify,
  forgetPasswordLoad,
  resetPassword,
};
