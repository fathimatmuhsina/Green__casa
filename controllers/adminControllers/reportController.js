const Order = require('../../models/orderModel');
const { chromium } = require('playwright');

const ExcelJS = require('exceljs');



const formatDate = (dateString) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} (${dayOfWeek})`;
};

const generateSalesReport = async (req, res) => {
  try {
    // Retrieve filter type, date range, pagination options from query parameters
    const { filterType, startDate, endDate, format, page = 1, limit = 10 } = req.query;
    let filter = {};

    // Apply date filters based on the selected filter type
    const today = new Date();
    let start, end;

    switch (filterType) {
      case 'today':
        start = new Date(today.setHours(0, 0, 0, 0));
        end = new Date(today.setHours(23, 59, 59, 999));
        filter.createdAt = { $gte: start, $lte: end };
        break;

      case 'yesterday':
        start = new Date(today.setDate(today.getDate() - 1));
        start.setHours(0, 0, 0, 0);
        end = new Date(today.setHours(23, 59, 59, 999));
        filter.createdAt = { $gte: start, $lte: end };
        break;

      case 'last7days':
        start = new Date(today.setDate(today.getDate() - 7));
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        filter.createdAt = { $gte: start, $lte: end };
        break;

      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        filter.createdAt = { $gte: start, $lte: end };
        break;

      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        filter.createdAt = { $gte: start, $lte: end };
        break;

      case 'custom':
        if (startDate && endDate) {
          start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.createdAt = { $gte: start, $lte: end };
        }
        break;

      default:
        break;
    }

    // Fetch all matching orders without pagination to calculate totals
    const allOrders = await Order.find(filter)
      .populate({
        path: 'items.product',
        populate: { path: 'category', select: 'name' },
      })
      .populate('user', 'name');

    // Initialize totals
    let totalOrders = 0;
    let totalSalesAmount = 0;
    let totalDiscount = 0;
    let totalCouponDiscount = 0;
    let cancelledOrders = 0;
    let returnedOrders = 0;
    let deliveredOrders = 0;

    // Calculate totals
    allOrders.forEach(order => {
      totalOrders++;
      totalSalesAmount += order.totalAmount;

      // Count specific types of orders
      if (order.status === 'Cancelled') cancelledOrders++;
      if (order.status === 'Refund') returnedOrders++;
      if (order.status === 'Delivered') deliveredOrders++;

      // Calculate product discounts and coupon discounts
      order.items.forEach(item => {
        const discount = item.product.originalprice - item.product.discountprice;
        totalDiscount += discount * item.quantity;
      });

      if (order.discountAmount) {
        totalCouponDiscount += order.discountAmount;
      }
    });

    // Fetch paginated orders for display
    const ordersQuery = Order.find(filter)
      .populate({
        path: 'items.product',
        populate: { path: 'category', select: 'name' },
      })
      .populate('user', 'name')
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .limit(limit);

    const paginatedOrders = await ordersQuery.exec();
    const totalOrdersCount = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrdersCount / limit);

    if (format === 'pdf') {
      return generatePDFReport(allOrders, res);
    } else if (format === 'excel') {
      return generateExcelReport(allOrders, res);
    }

    // Render the sales report page with filterType, startDate, and endDate variables
    res.render('sales', {
      totalOrders,
      totalSalesAmount,
      totalDiscount,
      cancelledOrders,
      totalCouponDiscount,
      returnedOrders,
      deliveredOrders,
      orders: paginatedOrders,
      currentPage: parseInt(page),
      totalPages,
      filterType,
      startDate,
      endDate,
      formatDate,
    });
  } catch (error) {
    console.error('Error generating sales report:', error);
    res.status(500).send('Internal Server Error');
  }
};

const generatePDFReport = async (orders, res) => {
  try {
    // Launch a new browser instance
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Generate the HTML content for the report
    const htmlContent = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; }
          th { background-color: #f2f2f2; }
          .order-header { background-color: #204f38; color: #fff; padding: 10px; }
          .order-summary { margin-top: 20px; }
          .order-summary td { border: none; }
        </style>
      </head>
      <body>
        <h1>Sales Report</h1>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>User</th>
              <th>Total Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(order => `
              <tr>
                <td>${order._id}</td>
                <td>${formatDate(order.createdAt)}</td>
               <td>${order.user && order.user.name ? order.user.name : 'Unknown'}</td>

                <td>₹${order.totalAmount.toFixed(2)}</td>
                <td>${order.status}</td>
              </tr>
              ${order.items.map(item => `
                <tr>
                  <td colspan="5" class="order-header">Product: ${item.product.name}</td>
                </tr>
                <tr>
                  <td colspan="2">Category: ${item.product.category}</td>
                  <td>Quantity: ${item.quantity}</td>
                  <td>Original Price: ₹${item.product.originalprice.toFixed(2)}</td>
                  <td>Discount: ₹${(item.product.originalprice - item.product.discountprice).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="order-summary">
                <td colspan="3"><strong>Total Amount:</strong> ₹${order.totalAmount.toFixed(2)}</td>
                <td colspan="2"><strong>Coupon Discount:</strong> ₹${order.discountAmount ? order.discountAmount.toFixed(2) : '0.00'}</td>
              </tr>
              <tr><td colspan="5">&nbsp;</td></tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Set the HTML content to the page
    await page.setContent(htmlContent);

    // Set the response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

    // Generate PDF from the page
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    // Send the generated PDF as the response
    res.send(pdfBuffer);

    // Close the browser instance
    await browser.close();
  } catch (error) {
    console.error('Error generating PDF report:', error);
    res.status(500).send('Internal Server Error');
  }
};

const generateExcelReport = async (orders, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Set columns
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Order ID', key: 'orderId', width: 30 },
      { header: 'User', key: 'user', width: 20 },
      { header: 'Product Name', key: 'productName', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Original Price', key: 'originalPrice', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Product Discount', key: 'productDiscount', width: 15 },
      { header: 'Coupon Discount', key: 'couponDiscount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 20 }
    ];

    // Apply header styling
    const headerRow = worksheet.getRow(1);
    headerRow.font = { name: 'Arial', size: 12, bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F81BD' } // Dark blue background color
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Add rows
    orders.forEach(order => {
      order.items.forEach(item => {
        worksheet.addRow({
          date: formatDate(order.createdAt),
          orderId: order._id,
          user: order.user.name||'',
          productName: item.product.name,
          category: item.product.category || '',
          quantity: item.quantity,
          originalPrice: item.product.originalprice.toFixed(2),
          totalAmount: order.totalAmount.toFixed(2),
          productDiscount: (item.product.originalprice - item.product.discountprice).toFixed(2),
          couponDiscount: order.discountAmount ? order.discountAmount.toFixed(2) : '0.00',
          status: order.status,
          paymentMethod: order.paymentMethod
        });
      });
    });

    // Apply number formatting
    worksheet.columns.forEach(column => {
      if (['originalPrice', 'totalAmount', 'productDiscount', 'couponDiscount'].includes(column.key)) {
        column.numFmt = '#,##0.00'; // Format numbers with two decimal places
      }
    });

    // Write the Excel file to response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  generateSalesReport,
  generateExcelReport,
  generatePDFReport
};
