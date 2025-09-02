const mongoose = require('mongoose');

const CarouselSlideSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  title: { type: String, default: '' },
  tagline: { type: String, default: '' },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

// Auto-assign incremental order if not explicitly set
CarouselSlideSchema.pre('save', async function(next) {
  if (this.isNew && (this.order === 0 || this.order === undefined)) {
    const count = await this.constructor.countDocuments();
    this.order = count; // zero-based ordering
  }
  next();
});

module.exports = mongoose.model('CarouselSlide', CarouselSlideSchema);
