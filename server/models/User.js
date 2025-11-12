const mongoose = require('mongoose');

/**
 * User Model (Secure Version)
 *
 * IMPORTANTE: Este modelo NÃO armazena dados identificáveis (PII)
 * Email e nome estão no UserIdentity para proteção adicional
 *
 * userId = Tenant ID para isolamento multi-tenant
 */
const UserSchema = new mongoose.Schema({
  // Email hash para busca rápida (não identificável)
  emailHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Password hash (bcrypt - mantido como está)
  password: {
    type: String,
    required: true,
  },

  // Tenant ID (cada usuário é seu próprio tenant)
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: function() { return this._id; },
    index: true
  },

  // 2FA fields
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  twoFactorSecret: {
    type: String,
    default: null,
  },
  backupCodes: [{
    code: String,
    used: {
      type: Boolean,
      default: false
    }
  }],

  // Account security
  lastLogin: {
    type: Date,
    default: null,
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  accountLockedUntil: {
    type: Date,
    default: null,
  },

  // Preferências de privacidade
  privacySettings: {
    dataRetentionDays: {
      type: Number,
      default: 365 // 1 ano
    },
    allowAnalytics: {
      type: Boolean,
      default: false
    }
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

// Índices para performance
UserSchema.index({ emailHash: 1 });
UserSchema.index({ tenantId: 1 });

// Middleware: atualizar updatedAt
UserSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (this.isNew && !this.tenantId) {
    this.tenantId = this._id;
  }
  next();
});

// IMPORTANTE: Nunca expor senha ou 2FA secret
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.backupCodes;
  delete obj.emailHash;
  return obj;
};

module.exports = mongoose.model('user', UserSchema);
