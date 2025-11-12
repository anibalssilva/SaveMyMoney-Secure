const crypto = require('crypto');

/**
 * Serviço de Criptografia
 *
 * Implementa AES-256-GCM para criptografar dados sensíveis
 * Usa chave derivada de ENCRYPTION_KEY via PBKDF2
 */
class EncryptionService {
  constructor() {
    // Chave mestra do .env (deve ter 32+ caracteres)
    this.masterKey = process.env.ENCRYPTION_KEY;

    if (!this.masterKey || this.masterKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters');
    }

    // Algoritmo de criptografia
    this.algorithm = 'aes-256-gcm';
    this.saltLength = 16;
    this.ivLength = 16;
    this.tagLength = 16;
    this.keyLength = 32;
    this.iterations = 100000;
  }

  /**
   * Deriva uma chave criptográfica a partir do salt
   * @param {Buffer} salt - Salt único para derivação
   * @returns {Buffer} Chave derivada
   */
  deriveKey(salt) {
    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      this.iterations,
      this.keyLength,
      'sha256'
    );
  }

  /**
   * Criptografa um texto sensível
   * @param {string} plaintext - Texto em claro
   * @returns {string} Texto criptografado (formato: salt:iv:encrypted:tag em base64)
   */
  encrypt(plaintext) {
    if (!plaintext || plaintext === '') {
      return null;
    }

    try {
      // Gerar salt e IV aleatórios
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);

      // Derivar chave a partir do salt
      const key = this.deriveKey(salt);

      // Criar cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Criptografar
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Obter tag de autenticação
      const tag = cipher.getAuthTag();

      // Retornar formato: salt:iv:encrypted:tag (tudo em base64)
      return [
        salt.toString('base64'),
        iv.toString('base64'),
        encrypted,
        tag.toString('base64')
      ].join(':');
    } catch (error) {
      console.error('Encryption error:', error.message);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Descriptografa um texto criptografado
   * @param {string} ciphertext - Texto criptografado (formato: salt:iv:encrypted:tag)
   * @returns {string} Texto em claro
   */
  decrypt(ciphertext) {
    if (!ciphertext || ciphertext === '') {
      return null;
    }

    try {
      // Separar componentes
      const parts = ciphertext.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid ciphertext format');
      }

      const salt = Buffer.from(parts[0], 'base64');
      const iv = Buffer.from(parts[1], 'base64');
      const encrypted = parts[2];
      const tag = Buffer.from(parts[3], 'base64');

      // Derivar chave a partir do salt
      const key = this.deriveKey(salt);

      // Criar decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      // Descriptografar
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error.message);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Criptografa um objeto inteiro (campos selecionados)
   * @param {Object} obj - Objeto com dados sensíveis
   * @param {Array<string>} fields - Campos a criptografar
   * @returns {Object} Objeto com campos criptografados
   */
  encryptObject(obj, fields) {
    const encrypted = { ...obj };

    fields.forEach(field => {
      if (obj[field] !== undefined && obj[field] !== null) {
        encrypted[field] = this.encrypt(String(obj[field]));
      }
    });

    return encrypted;
  }

  /**
   * Descriptografa um objeto inteiro (campos selecionados)
   * @param {Object} obj - Objeto com dados criptografados
   * @param {Array<string>} fields - Campos a descriptografar
   * @returns {Object} Objeto com campos em claro
   */
  decryptObject(obj, fields) {
    const decrypted = { ...obj };

    fields.forEach(field => {
      if (obj[field] !== undefined && obj[field] !== null) {
        try {
          decrypted[field] = this.decrypt(obj[field]);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error.message);
          decrypted[field] = null;
        }
      }
    });

    return decrypted;
  }

  /**
   * Gera um hash SHA-256 de um valor (para busca)
   * @param {string} value - Valor a fazer hash
   * @returns {string} Hash em hexadecimal
   */
  hash(value) {
    if (!value || value === '') {
      return null;
    }

    return crypto
      .createHash('sha256')
      .update(String(value))
      .digest('hex');
  }

  /**
   * Gera um email mascarado para exibição
   * @param {string} email - Email completo
   * @returns {string} Email mascarado (ex: a***@example.com)
   */
  maskEmail(email) {
    if (!email || !email.includes('@')) {
      return '***';
    }

    const [local, domain] = email.split('@');

    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }

    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  /**
   * Gera um token seguro aleatório
   * @param {number} length - Tamanho em bytes (padrão: 32)
   * @returns {string} Token em hexadecimal
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

// Singleton
const encryptionService = new EncryptionService();

module.exports = encryptionService;
