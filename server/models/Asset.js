const mongoose = require('mongoose');

/**
 * Asset Model
 * Represents an individual asset in a portfolio
 */
const AssetSchema = new mongoose.Schema({
  // Tenant ID (isolamento multi-tenant) - CRÍTICO
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  portfolio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['stock', 'etf', 'crypto', 'reit', 'fund', 'bond', 'other'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  averagePrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalInvested: {
    type: Number,
    required: true,
    min: 0
  },
  currentPrice: {
    type: Number,
    default: 0
  },
  currentValue: {
    type: Number,
    default: 0
  },
  totalReturn: {
    type: Number,
    default: 0
  },
  totalReturnPercent: {
    type: Number,
    default: 0
  },
  dayChange: {
    type: Number,
    default: 0
  },
  dayChangePercent: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'BRL'
  },
  // Notas CRIPTOGRAFADAS
  notesEncrypted: {
    type: String,
    default: null
  },
  transactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssetTransaction'
  }],
  lastPriceUpdate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
AssetSchema.index({ userId: 1, portfolio: 1, isActive: 1 });
AssetSchema.index({ userId: 1, symbol: 1 });

// Virtual for allocation percentage (calculated at runtime)
AssetSchema.virtual('allocationPercent').get(function() {
  return 0; // Will be calculated by the service based on total portfolio value
});

module.exports = mongoose.model('Asset', AssetSchema);
