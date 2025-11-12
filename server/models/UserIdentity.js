const mongoose = require('mongoose');

/**
 * UserIdentity Model
 *
 * Separa dados identificáveis (PII) do modelo User principal
 * Criptografa email e nome para proteção máxima
 */
const userIdentitySchema = new mongoose.Schema({
  // Referência ao User (userId é o tenant ID)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Email criptografado (AES-256-GCM)
  emailEncrypted: {
    type: String,
    required: true
  },

  // Hash do email para busca rápida (SHA-256)
  emailHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Nome criptografado (opcional)
  nameEncrypted: {
    type: String,
    default: null
  },

  // Email mascarado para exibição (ex: a***@example.com)
  emailMasked: {
    type: String,
    required: true
  },

  // Metadados de segurança
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índices para performance
userIdentitySchema.index({ emailHash: 1 });
userIdentitySchema.index({ userId: 1 });

// Middleware: atualizar updatedAt
userIdentitySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// IMPORTANTE: Nunca expor dados criptografados diretamente
userIdentitySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.emailEncrypted;
  delete obj.nameEncrypted;
  delete obj.emailHash;
  return obj;
};

module.exports = mongoose.model('UserIdentity', userIdentitySchema);
