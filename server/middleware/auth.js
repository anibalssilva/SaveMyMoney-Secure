const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const auditService = require('../services/auditService');
require('dotenv').config();

/**
 * Authentication Middleware (Secure Version)
 *
 * Verifica JWT e adiciona contexto do usuário
 * Compatível com tenant isolation
 */
module.exports = function (req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if not token
  if (!token) {
    logger.warn('No token provided', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent')
    });

    return res.status(401).json({
      success: false,
      msg: 'No token, authorization denied'
    });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Adicionar usuário ao request
    req.user = decoded.user;

    // Validar campos obrigatórios
    if (!req.user || !req.user.id) {
      logger.error('Invalid token payload', { decoded });
      return res.status(401).json({
        success: false,
        msg: 'Invalid token payload'
      });
    }

    // Log de autenticação bem-sucedida (apenas em debug)
    logger.debug('User authenticated', {
      userId: req.user.id,
      path: req.path,
      method: req.method
    });

    next();
  } catch (err) {
    // Log de falha de autenticação
    logger.warn('Invalid token', {
      error: err.message,
      ip: req.ip,
      path: req.path
    });

    // Auditoria de falha (async, não bloqueia)
    auditService.log({
      userId: null,
      action: 'LOGIN_FAILURE',
      resource: 'auth',
      metadata: {
        error: err.message,
        ip: req.ip,
        userAgent: req.get('user-agent')
      },
      status: 'failure',
      message: 'Invalid token'
    }).catch(auditErr => {
      logger.error('Audit log failed:', auditErr);
    });

    return res.status(401).json({
      success: false,
      msg: 'Token is not valid'
    });
  }
};
