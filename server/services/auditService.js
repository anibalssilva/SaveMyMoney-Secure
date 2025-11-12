const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

/**
 * Serviço de Auditoria
 *
 * Registra todas as ações sensíveis para rastreabilidade e conformidade
 */
class AuditService {
  /**
   * Registra uma ação de auditoria
   * @param {Object} params - Parâmetros da auditoria
   * @param {string} params.userId - ID do usuário que executou a ação
   * @param {string} params.action - Tipo de ação (CREATE, READ, UPDATE, DELETE, LOGIN, etc.)
   * @param {string} params.resource - Recurso afetado (user, transaction, budget, etc.)
   * @param {string} params.resourceId - ID do recurso afetado
   * @param {Object} params.metadata - Dados adicionais (IP, user-agent, changes, etc.)
   * @param {string} params.status - Status da ação (success, failure)
   * @param {string} params.message - Mensagem descritiva
   */
  async log({
    userId,
    action,
    resource,
    resourceId = null,
    metadata = {},
    status = 'success',
    message = ''
  }) {
    try {
      const auditEntry = new AuditLog({
        userId,
        action,
        resource,
        resourceId,
        metadata,
        status,
        message,
        timestamp: new Date()
      });

      await auditEntry.save();

      // Log também no Winston para backup
      logger.info('Audit log created', {
        userId,
        action,
        resource,
        resourceId,
        status
      });
    } catch (error) {
      // Falha no audit log não deve bloquear a operação
      logger.error('Failed to create audit log:', error);
    }
  }

  /**
   * Registra login bem-sucedido
   */
  async logLogin(userId, metadata = {}) {
    await this.log({
      userId,
      action: 'LOGIN',
      resource: 'auth',
      metadata,
      status: 'success',
      message: 'User logged in successfully'
    });
  }

  /**
   * Registra falha de login
   */
  async logLoginFailure(email, metadata = {}) {
    await this.log({
      userId: null,
      action: 'LOGIN_FAILURE',
      resource: 'auth',
      metadata: { email, ...metadata },
      status: 'failure',
      message: 'Login attempt failed'
    });
  }

  /**
   * Registra logout
   */
  async logLogout(userId, metadata = {}) {
    await this.log({
      userId,
      action: 'LOGOUT',
      resource: 'auth',
      metadata,
      status: 'success',
      message: 'User logged out'
    });
  }

  /**
   * Registra criação de recurso
   */
  async logCreate(userId, resource, resourceId, metadata = {}) {
    await this.log({
      userId,
      action: 'CREATE',
      resource,
      resourceId,
      metadata,
      status: 'success',
      message: `Created ${resource}`
    });
  }

  /**
   * Registra leitura de recurso sensível
   */
  async logRead(userId, resource, resourceId, metadata = {}) {
    await this.log({
      userId,
      action: 'READ',
      resource,
      resourceId,
      metadata,
      status: 'success',
      message: `Read ${resource}`
    });
  }

  /**
   * Registra atualização de recurso
   */
  async logUpdate(userId, resource, resourceId, changes = {}, metadata = {}) {
    await this.log({
      userId,
      action: 'UPDATE',
      resource,
      resourceId,
      metadata: { changes, ...metadata },
      status: 'success',
      message: `Updated ${resource}`
    });
  }

  /**
   * Registra exclusão de recurso
   */
  async logDelete(userId, resource, resourceId, metadata = {}) {
    await this.log({
      userId,
      action: 'DELETE',
      resource,
      resourceId,
      metadata,
      status: 'success',
      message: `Deleted ${resource}`
    });
  }

  /**
   * Registra acesso negado
   */
  async logAccessDenied(userId, resource, resourceId, reason, metadata = {}) {
    await this.log({
      userId,
      action: 'ACCESS_DENIED',
      resource,
      resourceId,
      metadata: { reason, ...metadata },
      status: 'failure',
      message: `Access denied to ${resource}`
    });
  }

  /**
   * Registra exportação de dados
   */
  async logExport(userId, resource, metadata = {}) {
    await this.log({
      userId,
      action: 'EXPORT',
      resource,
      metadata,
      status: 'success',
      message: `Exported ${resource} data`
    });
  }

  /**
   * Registra alteração de senha
   */
  async logPasswordChange(userId, metadata = {}) {
    await this.log({
      userId,
      action: 'PASSWORD_CHANGE',
      resource: 'user',
      resourceId: userId,
      metadata,
      status: 'success',
      message: 'Password changed successfully'
    });
  }

  /**
   * Registra ativação de 2FA
   */
  async log2FAEnabled(userId, metadata = {}) {
    await this.log({
      userId,
      action: '2FA_ENABLED',
      resource: 'user',
      resourceId: userId,
      metadata,
      status: 'success',
      message: '2FA enabled'
    });
  }

  /**
   * Registra desativação de 2FA
   */
  async log2FADisabled(userId, metadata = {}) {
    await this.log({
      userId,
      action: '2FA_DISABLED',
      resource: 'user',
      resourceId: userId,
      metadata,
      status: 'success',
      message: '2FA disabled'
    });
  }

  /**
   * Busca logs de auditoria com filtros
   * @param {Object} filters - Filtros de busca
   * @param {number} limit - Limite de resultados
   * @param {number} skip - Número de registros a pular
   * @returns {Promise<Array>} Lista de logs
   */
  async getLogs(filters = {}, limit = 100, skip = 0) {
    try {
      const logs = await AuditLog.find(filters)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      return logs;
    } catch (error) {
      logger.error('Failed to retrieve audit logs:', error);
      throw error;
    }
  }

  /**
   * Busca logs de um usuário específico
   */
  async getUserLogs(userId, limit = 100) {
    return this.getLogs({ userId }, limit);
  }

  /**
   * Busca logs de um recurso específico
   */
  async getResourceLogs(resource, resourceId, limit = 100) {
    return this.getLogs({ resource, resourceId }, limit);
  }

  /**
   * Conta tentativas de login falhadas em um período
   */
  async countLoginFailures(email, minutes = 15) {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    const count = await AuditLog.countDocuments({
      action: 'LOGIN_FAILURE',
      'metadata.email': email,
      timestamp: { $gte: since }
    });

    return count;
  }
}

// Singleton
const auditService = new AuditService();

module.exports = auditService;
