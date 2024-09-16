const express = require('express');
const admin_route = express();
require('dotenv').config();
const flash = require('express-flash')
admin_route.use(flash())
const config = require("../config/config");
admin_route.set('view engine', 'ejs');
admin_route.set('views', './views/admin');
const path = require('path');
admin_route.use(express.static(path.join(__dirname, 'public')));
admin_route.use(express.static('public'));

//middlewares
const auth = require('../middleware/adminAuth');
const upload = require('../middleware/multerMiddleware');
const categoryValidationRules = require('../middleware/categoryValidator');
const productValidationRules = require('../middleware/productValidator');
const userValidationRules = require('../middleware/userValidator');
const passwordValidationRule = require('../middleware/passwordValidator');
const couponValidator = require('../middleware/couponValidator')
const offerValidator = require('../middleware/offerValidator')

//controllers
const categoryController = require('../controllers/adminControllers/categoryController');
const customerController = require('../controllers/adminControllers/customerController');
const productController = require('../controllers/adminControllers/productController');
const forgetPasswordController = require('../controllers/adminControllers/forgetPasswordController');
const orderController = require('../controllers/adminControllers/orderController');
const offerController = require('../controllers/adminControllers/offerController');
const reportController = require('../controllers/adminControllers/reportController')
const couponController = require('../controllers/adminControllers/couponController')
const dashboardController = require('../controllers/adminControllers/dashboardController')


//Login and Customer Routes
admin_route.get('/', auth.isLogout, customerController.loadLogin);
admin_route.post('/', auth.isLogout, customerController.verifyLogin);
admin_route.get('/home', auth.isLogin, customerController.loadDashboard);
admin_route.get('/profile', auth.isLogin, customerController.loadProfile);
admin_route.get('/logout', auth.isLogin, customerController.logout)
admin_route.get('/toggle-user-status/:id', auth.isLogin, customerController.toggleUserStatus)
admin_route.get('/viewUserDetail', auth.isLogin, customerController.viewUserDetail);
admin_route.get('/dashboard', auth.isLogin, customerController.adminDashboard)

//Forgot Password Routes
admin_route.get('/forget', auth.isLogout, forgetPasswordController.forgetLoad)
admin_route.post('/forget', auth.isLogout, forgetPasswordController.forgetVerify)
admin_route.get('/forget-password', auth.isLogout, forgetPasswordController.forgetPasswordLoad)
admin_route.post('/forget-password', auth.isLogout, passwordValidationRule, forgetPasswordController.resetPassword)


//Product Routes 
admin_route.get('/view-products', auth.isLogin, productController.adminProducts)
admin_route.get('/add-products', auth.isLogin, productController.newProductsLoad)
admin_route.post('/add-products', upload.array('image', 5), productValidationRules.productValidationRules, productController.addProducts)
admin_route.get('/edit-product', auth.isLogin, productController.editProductLoad)
admin_route.post('/edit-product', upload.array('image', 5), productValidationRules.updateProductRules, productController.updateProduct)
admin_route.get('/view-product-details', auth.isLogin, productController.productDetailLoad);
admin_route.get('/inventory', auth.isLogin, productController.viewInventory);
admin_route.post('/update-stock', auth.isLogin, productValidationRules.stockValidationRules, productController.updateStock);
admin_route.get('/toggle-product-status/:id', auth.isLogin, productController.toggleProductStatus)


//Category Routes
admin_route.get('/view-category', auth.isLogin, categoryController.viewCategories)
admin_route.post('/add-category', auth.isLogin, categoryValidationRules, categoryController.addCategory)
admin_route.post('/update-category', auth.isLogin, categoryValidationRules, categoryController.updateCategory);
admin_route.get('/toggle-category-status/:id', auth.isLogin, categoryController.toggleCategoryStatus)

//Order Routes
admin_route.get('/view-orders', auth.isLogin, orderController.showOrders)
admin_route.get('/view-order-details', auth.isLogin, orderController.orderDetailLoad);
admin_route.post('/cancel-order', auth.isLogin, orderController.cancelOrder);
admin_route.post('/update-order-status', auth.isLogin, orderController.updateOrderStatus);
admin_route.post('/accept-return-request', auth.isLogin, orderController.acceptReturnRequest);
admin_route.post('/reject-return-request', auth.isLogin, orderController.rejectReturnRequest);
admin_route.post('/update-return-status', auth.isLogin, orderController.updateReturnStatus);
admin_route.post('/update-return-progress', auth.isLogin, orderController.updateReturnProgress);

//Offer Routes
admin_route.get('/offers', auth.isLogin, offerController.getOffers);
admin_route.post('/offers', auth.isLogin, offerValidator, offerController.createOffer);
admin_route.post('/offers/update', auth.isLogin, offerValidator, offerController.updateOffer);
admin_route.post('/offers/delete', auth.isLogin, offerController.deleteOffer);
admin_route.post('/offers/apply/:offerId', auth.isLogin, offerController.applyOffer);


//Coupon Routes
admin_route.get('/coupons', auth.isLogin, couponController.getAllCoupons)
admin_route.post('/coupons', auth.isLogin, couponValidator.couponValidator, couponController.createCoupon)
admin_route.delete('/coupons/:id', auth.isLogin, couponController.deleteCoupon)

//Report Routes
admin_route.get('/sales-report', auth.isLogin, reportController.generateSalesReport);
admin_route.get('/sales-report/excel', auth.isLogin, reportController.generateExcelReport);
admin_route.get('/sales-report/pdf', auth.isLogin, reportController.generatePDFReport);


//Dashboard Routes
admin_route.get('/chart-data', auth.isLogin, dashboardController.getChartData);
admin_route.get('/top-products', auth.isLogin, dashboardController.getTopProducts);
admin_route.get('/top-categories', auth.isLogin, dashboardController.getTopCategories);
admin_route.get('/dashboard-stats', auth.isLogin, dashboardController.getDashboardStats);

admin_route.get('*', function (req, res) {
  res.redirect('/admin')
})

module.exports = admin_route;

