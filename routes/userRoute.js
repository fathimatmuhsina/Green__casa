const express = require('express');
const user_route = express();
const passport = require('passport');
const auth = require('../middleware/auth');
user_route.use((req, res, next) => {
  if (req.session.email) {
      req.body.email = req.session.email;
  }
  next();
});

// Set up passport
user_route.use(passport.initialize());
user_route.use(passport.session());
user_route.set('view engine', 'ejs');
user_route.set('views', './views/users');
const multer = require('multer');
const path = require('path');
user_route.use(express.static('public'));


const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, path.join(__dirname, '../public/images'));
  },
  filename: function (req, file, callback) {
    const name = Date.now() + '-' + file.originalname;
    callback(null, name);
  }
});
const upload = multer({ storage: storage });


//controllers
const userController = require('../controllers/userControllers/userController');
const otpController = require('../controllers/userControllers/otpController');
const productController = require('../controllers/userControllers/productController');
const forgetPasswordController = require('../controllers/userControllers/forgetPasswordController');
const cartController = require('../controllers/userControllers/cartController');
const checkoutController = require('../controllers/userControllers/checkoutController');
const placeOrderController = require('../controllers/userControllers/placeOrderController');
const orderController = require('../controllers/userControllers/orderController');
const profileController = require('../controllers/userControllers/profileController');
const wishlistController = require('../controllers/userControllers/wishlistController');
const walletController=require('../controllers/userControllers/walletController')

//middleware
const passwordValidationRule = require('../middleware/passwordValidator');
const userValidationRules = require('../middleware/userValidator');
const profileValidator = require('../middleware/profileValidator');



// Google authentication routes
user_route.get('/auth/google',
  passport.authenticate('google', { scope: ['email', 'profile'] })
);
user_route.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login',
  }),
  (req, res) => {
    res.redirect('/success');
  }
);

//userRoutes
user_route.get('/success',userController.googleLoginLoad)
user_route.get('/register',auth.isLogout, userController.loadRegister);
user_route.post('/register',upload.single('image'), userValidationRules.userValidationRules,userController.insertUser);
user_route.get('/verify', userController.verifyMail);
user_route.get('/',userController.loadHome);
user_route.get('/login',auth.isLogout,userController.loginLoad);
user_route.post('/login',auth.checkBlockedStatus, userController.verifyLogin);
user_route.get('/home', userController.loadHome);
user_route.get('/logout', auth.isLogin, userController.userLogout);

//otpRoutes
user_route.get('/otplogin', auth.isLogout, otpController.otploginLoad);
user_route.post('/otplogin', auth.isLogout, otpController.verifyotpmail);
user_route.get('/enterOTP', auth.isLogout, otpController.enterOTPLoad);
user_route.post('/verifyotp', auth.isLogout, otpController.verifyotp);  
user_route.post('/resendotp', auth.isLogout, otpController.resendOTP); 

//productRoutes
user_route.get('/products',productController.productLoad);
user_route.get('/search',productController.searchProduct);
user_route.get('/product-detail', productController.loadProductDetail);

//passworderRoutes
user_route.get('/forget',auth.isLogout,forgetPasswordController.forgetLoad);
user_route.post('/forget',forgetPasswordController.forgetVerify);
user_route.get('/forget-password',auth.isLogout,forgetPasswordController.forgetPasswordLoad)
user_route.post('/forget-password',passwordValidationRule,forgetPasswordController.resetPassword);


//checkout routes
user_route.get('/add-deliveryaddress',auth.isLogin,checkoutController.AddressLoad)
user_route.post('/add-deliveryaddress',auth.isLogin,profileValidator.addressValidator,checkoutController.addAddress)
user_route.get('/checkout', auth.isLogin, checkoutController.getCheckOut);
user_route.get('/edit-deliveryaddress', auth.isLogin, checkoutController.renderEditAddressPage);
user_route.post('/edit-deliveryaddress', auth.isLogin, profileValidator.addressValidator, checkoutController.editAddress);
user_route.post('/delete-deliveryaddress', checkoutController.deleteAddress);
 
//cart Routes
user_route.post('/add-to-cart', cartController.addToCart);
user_route.get('/cart', cartController.getCart);
user_route.get('/cart-count', cartController.getCartCount);
user_route.post('/cart/remove-from-cart',cartController.removeFromCart);
user_route.post('/cart/update-quantity', cartController.updateQuantity);
user_route.get('/cart/update-quantity', cartController.updateQuantity);
user_route.post('/cart/apply-coupon',auth.isLogin, cartController.applyCoupon);
user_route.post('/cart/remove-referral', cartController.removeReferral);
user_route.post('/cart/apply-referral',auth.isLogin, cartController.applyReferral);

//placeOrderRoutes

user_route.post('/checkout', placeOrderController.PlaceOrder);
user_route.get('/verifyPayment', placeOrderController.verifyPayment);
user_route.post('/verifyPayment', placeOrderController.verifyPayment);
user_route.post('/retry-payment/:orderId',auth.isLogin,placeOrderController.retryPayment);

//orderRoutes
user_route.get('/orders', orderController.getOrders);
user_route.post('/cancel-order',auth.isLogin, orderController.cancelOrder);
user_route.get('/order-success', orderController.orderSuccess);
user_route.get('/order-failure', orderController.orderFailure);
user_route.get('/order-detail', orderController.loadOrderDetail);
user_route.post('/cancel-product', orderController.cancelOrder);
user_route.post('/return-order', orderController.returnOrder);
user_route.post('/cancel-return', orderController.cancelReturn);
user_route.post('/download-invoice', orderController.generateInvoicePDF);

// Profile routes
user_route.get('/profile', auth.isLogin, profileController.loadProfile);
user_route.get('/edit-address', auth.isLogin, profileController.renderEditAddressPage);
user_route.post('/edit-address', auth.isLogin, profileValidator.addressValidator, profileController.editAddress);
user_route.get('/add-address',auth.isLogin,profileController.AddressLoad)
user_route.post('/add-address',auth.isLogin,profileValidator.addressValidator,profileController.addAddress)
user_route.get('/edit-profile',auth.isLogin,profileController.editLoad)
user_route.post('/edit-profile',upload.single('image'),profileValidator.profileValidator,profileController.updateProfile)
user_route.post('/delete-address', profileController.deleteAddress);
user_route.get('/change-password', auth.isLogin, profileController.renderChangePasswordPage);
user_route.post('/change-password', auth.isLogin, profileValidator.changePasswordValidator, profileController.changePassword);
   
//wishlistRoutes
user_route.post('/add-to-wishlist', wishlistController.addToWishlist);
user_route.get('/wishlist', wishlistController.getWishlist);
user_route.post('/wishlist/remove', wishlistController.removeFromWishlist);
user_route.get('/wallet', walletController.getWallet);


module.exports = user_route; 



 