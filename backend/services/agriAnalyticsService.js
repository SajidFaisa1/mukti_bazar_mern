// Lightweight analytics & forecasting utilities for agricultural products
// Note: Intentionally simple; can be replaced with more advanced ML (Prophet/ARIMA) later.

const AgriPrice = require('../models/AgriPrice');
const Order = require('../models/Order');

// Static region feature map (extend / move to DB later)
const REGION_FEATURES = {
  'Dhaka': { climate:'subtropical', rainfall:'high', soil:'alluvial' },
  'Chittagong': { climate:'tropical', rainfall:'very_high', soil:'sandy' },
  'Rajshahi': { climate:'dry', rainfall:'moderate', soil:'clay' },
  'Khulna': { climate:'coastal', rainfall:'high', soil:'sandy' },
  'Sylhet': { climate:'hilly', rainfall:'very_high', soil:'red' }
};

// Product agronomy meta (placeholder; tune with domain experts)
const PRODUCT_META = {
  'Rice': { climates:['subtropical','tropical'], rainfall:['high','moderate'], soils:['alluvial','clay'], baseCost:30, risk:0.2 },
  'Potato': { climates:['subtropical'], rainfall:['moderate'], soils:['clay'], baseCost:12, risk:0.3 },
  'Onion': { climates:['subtropical','dry'], rainfall:['moderate','low'], soils:['clay'], baseCost:15, risk:0.4 },
  'Tomato': { climates:['subtropical'], rainfall:['moderate'], soils:['sandy','alluvial'], baseCost:20, risk:0.35 },
  'Wheat': { climates:['dry','subtropical'], rainfall:['moderate','low'], soils:['clay','alluvial'], baseCost:18, risk:0.25 },
  'Tea': { climates:['hilly','tropical'], rainfall:['very_high','high'], soils:['red','sandy'], baseCost:45, risk:0.3 }
};

// Fetch or synthesize last N months of prices
async function getHistoricalPrices(product, region, months = 12) {
  const since = new Date();
  since.setMonth(since.getMonth() - months + 1);
  const docs = await AgriPrice.find({ product, region, date: { $gte: since } }).sort({ date:1 }).lean();
  if (docs.length >= Math.min(4, months/2)) return docs; // enough data
  // Synthesize simple series if insufficient real data
  let base = 50; if (PRODUCT_META[product]) base = PRODUCT_META[product].baseCost * (1.4 + Math.random()*0.6);
  const synthetic = [];
  for (let i=months-1;i>=0;i--) {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); d.setMonth(d.getMonth()-i);
    const seasonFactor = (d.getMonth() < 6 ? 1.05 : 0.95);
    const noise = (Math.random() - 0.5) * 4;
    synthetic.push({ product, region, date:d, price: Math.round(base * seasonFactor + noise) , synthetic:true });
  }
  return synthetic;
}

// Simple linear regression forecast with residual-based CI
function forecast(prices, horizon = 3) {
  const y = prices.map(p => p.price);
  const n = y.length;
  if (n < 2) return { forecast: [], slope:0, intercept: y[0]||0, residualStd:0 };
  const x = [...Array(n).keys()];
  const sumX = x.reduce((a,b)=>a+b,0);
  const sumY = y.reduce((a,b)=>a+b,0);
  const sumXY = x.reduce((a,b,i)=> a + b*y[i], 0);
  const sumX2 = x.reduce((a,b)=> a + b*b, 0);
  const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX || 1);
  const intercept = (sumY - slope*sumX)/n;
  const preds = x.map(i => intercept + slope*i);
  const residuals = y.map((v,i)=> v - preds[i]);
  const residualStd = Math.sqrt(residuals.reduce((a,b)=>a+b*b,0)/(n||1));
  const lastIndex = n-1;
  const forecast = [];
  for (let h=1; h<=horizon; h++) {
    const idx = lastIndex + h;
    const point = intercept + slope*idx;
    // naive widening of CI
    const ciDelta = residualStd * Math.sqrt(1 + h/2);
    forecast.push({ step:h, price: Math.round(point), ciLow: Math.max(0, Math.round(point - ciDelta)), ciHigh: Math.round(point + ciDelta) });
  }
  return { forecast, slope, intercept, residualStd };
}

function computeVolatility(prices) {
  if (prices.length < 2) return 0;
  const returns = [];
  for (let i=1;i<prices.length;i++) returns.push((prices[i].price - prices[i-1].price)/Math.max(1, prices[i-1].price));
  const mean = returns.reduce((a,b)=>a+b,0)/returns.length;
  const variance = returns.reduce((a,b)=> a + (b-mean)**2, 0)/returns.length;
  return Math.sqrt(variance);
}

async function regionRecommendations(region, season='') {
  const feats = REGION_FEATURES[region];
  if (!feats) return [];
  const results = [];
  for (const product of Object.keys(PRODUCT_META)) {
    const meta = PRODUCT_META[product];
    // suitability
    const climateMatch = meta.climates.includes(feats.climate);
    const soilMatch = meta.soils.includes(feats.soil);
    const rainfallMatch = meta.rainfall?.includes(feats.rainfall) || false;
    // price momentum & volatility
    const hist = await getHistoricalPrices(product, region, 8);
    const f = forecast(hist, 1);
    const momentum = f.slope; // raw slope
    const vol = computeVolatility(hist);
    const avgPrice = hist.reduce((a,b)=>a+b.price,0)/(hist.length||1);
    // demand proxy from orders (frequency for product name in items if exists)
    let demand = 0; try {
      demand = await Order.countDocuments({ 'items.name': new RegExp(product,'i'), orderedAt: { $gte: new Date(Date.now()-90*86400000) } });
    } catch(_) {}
    // scoring (weights sum to 1)
    const suitability = (climateMatch + soilMatch + rainfallMatch)/3; // 0..1
    const normMomentum = 0.5 + Math.atan(momentum/5)/Math.PI; // squash
    const normVol = 1 - Math.min(1, vol*8); // lower vol better
    const profitPotential = Math.min(1, Math.max(0, (avgPrice - meta.baseCost)/(meta.baseCost*1.5)));
    const demandScore = Math.min(1, demand / 50); // cap
    const riskAdj = 1 - meta.risk; // higher better
    const score = (
      0.30 * suitability +
      0.15 * normMomentum +
      0.10 * normVol +
      0.20 * profitPotential +
      0.15 * demandScore +
      0.10 * riskAdj
    );
    results.push({
      product,
      region,
      score: Math.round(score*100),
      factors: {
        suitability: +suitability.toFixed(2),
        momentum: +normMomentum.toFixed(2),
        volatility: +vol.toFixed(3),
        profitPotential: +profitPotential.toFixed(2),
        demand: demandScore,
        riskAdj
      },
      matches: { climateMatch, soilMatch, rainfallMatch },
      forecast: f.forecast[0] || null
    });
  }
  results.sort((a,b)=> b.score - a.score);
  return results;
}

module.exports = { getHistoricalPrices, forecast, regionRecommendations };
