const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userUid: { type: String },
  rating: { type: Number, min: 1, max: 5, required: true },
  title: { type: String, default: '' },
  comment: { type: String, default: '' },
  images: { type: [String], default: [] },
  purchased: { type: Boolean, default: false }, // Verified purchase flag
  helpfulVotes: { type: Number, default: 0 },
  helpfulVoters: { type: [String], default: [] }, // store userUid to prevent multiple votes
  reported: { type: Boolean, default: false },
  reportReasons: { type: [String], default: [] },
  moderationStatus: { type: String, enum: ['visible','hidden','pending'], default: 'visible' },
}, { timestamps: true });

feedbackSchema.index({ productId: 1, userId: 1 }, { unique: true }); // one feedback per user per product
feedbackSchema.index({ vendorId: 1, rating: 1 });
feedbackSchema.index({ productId: 1, rating: 1 });

// Static method to build distribution
feedbackSchema.statics.buildDistribution = async function(productId) {
  const pipeline = [
    { $match: { productId: new mongoose.Types.ObjectId(productId), moderationStatus: 'visible' } },
    { $group: { _id: '$rating', count: { $sum: 1 } } }
  ];
  const rows = await this.aggregate(pipeline);
  const dist = { 1:0,2:0,3:0,4:0,5:0 };
  let total = 0; let sum = 0;
  rows.forEach(r => { dist[r._id] = r.count; total += r.count; sum += r._id * r.count; });
  return { distribution: dist, total, average: total ? +(sum/total).toFixed(2) : 0 };
};

module.exports = mongoose.model('Feedback', feedbackSchema);
