const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');
const UserIdentity = require('../../models/UserIdentity');
const encryptionService = require('../../services/encryptionService');
const auditService = require('../../services/auditService');
const logger = require('../../config/logger');
require('dotenv').config();

/**
 * @route   POST api/auth/register
 * @desc    Register user (SECURE VERSION)
 * @access  Public
 */
router.post(
  '/register',
  [
    check('name', 'Nome é obrigatório').trim().not().isEmpty().isLength({ min: 2, max: 50 }),
    check('email', 'Por favor, insira um email válido').isEmail().normalizeEmail(),
    check('password', 'A senha deve ter no mínimo 8 caracteres')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('A senha deve conter letra maiúscula, minúscula e número'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    try {
      // Criar hash do email para busca
      const emailHash = encryptionService.hash(email.toLowerCase().trim());

      // Verificar se usuário já existe
      let user = await User.findOne({ emailHash });

      if (user) {
        // Log de tentativa de registro duplicado
        await auditService.log({
          userId: null,
          action: 'REGISTER',
          resource: 'user',
          metadata: {
            emailHash,
            ip: req.ip,
            userAgent: req.get('user-agent')
          },
          status: 'failure',
          message: 'Email already registered'
        });

        return res.status(400).json({
          success: false,
          error: 'Este email já está cadastrado. Por favor, faça login ou use outro email.',
          field: 'email'
        });
      }

      // Hash da senha
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Criar usuário
      user = new User({
        emailHash,
        password: hashedPassword,
        twoFactorEnabled: false,
        failedLoginAttempts: 0
      });

      await user.save();

      // Criptografar dados identificáveis
      const emailEncrypted = encryptionService.encrypt(email.toLowerCase().trim());
      const nameEncrypted = encryptionService.encrypt(name.trim());
      const emailMasked = encryptionService.maskEmail(email);

      // Criar UserIdentity separado
      const userIdentity = new UserIdentity({
        userId: user._id,
        emailEncrypted,
        emailHash,
        nameEncrypted,
        emailMasked
      });

      await userIdentity.save();

      // Log de auditoria
      await auditService.log({
        userId: user._id,
        action: 'REGISTER',
        resource: 'user',
        resourceId: user._id.toString(),
        metadata: {
          ip: req.ip,
          userAgent: req.get('user-agent')
        },
        status: 'success',
        message: 'User registered successfully'
      });

      // Criar JWT
      const payload = {
        user: {
          id: user._id.toString(),
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' }, // Token mais curto para segurança
        (err, token) => {
          if (err) {
            logger.error('JWT Error:', err);
            return res.status(500).json({
              success: false,
              error: 'Erro ao gerar token de autenticação'
            });
          }

          res.json({
            success: true,
            token,
            user: {
              id: user._id,
              name: name.trim(),
              email: emailMasked, // Email mascarado
              twoFactorEnabled: false
            },
            message: 'Cadastro realizado com sucesso!'
          });
        }
      );
    } catch (err) {
      logger.error('Register Error:', err);

      // Log de erro
      await auditService.log({
        userId: null,
        action: 'REGISTER',
        resource: 'user',
        metadata: {
          error: err.message,
          ip: req.ip
        },
        status: 'failure',
        message: 'Registration failed'
      });

      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          error: 'Este email já está cadastrado',
          field: 'email'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro no servidor. Por favor, tente novamente mais tarde.'
      });
    }
  }
);

/**
 * @route   POST api/auth/login
 * @desc    Authenticate user & get token (SECURE VERSION)
 * @access  Public
 */
router.post(
  '/login',
  [
    check('email', 'Por favor, insira um email válido').isEmail().normalizeEmail(),
    check('password', 'Senha é obrigatória').exists().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    try {
      // Criar hash do email para busca
      const emailHash = encryptionService.hash(email.toLowerCase().trim());

      // Buscar usuário pelo hash
      let user = await User.findOne({ emailHash });

      if (!user) {
        // Log de falha
        await auditService.logLoginFailure(email, {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          reason: 'User not found'
        });

        return res.status(400).json({
          success: false,
          error: 'Email ou senha incorretos',
          field: 'email'
        });
      }

      // Verificar account locked
      if (user.accountLockedUntil && user.accountLockedUntil > Date.now()) {
        const minutesLeft = Math.ceil((user.accountLockedUntil - Date.now()) / 60000);

        await auditService.log({
          userId: user._id,
          action: 'LOGIN_FAILURE',
          resource: 'auth',
          metadata: {
            reason: 'Account locked',
            ip: req.ip
          },
          status: 'failure',
          message: 'Account is locked'
        });

        return res.status(403).json({
          success: false,
          error: `Conta bloqueada. Tente novamente em ${minutesLeft} minutos.`,
          lockedUntil: user.accountLockedUntil
        });
      }

      // Verificar senha
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        // Incrementar tentativas falhadas
        user.failedLoginAttempts += 1;

        // Bloquear após 5 tentativas
        if (user.failedLoginAttempts >= 5) {
          user.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
        }

        await user.save();

        await auditService.logLoginFailure(email, {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          reason: 'Invalid password',
          attempts: user.failedLoginAttempts
        });

        return res.status(400).json({
          success: false,
          error: 'Email ou senha incorretos',
          field: 'password',
          attemptsLeft: Math.max(0, 5 - user.failedLoginAttempts)
        });
      }

      // Login bem-sucedido
      user.lastLogin = new Date();
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = null;
      await user.save();

      // Buscar UserIdentity para retornar dados
      const userIdentity = await UserIdentity.findOne({ userId: user._id });

      let userName = 'Usuário';
      let emailMasked = encryptionService.maskEmail(email);

      if (userIdentity) {
        try {
          userName = encryptionService.decrypt(userIdentity.nameEncrypted);
          emailMasked = userIdentity.emailMasked;
        } catch (err) {
          logger.error('Failed to decrypt user identity:', err);
        }
      }

      // Log de auditoria
      await auditService.logLogin(user._id, {
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      // Criar JWT
      const payload = {
        user: {
          id: user._id.toString(),
        },
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' },
        (err, token) => {
          if (err) {
            logger.error('JWT Error:', err);
            return res.status(500).json({
              success: false,
              error: 'Erro ao gerar token de autenticação'
            });
          }

          res.json({
            success: true,
            token,
            user: {
              id: user._id,
              name: userName,
              email: emailMasked,
              twoFactorEnabled: user.twoFactorEnabled || false
            },
            message: 'Login realizado com sucesso!'
          });
        }
      );
    } catch (err) {
      logger.error('Login Error:', err);

      await auditService.log({
        userId: null,
        action: 'LOGIN_FAILURE',
        resource: 'auth',
        metadata: {
          error: err.message,
          ip: req.ip
        },
        status: 'failure',
        message: 'Login failed due to server error'
      });

      res.status(500).json({
        success: false,
        error: 'Erro no servidor. Por favor, tente novamente mais tarde.'
      });
    }
  }
);

module.exports = router;
