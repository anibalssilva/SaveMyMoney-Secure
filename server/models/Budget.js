const mongoose = require('mongoose');

/**
 * Budget Model (Secure Version)
 *
 * Segurança implementada:
 * - Tenant isolation: userId para isolamento
 * - Valores mantidos em claro para cálculos
 */
const BudgetSchema = new mongoose.Schema({
  // Tenant ID (isolamento multi-tenant) - CRÍTICO
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Categoria
  category: {
    type: String,
    required: true,
    index: true
  },

  // Limite orçamentário (mantido em claro para cálculos)
  limit: {
    type: Number,
    required: true,
  },

  // Limite de alerta (%)
  warningThreshold: {
    type: Number,
    default: 80, // 80% do limite
  },

  // Alertas habilitados
  alertEnabled: {
    type: Boolean,
    default: true,
  },

  // Período do orçamento
  period: {
    type: String,
    enum: ['monthly', 'weekly', 'yearly'],
    default: 'monthly',
    index: true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Índice único: um orçamento por categoria por usuário
BudgetSchema.index({ userId: 1, category: 1 }, { unique: true });

// Índices para performance
BudgetSchema.index({ userId: 1, period: 1 });

// Middleware: atualizar updatedAt
BudgetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// IMPORTANTE: Sempre validar userId em queries
// Exemplo: Budget.find({ userId: req.user.id })

module.exports = mongoose.model('Budget', BudgetSchema);
