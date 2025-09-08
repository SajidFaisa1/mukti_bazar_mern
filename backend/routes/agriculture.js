const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getHistoricalPrices, forecast, regionRecommendations } = require('../services/agriAnalyticsService');

// GET /api/agriculture/forecast?product=Rice&region=Dhaka&months=12
router.get('/forecast', async (req,res) => {
  try {
    const { product='Rice', region='Dhaka', months=12, horizon=3 } = req.query;
    const hist = await getHistoricalPrices(product, region, Math.min(36, Number(months)||12));
    const f = forecast(hist, Math.min(6, Number(horizon)||3));
    res.json({ success:true, product, region, historical: hist.map(h=>({ date:h.date, price:h.price })), forecast: f.forecast, slope:f.slope, residualStd:f.residualStd });
  } catch(e) { console.error('forecast error', e); res.status(500).json({ error:'Failed to build forecast' }); }
});

// GET /api/agriculture/recommendations?region=Dhaka&season=Rabi
router.get('/recommendations', async (req,res) => {
  try {
    const { region='Dhaka', season='' } = req.query;
    const recs = await regionRecommendations(region, season);
    res.json({ success:true, region, recommendations: recs });
  } catch(e) { console.error('recs error', e); res.status(500).json({ error:'Failed to compute recommendations' }); }
});

module.exports = router;
