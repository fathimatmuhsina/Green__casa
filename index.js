const express = require('express');
const app = express();
const connectDB = require('./db');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const path = require('path');
require('dotenv').config();
require('./passport');
const flash = require('connect-flash');

// Connect to the database
connectDB();

// Initialize session middleware
app.use(session({
  secret: process.env.sessionSecret || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Initialize flash middleware
app.use(flash());

// Pass flash messages to the response
app.use((req, res, next) => {
  res.locals.successMessages = req.flash('success');
  res.locals.errorMessages = req.flash('error');
  next();
});

// Set up body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Set up passport
app.use(passport.initialize());
app.use(passport.session());

// Set up view engine and views directories
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set up static files directory
app.use(express.static(path.join(__dirname, 'public')));

// Set cache headers
app.use((req, res, next) => {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
});

// User routes
const userRoute = require('./routes/userRoute');
app.use('/', userRoute);

// Admin routes
const adminRoute = require('./routes/adminRoute');
app.use('/admin', adminRoute);

app.listen(3002, () => {
  console.log("Server is running on port 3002");
});

// Login route for rendering login page with flash messages
app.get('/login', (req, res) => {
  res.render('login', { message: req.flash('error') });
});
