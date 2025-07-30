const SSLCommerzPayment = require('sslcommerz-lts');

// SSLCommerz Configuration
const sslcommerzConfig = {
  store_id: process.env.SSLCZ_STORE_ID || 'testbox',
  store_passwd: process.env.SSLCZ_STORE_PASSWORD || 'qwerty',
  is_live: process.env.SSLCZ_IS_LIVE === 'true' || false, // true for live, false for sandbox
};

// Initialize SSLCommerz
const sslcz = new SSLCommerzPayment(
  sslcommerzConfig.store_id,
  sslcommerzConfig.store_passwd,
  sslcommerzConfig.is_live
);

module.exports = {
  sslcz,
  sslcommerzConfig
};
