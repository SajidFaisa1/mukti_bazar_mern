const mongoose = require('mongoose');
const userSchema = new mongoose.Schema(
  {
    uid: { type: String },
    name: { type: String},
    email: { type: String,unique: true },
    password: { type: String},
    phone: { type: String},
    role: { type: String, default: 'client' },
    emailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
module.exports = mongoose.model('User', userSchema);
