const mongoose = require('mongoose');

/**
 * AuditLog Model
 *
 * Registra todas as ações sensíveis para rastreabilidade e conformidade
 * Imutável: logs nunca são modificados ou deletados (append-only)
 */
const auditLogSchema = new mongoose.Schema({
  // Usuário que executou a ação
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },

  // Tipo de ação executada
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGIN_FAILURE',
      'LOGOUT',
      'REGISTER',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      '2FA_ENABLED',
      '2FA_DISABLED',
      '2FA_VERIFIED',
      'CREATE',
      'READ',
      'UPDATE',
      'DELETE',
      'EXPORT',
      'IMPORT',
      'ACCESS_DENIED',
      'TOKEN_REFRESH',
      'SESSION_EXPIRED'
    ],
    index: true
  },

  // Recurso afetado
  resource: {
    type: String,
    required: true,
    enum: [
      'auth',
      'user',
      'transaction',
      'budget',
      'goal',
      'category',
      'asset',
      'portfolio',
      'investment'
    ],
    index: true
  },

  // ID do recurso afetado (se aplicável)
  resourceId: {
    type: String,
    default: null,
    index: true
  },

  // Status da ação
  status: {
    type: String,
    required: true,
    enum: ['success', 'failure', 'pending'],
    default: 'success',
    index: true
  },

  // Mensagem descritiva
  message: {
    type: String,
    default: ''
  },

  // Metadados adicionais
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Timestamp da ação
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  // Opções do schema
  timestamps: false, // Usamos nosso próprio timestamp
  collection: 'audit_logs'
});

// Índices compostos para queries comuns
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, status: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 }); // Para limpeza de logs antigos

// Prevenir modificação de logs
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Audit logs are immutable'));
  }
  next();
});

// Prevenir atualização de logs
auditLogSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('Audit logs cannot be updated'));
});

// Prevenir deleção individual (apenas deleção em massa por TTL é permitida)
auditLogSchema.pre('remove', function (next) {
  next(new Error('Audit logs cannot be deleted individually'));
});

// TTL Index: deletar logs automaticamente após 2 anos (conformidade LGPD)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 anos

// Método para sanitizar dados sensíveis antes de salvar
auditLogSchema.methods.sanitizeMetadata = function () {
  if (this.metadata) {
    // Remover dados sensíveis que não devem ser logados
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    sensitiveFields.forEach(field => {
      if (this.metadata[field]) {
        this.metadata[field] = '[REDACTED]';
      }
    });
  }
};

// Executar sanitização antes de salvar
auditLogSchema.pre('save', function (next) {
  this.sanitizeMetadata();
  next();
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
