const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const User = require('../../models/userModel');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');

//secure password
const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
}

//load forget password page
const forgetLoad = async (req, res) => {
  try {
    res.render('forget');
  } catch (error) {
    console.log(error.message);
  }
}

//verify mail id
const forgetVerify = async (req, res) => {
  try {
    const email = req.body.email;

    const userData = await User.findOne({ email: email });
    if (userData) {
      if (userData.is_verified === 0) {
        res.render('forget', { message: "Please verify your mail" });
      }
      else {
        const randomString = randomstring.generate();
        const updatedData = await User.updateOne({ email: email }, { $set: { token: randomString } });
        sendResetPasswordMail(userData.name, userData.email, randomString);
        res.render('forget', { message: "Please check your mail to reset your Password" });
      }
    } else {
      res.render('forget', { message: "Incorrect Mail ID" });

    }

  } catch (error) {
    console.log(error.message)
  }
}

//send mail for reset password
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
      html: `<p>Hi ${name}, please click here to <a href="http://127.0.0.1:3002/forget-password?token=${token}">Reset</a> Your Password.</p>`
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent:", info.response);
      }
    });
  } catch (error) {
    console.log(error.message);
  }
}

//load reset password
const forgetPasswordLoad = async (req, res) => {
  try {

    const token = req.query.token;
    console.log('Received token:', token);
    const tokenData = await User.findOne({ token: token })
    if (tokenData) {
      res.render('forget-password', { user_id: tokenData._id, errors: null })

    }
    else {
      res.render('404', { message: "Token is invalid" });

    }
  } catch (error) {
    console.log(error.message)
  }
}

//reset password
const resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('forget-password', {
        user_id: req.body.user_id,
        errors: errors.array(),  
      });
    }

    const password = req.body.password;
    const user_id = req.body.user_id;

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).send('Invalid user_id');
    }

    const secure_password = await securePassword(password);

    await User.findByIdAndUpdate(
      { _id: user_id },
      { $set: { password: secure_password, token: '' } }
    );

    res.redirect('/');
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  forgetLoad,
  forgetVerify,
  forgetPasswordLoad,
  resetPassword,
}
