const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModels');
const User = require('../../models/userModel');

// Get chart data
const getChartData = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;
    
    let start, end;

    switch (filter) {
      case 'yearly':
        start = new Date(new Date().getFullYear(), 0, 1); // January 1st of the current year
        end = new Date(new Date().getFullYear() + 1, 0, 1); // January 1st of the next year
        break;
      case 'monthly':
        start = new Date(new Date().getFullYear(), new Date().getMonth(), 1); // 1st day of the current month
        end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1); // 1st day of the next month
        break;
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // Include the entire end date
        } else {
          // Fallback to yearly if custom dates are not provided
          start = new Date(new Date().getFullYear(), 0, 1);
          end = new Date(new Date().getFullYear() + 1, 0, 1);
        }
        break;
      default:
        // Default to yearly if filter is not specified
        start = new Date(new Date().getFullYear(), 0, 1);
        end = new Date(new Date().getFullYear() + 1, 0, 1);
        break;
    }

    const orders = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, totalAmount: { $sum: "$totalAmount" } } },
      { $sort: { _id: 1 } }
    ]);

    res.json(orders);
  } catch (error) {
    console.error('Error fetching chart data:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get top 10 best-selling products
const getTopProducts = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    let start, end;

    switch (filter) {
      case 'yearly':
        start = new Date(new Date().getFullYear(), 0, 1);
        end = new Date(new Date().getFullYear() + 1, 0, 1);
        break;
      case 'monthly':
        start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
        break;
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        } else {
          // Fallback to yearly if custom dates are not provided
          start = new Date(new Date().getFullYear(), 0, 1);
          end = new Date(new Date().getFullYear() + 1, 0, 1);
        }
        break;
      default:
        // Default to yearly if filter is not specified
        start = new Date(new Date().getFullYear(), 0, 1);
        end = new Date(new Date().getFullYear() + 1, 0, 1);
        break;
    }

    const topProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", totalQuantity: { $sum: "$items.quantity" } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: "$product" },
      { $project: { _id: 0, product: "$product", totalQuantity: 1 } }
    ]);

    res.json(topProducts);
  } catch (error) {
    console.error('Error fetching top products:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get top 10 best-selling categories
const getTopCategories = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    let start, end;

    switch (filter) {
      case 'yearly':
        start = new Date(new Date().getFullYear(), 0, 1);
        end = new Date(new Date().getFullYear() + 1, 0, 1);
        break;
      case 'monthly':
        start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
        break;
      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        } else {
          // Fallback to yearly if custom dates are not provided
          start = new Date(new Date().getFullYear(), 0, 1);
          end = new Date(new Date().getFullYear() + 1, 0, 1);
        }
        break;
      default:
        // Default to yearly if filter is not specified
        start = new Date(new Date().getFullYear(), 0, 1);
        end = new Date(new Date().getFullYear() + 1, 0, 1);
        break;
    }

    const topCategories = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $unwind: "$items" },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: "$product" },
      { $unwind: "$product.category" },
      { $unwind: "$product.category" },
      { $group: { _id: "$product.category", totalQuantity: { $sum: "$items.quantity" } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]);

    res.json(topCategories);
  } catch (error) {
    console.error('Error fetching top categories:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Get total users and total products
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();  // Get total number of users
    const totalProducts = await Product.countDocuments();  // Get total number of products
    
    res.json({ totalUsers, totalProducts });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


module.exports = {
  getChartData,
  getTopProducts,
  getTopCategories,
  getDashboardStats
};
