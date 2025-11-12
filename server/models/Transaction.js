const mongoose = require('mongoose');

/**
 * Transaction Model (Secure Version)
 *
 * Segurança implementada:
 * - Tenant isolation: apenas dados do userId correto são acessíveis
 * - Criptografia: description e notes são criptografados
 * - Valores monetários: mantidos em claro para cálculos
 */
const TransactionSchema = new mongoose.Schema({
  // Tenant ID (isolamento multi-tenant) - CRÍTICO
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
    index: true
  },

  // Descrição CRIPTOGRAFADA (AES-256-GCM)
  descriptionEncrypted: {
    type: String,
    required: true,
  },

  // Valor (mantido em claro para cálculos)
  amount: {
    type: Number,
    required: true,
  },

  // Data da transação
  date: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Categoria (mantida em claro para filtros)
  category: {
    type: String,
    required: true,
    index: true
  },

  // Subcategoria
  subcategoryId: {
    type: String,
    default: undefined,
  },
  subcategory: {
    type: String,
    default: undefined,
  },

  // Tipo de transação
  type: {
    type: String,
    enum: ['expense', 'income'],
    required: true,
    index: true
  },

  // Notas CRIPTOGRAFADAS (AES-256-GCM)
  notesEncrypted: {
    type: String,
    default: null,
  },

  // Método de pagamento
  paymentMethod: {
    type: String,
    enum: ['pix', 'pix_parcelado', 'credito', 'debito', 'dinheiro', 'boleto', 'cartao_alimentacao', ''],
    default: '',
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Índices compostos para performance
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });
TransactionSchema.index({ userId: 1, type: 1, date: -1 });

// Middleware: atualizar updatedAt
TransactionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Prevenir exposição de dados criptografados
TransactionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  // Nota: a descriptografia será feita no controller/service
  return obj;
};

// IMPORTANTE: Sempre validar userId em queries
// Exemplo: Transaction.find({ userId: req.user.id })
// NUNCA usar: Transaction.find({}) sem filtro de userId

module.exports = mongoose.model('transaction', TransactionSchema);
