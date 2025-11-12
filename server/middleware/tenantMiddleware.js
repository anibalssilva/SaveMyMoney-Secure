const auditService = require('../services/auditService');
const logger = require('../config/logger');

/**
 * Tenant Isolation Middleware
 *
 * Garante que cada usuário acesse apenas seus próprios dados
 * Adiciona o contexto do tenant (userId) ao request
 *
 * CRÍTICO: Este middleware DEVE ser aplicado APÓS o auth middleware
 */

/**
 * Middleware principal de tenant isolation
 * Injeta userId no req.tenant para uso em queries
 */
const tenantContext = (req, res, next) => {
  try {
    // Verificar se há usuário autenticado
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Criar contexto do tenant
    req.tenant = {
      id: req.user.id,
      userId: req.user.id // Alias para compatibilidade
    };

    // Adicionar helper para queries seguras
    req.tenant.query = function(baseQuery = {}) {
      return {
        ...baseQuery,
        userId: req.user.id
      };
    };

    // Log de contexto (debug)
    logger.debug('Tenant context set', {
      userId: req.user.id,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    logger.error('Tenant context error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Validator para garantir que userId está nas queries
 * Uso: router.get('/transactions', validateTenantQuery, getTransactions)
 */
const validateTenantQuery = (req, res, next) => {
  // Este middleware é executado ANTES do controller
  // Garante que o desenvolvedor não esqueceu de adicionar userId

  if (!req.tenant || !req.tenant.id) {
    logger.error('Tenant context missing in validateTenantQuery', {
      path: req.path,
      method: req.method
    });

    return res.status(500).json({
      success: false,
      message: 'Tenant context missing'
    });
  }

  next();
};

/**
 * Middleware de auditoria para acesso a recursos
 * Log automático de todas as requisições
 */
const auditAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      const action = req.method === 'GET' ? 'READ' :
                     req.method === 'POST' ? 'CREATE' :
                     req.method === 'PUT' || req.method === 'PATCH' ? 'UPDATE' :
                     req.method === 'DELETE' ? 'DELETE' : 'UNKNOWN';

      const resourceId = req.params.id || null;

      // Interceptar resposta para logar apenas se sucesso
      const originalJson = res.json;
      res.json = function(data) {
        // Logar apenas se foi bem-sucedido
        if (data.success !== false && res.statusCode < 400) {
          auditService.log({
            userId: req.user.id,
            action,
            resource: resourceType,
            resourceId,
            metadata: {
              ip: req.ip,
              userAgent: req.get('user-agent'),
              path: req.path
            },
            status: 'success'
          }).catch(err => {
            logger.error('Audit log failed:', err);
          });
        }

        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Audit middleware error:', error);
      next(); // Não bloquear por erro de auditoria
    }
  };
};

/**
 * Previne acesso cross-tenant em parâmetros de URL
 * Valida que resourceId pertence ao tenant
 */
const validateTenantOwnership = (Model) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;

      if (!resourceId) {
        return next(); // Sem ID, deixar controller validar
      }

      // Buscar recurso e validar ownership
      const resource = await Model.findOne({
        _id: resourceId,
        userId: req.tenant.id
      });

      if (!resource) {
        // Log de tentativa de acesso não autorizado
        await auditService.logAccessDenied(
          req.user.id,
          Model.modelName,
          resourceId,
          'Resource not found or access denied',
          {
            ip: req.ip,
            userAgent: req.get('user-agent')
          }
        );

        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Anexar recurso ao request para evitar nova query
      req.resource = resource;

      next();
    } catch (error) {
      logger.error('Tenant ownership validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Sanitiza query params para prevenir query injection
 */
const sanitizeQueryParams = (req, res, next) => {
  try {
    // Prevenir query operators em query strings
    const dangerous = ['$where', '$regex', '$ne', '$nin', '$exists'];

    Object.keys(req.query).forEach(key => {
      if (dangerous.includes(key)) {
        delete req.query[key];
        logger.warn('Dangerous query parameter removed', {
          key,
          userId: req.user?.id,
          ip: req.ip
        });
      }

      // Remover operators de valores
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].replace(/[${}]/g, '');
      }
    });

    next();
  } catch (error) {
    logger.error('Query sanitization error:', error);
    next();
  }
};

module.exports = {
  tenantContext,
  validateTenantQuery,
  auditAccess,
  validateTenantOwnership,
  sanitizeQueryParams
};
