const mongoose = require('mongoose');

const agriPriceSchema = new mongoose.Schema({
  product: { type: String, index: true },
  region: { type: String, index: true },
  date: { type: Date, index: true },
  price: { type: Number, required: true },
  source: { type: String }, // e.g. 'order-derived','manual','external'
  meta: { type: Object }
}, { timestamps: true });

agriPriceSchema.index({ product:1, region:1, date:1 }, { unique: true });

module.exports = mongoose.model('AgriPrice', agriPriceSchema);
