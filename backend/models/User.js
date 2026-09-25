const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
    },
    defaultCurrency: {
      type: String,
      default: 'Rs',
    },
    defaultFuelAverage: {
      type: Number,
      default: 14,
    },
  },
  {
    timestamps: true,
  }
);

// Fallback safety if model is compiled multiple times
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
