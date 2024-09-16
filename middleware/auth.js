const User = require('../models/userModel');


const isLogin = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      // Fetch user details from the database and set req.user
      const user = await User.findById(req.session.user_id);
      if (user) {
        req.user = user; // Set user data on req
        return next(); // Proceed to the next middleware or route handler
      } else {
        return res.redirect('/'); // Redirect if user not found
      }
    } else {
      return res.redirect('/'); // Redirect if not logged in
    }
  } catch (error) {
    console.error('Error in isLogin middleware:', error.message);
    return res.status(500).send('Server error');
  }
};
const isLogout = async (req, res, next) => {
  try {
    if (req.session.user_id) {
      if (!res.headersSent) {
        return res.redirect('/home'); // Redirect if already logged in
      }
    } else {
      return next(); // Proceed if not logged in
    }
  } catch (error) {
    console.error('Error in isLogout middleware:', error.message);
    if (!res.headersSent) {
      return res.status(500).send('Server error');
    }
  }
};



const isAdmin = (req, res, next) => {
  if (req.session.user_id){
    console.log('no user fount')
  }
  console.log('User:', req.user);
  if (req.user && req.user.is_admin === 1) {
    return next();
  } else {
    return res.status(403).json({ message: 'Forbidden' });
  }
};


const checkBlockedStatus = (req, res, next) => {
  console.log('Checking blocked status...');
  if (req.userData && req.userData.isBlocked) {
    console.log('User is blocked. Unable to login.');
    return res.status(401).json({ message: 'Blocked user. Unable to login.' });
  }

  next();
};



module.exports = {
  isLogin,
  isLogout,
  isAdmin,
  checkBlockedStatus
}

