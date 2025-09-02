const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  type: { type: String, enum: ['user','vendor','device','ip'], required: true },
  value: { type: String, required: true },
  notes: { type: String },
  addedBy: { type: String }, // admin uid or system id
  addedAt: { type: Date, default: Date.now }
}, { timestamps: true });

watchlistSchema.index({ type:1, value:1 }, { unique: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
