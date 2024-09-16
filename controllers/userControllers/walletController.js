
const User = require('../../models/userModel');
const Cart = require('../../models/cartModel');
const Wishlist = require('../../models/wishlistModel');

//get wallet page
const getWallet = async (req, res) => {
  let cartCount = 0;
  let wishlistCount = 0;
  let totalPrice = 0;
  let items = [];
  try {

    if (!req.session.user_id) {
      return res.status(401).render('login', { message: 'Please log in to view your wallet' });
    }
    const user = await User.findById(req.session.user_id);
    if (user) {
      const cart = await Cart.findOne({ user: user._id }).populate('items.product');
      if (cart) {
        items = cart.items;
        cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
        totalPrice = items.reduce((sum, item) => sum + item.quantity * item.product.discountprice, 0);
      }
      const wishlist = await Wishlist.findOne({ user: user._id }).populate('items.product');
      if (wishlist) {
        items = wishlist.items;
        wishlistCount = items.reduce((sum, item) => sum + item.quantity, 0);
      }
    }




    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Pagination logic
    const page = parseInt(req.query.page) || 1; // Get the page number from query params, default to 1
    const limit = 10; // Number of transactions per page
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Sort transactions by date in descending order
    const transactions = user.walletTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Paginate transactions
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    // Calculate total pages
    const totalPages = Math.ceil(transactions.length / limit);

    res.render('wallet', {
      user,
      walletBalance: parseFloat(user.walletBalance).toFixed(2), // Ensure walletBalance is a number
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages: totalPages,


      cartCount,
      wishlistCount,
    });
  } catch (error) {
    console.error('Error fetching wallet:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  getWallet
};
