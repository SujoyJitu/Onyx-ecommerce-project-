const Order = require('../models/Order');
const { randomUUID } = require('node:crypto');
const { sendOrderEmail } = require('./email');

function credentials() {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
  if (!storeId || !storePassword) throw Object.assign(new Error('Online payment is not configured.'), { statusCode: 503 });
  const base = process.env.SSLCOMMERZ_LIVE === 'true' ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com';
  return { storeId, storePassword, base };
}

async function startPayment(order, customer) {
  const { storeId, storePassword, base } = credentials();
  if (order.paymentMethod !== 'sslcommerz' || order.paymentStatus !== 'pending' || order.orderStatus === 'cancelled') {
    throw Object.assign(new Error('This order is not eligible for payment.'), { statusCode: 409 });
  }
  if (order.gatewayTransactionId) throw Object.assign(new Error('A payment session already exists for this order.'), { statusCode: 409 });
  const origin = process.env.API_URL;
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (!origin) throw Object.assign(new Error('Set API_URL to the public backend URL before enabling online payment.'), { statusCode: 503 });
  const tranId = `ONYX${randomUUID().replaceAll('-', '')}`.slice(0, 30);
  const body = new URLSearchParams({
    store_id: storeId, store_passwd: storePassword,
    total_amount: Number(order.total).toFixed(2), currency: process.env.PAYMENT_CURRENCY || 'USD',
    tran_id: tranId, success_url: `${origin}/api/payments/sslcommerz/success`,
    fail_url: `${origin}/api/payments/sslcommerz/fail`, cancel_url: `${origin}/api/payments/sslcommerz/cancel`,
    ipn_url: `${origin}/api/payments/sslcommerz/ipn`, shipping_method: 'YES', product_name: `ONYX order ${order._id}`,
    product_category: 'Marketplace goods', product_profile: 'general', cus_name: customer.name,
    cus_email: customer.email, cus_add1: order.address.street, cus_city: order.address.city,
    cus_postcode: order.address.postalCode, cus_country: order.address.country, cus_phone: order.address.phone,
    ship_name: order.address.recipientName, ship_add1: order.address.street, ship_city: order.address.city,
    ship_postcode: order.address.postalCode, ship_country: order.address.country,
  });
  const response = await fetch(`${base}/gwprocess/v4/api.php`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const result = await response.json();
  if (!response.ok || result.status !== 'SUCCESS' || !result.GatewayPageURL) throw Object.assign(new Error(result.failedreason || 'The payment provider could not create a checkout session.'), { statusCode: 502 });
  const updated = await Order.findOneAndUpdate({ _id: order._id, paymentStatus: 'pending', gatewayTransactionId: null }, { $set: { gatewayTransactionId: tranId } }, { new: true });
  if (!updated) throw Object.assign(new Error('Payment session could not be attached to this order.'), { statusCode: 409 });
  return result.GatewayPageURL;
}

async function verifyPayment(payload) {
  const tranId = payload?.tran_id;
  const valId = payload?.val_id;
  if (!tranId || !valId) return null;
  const order = await Order.findOne({ gatewayTransactionId: tranId, paymentMethod: 'sslcommerz' }).populate('customer', 'name email');
  if (!order) return null;
  const { storeId, storePassword, base } = credentials();
  const params = new URLSearchParams({ val_id: valId, store_id: storeId, store_passwd: storePassword, format: 'json' });
  const validationResponse = await fetch(`${base}/validator/api/validationserverAPI.php?${params}`);
  if (!validationResponse.ok) throw new Error('Payment validation service is unavailable.');
  const validation = await validationResponse.json();
  if (!['VALID', 'VALIDATED'].includes(validation.status) || validation.tran_id !== tranId) return null;
  const expectedAmount = Number(order.total).toFixed(2);
  const paidAmount = Number(validation.currency_amount ?? validation.amount).toFixed(2);
  if (paidAmount !== expectedAmount || validation.currency_type !== (process.env.PAYMENT_CURRENCY || 'USD')) return null;
  if (order.paymentStatus !== 'paid') {
    const paid = await Order.findOneAndUpdate({ _id: order._id, paymentStatus: 'pending' }, { $set: { paymentStatus: 'paid', paidAt: new Date(), gatewayBankTransactionId: validation.bank_tran_id || '' } }, { new: true });
    if (paid && order.customer?.email) {
      await sendOrderEmail({ to: order.customer.email, subject: `Order confirmed: ${order._id}`, text: `Hello ${order.customer.name},\n\nYour payment was confirmed and order ${order._id} is now being prepared. Total: ${order.total} ${process.env.PAYMENT_CURRENCY || 'USD'}.` }).catch((error) => console.error('Order confirmation email failed:', error.message));
    }
  }
  return order;
}

module.exports = { startPayment, verifyPayment };
