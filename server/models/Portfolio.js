const mongoose = require('mongoose');

/**
 * Portfolio Model
 * Represents an investment portfolio for a user
 */
const PortfolioSchema = new mongoose.Schema({
  // Tenant ID (isolamento multi-tenant) - CRÍTICO
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Nome CRIPTOGRAFADO
  nameEncrypted: {
    type: String,
    required: true
  },
  // Descrição CRIPTOGRAFADA
  descriptionEncrypted: {
    type: String,
    default: null
  },
  assets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  }],
  totalInvested: {
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
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
PortfolioSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Portfolio', PortfolioSchema);
