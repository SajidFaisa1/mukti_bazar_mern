const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uid: { type: String },

    label: { type: String, default: 'Home' },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String }, // Division name
    district: { type: String }, // District name
    zip: { type: String, required: true },
    country: { type: String, default: 'Bangladesh' },

    role: { type: String, enum: ['client', 'vendor', 'admin'], default: 'client' },

    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Address', addressSchema);
