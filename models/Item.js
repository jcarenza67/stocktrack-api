const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
    type:     String,
    required: [true, 'Item name is required.'],
    trim:     true,
  },
  quantity: {
    type:     Number,
    required: [true, 'Quantity is required.'],
    min:      [0, 'Quantity cannot be negative.'],
    default:  0,
  },
  category: {
    type:    String,
    trim:    true,
    default: 'Uncategorized',
  },
  threshold: {
    type:    Number,
    min:     [0, 'Threshold cannot be negative.'],
    default: 5,
  },
  notes: {
    type:    String,
    trim:    true,
    default: '',
  },
  createdAt: {
    type:    Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Item', itemSchema);