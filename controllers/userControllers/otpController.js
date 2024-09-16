
const mongoose = require('mongoose');
const User = require('../../models/userModel')
require('../../passport');
const nodemailer = require('nodemailer');
const otpCache = {};

//load OTP page
const otploginLoad = async (req, res) => {
  try {
    res.render('otplogin');
  } catch (error) {
    console.log(error.message);
  }
}

//send OTP
const sendotp = async (email, otp) => {
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
    subject: 'OTP for Login',
    text: `Your OTP is: ${otp}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

//verify mail
const verifyotpmail = async (req, res) => {
  try {
    const email = req.body.email;
    const userData = await User.findOne({ email: email });
    if (userData) {
      if (userData.is_verified === 0) {
        res.render('otplogin', { message: "Please verify your mail" });
      } else if (userData.isBlocked) {
        res.render('otplogin', { message: "Your account is blocked. Contact support for assistance." });
      } else {
        console.log('Received request:', req.body);
        const otp = Math.floor(1000 + Math.random() * 9000);
        console.log('Generated OTP:', otp);
        otpCache[email] = otp;

        sendotp(userData.email, otp);
        res.render('enterOTP', { message: "OTP sent. Please enter your OTP", email: email });
      }
    } else {
      res.render('otplogin', { message: "Incorrect Mail ID" });
    }
  } catch (error) {
    console.log(error.message);
  }
}

//load enter otp page
const enterOTPLoad = async (req, res) => {
  try {
    const email = req.body.email || req.query.email || req.session.email;
    if (!email) {
      return res.status(400).send('Email is required');
    }
    console.log('Email:', email);
    res.render('enterOTP', { email });
  } catch (error) {
    console.log(error.message);
  }
}

//verify otp
const verifyotp = async (req, res) => {
  try {
    const otp = parseInt(req.body.password);
    const email = req.body.email;
    const storedOTP = otpCache[email];
    const userData = await User.findOne({ email: email });

    console.log('Entered OTP:', otp);
    console.log('Stored OTP:', storedOTP);

    if (otp === storedOTP) {
      req.session.user_id = userData._id;
      return res.json({ success: true, redirect: '/home' });
    } else {
      return res.json({ success: false, message: 'Invalid OTP. Please try again.' });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

//resend otp
const resendOTP = async (req, res) => {
  console.log('Request Body:', req.body);
  console.log('Session:', req.session);
  try {
    const email = req.body.email || req.session.email;
    if (!email) {
      console.log('Email is required but not provided');
      return res.status(400).send('Email is required');
    }
    const userData = await User.findOne({ email: email });
    if (userData) {
      const otp = Math.floor(1000 + Math.random() * 9000);
      otpCache[email] = otp;
      sendotp(userData.email, otp);
      res.json({ success: true, message: "OTP resent successfully.", email });
    } else {
      res.status(404).json({ success: false, message: "User not found. Please enter your email again." });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


module.exports = {
  otploginLoad,
  sendotp,
  verifyotp,
  verifyotpmail,
  enterOTPLoad,
  resendOTP
}
