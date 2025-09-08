// Test the updated dual criteria bulk detection
const { scoreOrderContext } = require('./backend/services/riskScoringService');

console.log('Testing Updated Dual Criteria Bulk Detection\n');

// Test case 1: High absolute quantity (200+ items = 40% of baseline 500)
const highAbsoluteOrder = {
  total: 15000,
  quantityTotal: 200, // 40% of baseline (500) = triggers BULK_QTY_HEAVY
  items: [
    { quantity: 100, minOrderQty: 1 }, // 100x minimum
    { quantity: 100, minOrderQty: 1 }  // 100x minimum
  ]
};

// Test case 2: Moderate absolute quantity (100+ items = 20% of baseline 500)
const moderateAbsoluteOrder = {
  total: 8000,
  quantityTotal: 100, // 20% of baseline (500) = triggers BULK_QTY
  items: [
    { quantity: 50, minOrderQty: 1 }, // 50x minimum
    { quantity: 50, minOrderQty: 1 }  // 50x minimum
  ]
};

// Test case 3: High percentage but low absolute (20x minimum but only 60 items)
const highPercentageOrder = {
  total: 5000,
  quantityTotal: 60, // 12% of baseline, but 20x minimum
  items: [
    { quantity: 30, minOrderQty: 1 }, // 30x minimum
    { quantity: 30, minOrderQty: 1 }  // 30x minimum (total 60/3 = 2000%)
  ]
};

function runTest(testName, orderData) {
  console.log(`--- ${testName} ---`);
  
  const result = scoreOrderContext({
    total: orderData.total,
    subtotal: orderData.total,
    itemCount: orderData.items.length,
    quantityTotal: orderData.quantityTotal,
    userOrderCount24h: 0,
    deviceReuse: null,
    ipReuseUsers: 0,
    flags: [],
    items: orderData.items
  });

  const totalMinOrderQty = orderData.items.reduce((total, item) => total + item.minOrderQty, 0);
  const qtyPercentage = (orderData.quantityTotal / totalMinOrderQty) * 100;
  const baselinePercentage = (orderData.quantityTotal / 500) * 100;
  
  console.log(`Total Quantity: ${orderData.quantityTotal}`);
  console.log(`Percentage of minimum orders: ${qtyPercentage.toFixed(0)}%`);
  console.log(`Percentage of baseline (500): ${baselinePercentage.toFixed(1)}%`);
  console.log(`Risk Score: ${result.score}`);
  console.log(`Bulk Reasons: ${result.reasons.filter(r => r.includes('BULK')).join(', ') || 'None'}`);
  console.log('');
}

runTest('High Absolute Quantity (200 items)', highAbsoluteOrder);
runTest('Moderate Absolute Quantity (100 items)', moderateAbsoluteOrder);
runTest('High Percentage, Low Absolute (60 items, 20x min)', highPercentageOrder);
