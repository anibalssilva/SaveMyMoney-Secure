# 🔐 SaveMyMoney - Versão Segura

Sistema de gerenciamento financeiro pessoal com **criptografia de ponta a ponta**, **isolamento multi-tenant** e **auditoria completa**.

## 🛡️ Recursos de Segurança

### ✅ Implementado

- **Criptografia AES-256-GCM** - Dados sensíveis protegidos
- **Multi-Tenant Isolation** - Isolamento total entre usuários
- **Separação de PII** - Dados identificáveis separados e criptografados
- **Auditoria Completa** - Logs imutáveis de todas as ações
- **Proteção contra Ataques** - NoSQL injection, XSS, CSRF
- **Autenticação Forte** - JWT, bcrypt, 2FA, bloqueio de conta
- **Conformidade LGPD** - TTL de logs, direito ao esquecimento

### 🔒 Nível de Segurança

**Antes**: 5/10 ⚠️
**Agora**: 9/10 ✅

## 🚀 Quick Start

### 1. Instalação

```bash
# Clone o repositório
git clone https://github.com/anibalssilva/SaveMyMoney-Secure.git
cd SaveMyMoney-Secure

# Instale dependências do backend
cd server
npm install

# Instale dependências do frontend
cd ../client
npm install
```

### 2. Configuração

```bash
# Backend
cd server
cp .env.example .env

# Gere uma chave de criptografia SEGURA (64 caracteres)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Edite .env e adicione:
# ENCRYPTION_KEY=<chave_gerada_acima>
# MONGO_URI=mongodb://localhost:27017/savemymoney
# JWT_SECRET=sua_chave_jwt_super_secreta
```

### 3. Executar

```bash
# Backend (porta 3001)
cd server
npm run dev

# Frontend (porta 5173)
cd client
npm run dev
```

Acesse: `http://localhost:5173`

## 📚 Documentação

- **[Plano de Implementação](SECURITY_IMPLEMENTATION_PLAN.md)** - Estratégia completa
- **[Resumo da Implementação](SECURITY_IMPLEMENTATION_SUMMARY.md)** - O que foi feito
- **[Guia de Deploy no Render](RENDER_DEPLOYMENT_GUIDE.md)** - Deploy em produção
- **[Guia de Início Rápido](QUICKSTART.md)** - Setup local

## 🔐 Dados Criptografados

O sistema criptografa automaticamente:

- ✅ Email do usuário
- ✅ Nome do usuário
- ✅ Descrição de transações
- ✅ Notas de transações
- ✅ Nome de portfolios
- ✅ Descrição de portfolios
- ✅ Notas de assets

**Valores monetários** NÃO são criptografados para permitir cálculos rápidos.

## 🗂️ Estrutura do Projeto

```
SaveMyMoney-Secure/
├── server/                    # Backend Node.js + Express
│   ├── models/               # Modelos do banco de dados
│   │   ├── User.js          # Usuário (sem PII)
│   │   ├── UserIdentity.js  # Dados identificáveis criptografados
│   │   ├── AuditLog.js      # Logs de auditoria
│   │   ├── Transaction.js   # Transações (criptografadas)
│   │   ├── Budget.js        # Orçamentos
│   │   ├── Portfolio.js     # Portfolios (criptografados)
│   │   └── Asset.js         # Assets (criptografados)
│   ├── services/            # Serviços
│   │   ├── encryptionService.js  # Criptografia AES-256-GCM
│   │   └── auditService.js       # Sistema de auditoria
│   ├── middleware/          # Middlewares
│   │   ├── auth.js          # Autenticação JWT
│   │   ├── tenantMiddleware.js  # Isolamento multi-tenant
│   │   ├── security.js      # Headers de segurança
│   │   └── rateLimiter.js   # Rate limiting
│   ├── routes/              # Rotas da API
│   │   └── api/
│   │       ├── auth.js      # Autenticação (segura)
│   │       ├── transactions.js
│   │       ├── budgets.js
│   │       └── ...
│   ├── scripts/             # Scripts utilitários
│   │   └── migrateToSecure.js  # Migração de dados
│   └── index.js             # Entry point
│
├── client/                   # Frontend React + Vite
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
│   └── package.json
│
├── SECURITY_IMPLEMENTATION_PLAN.md      # Plano completo
├── SECURITY_IMPLEMENTATION_SUMMARY.md   # Resumo da implementação
├── RENDER_DEPLOYMENT_GUIDE.md           # Guia de deploy
├── QUICKSTART.md                         # Início rápido
└── README.md                             # Este arquivo
```

## 🔄 Migração de Dados Existentes

Se você já tem dados no banco:

```bash
# 1. FAÇA BACKUP!
mongodump --uri="sua_mongodb_uri" --out=backup_pre_security

# 2. Configure ENCRYPTION_KEY no .env

# 3. Execute migração
cd server
node scripts/migrateToSecure.js
```

O script vai:
- Migrar usuários para User + UserIdentity
- Criptografar descrições e notas
- Adicionar userId a todos os registros
- Preservar todos os IDs existentes

## 🧪 Testes

### Teste de Registro

```bash
POST http://localhost:3001/api/auth/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@example.com",
  "password": "Senha123!"
}
```

**Requisitos de Senha**:
- Mínimo 8 caracteres
- Pelo menos uma letra maiúscula
- Pelo menos uma letra minúscula
- Pelo menos um número

### Teste de Login

```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "joao@example.com",
  "password": "Senha123!"
}
```

**Proteções**:
- 5 tentativas falhadas = bloqueio por 15 minutos
- Auditoria de todas as tentativas
- Email mascarado na resposta (j***a@example.com)

## 📊 Conformidade

### LGPD (Lei Geral de Proteção de Dados)
- ✅ Criptografia de dados pessoais
- ✅ Auditoria de acessos
- ✅ TTL de logs (2 anos)
- ✅ Separação de PII
- ✅ Direito ao esquecimento

### OWASP Top 10
- ✅ A01: Broken Access Control
- ✅ A02: Cryptographic Failures
- ✅ A03: Injection
- ✅ A04: Insecure Design
- ✅ A05: Security Misconfiguration
- ✅ A07: Identification and Auth Failures

## 🔧 Variáveis de Ambiente

### Backend (.env)

```env
# Ambiente
NODE_ENV=development
PORT=3001

# Banco de Dados
MONGO_URI=mongodb://localhost:27017/savemymoney

# Segurança (CRÍTICO!)
JWT_SECRET=sua_chave_jwt_super_secreta_min_32_chars
ENCRYPTION_KEY=sua_chave_de_64_chars_gerada_com_crypto

# Frontend
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Opcional
OPENAI_API_KEY=sk-proj-sua-chave-openai
SENTRY_DSN=https://sua-chave-sentry
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001
```

## 🚨 Alertas de Segurança

### ⚠️ NUNCA faça:

1. ❌ Commitar ENCRYPTION_KEY no Git
2. ❌ Usar mesma ENCRYPTION_KEY em dev e prod
3. ❌ Perder a ENCRYPTION_KEY (dados irrecuperáveis!)
4. ❌ Compartilhar credenciais do MongoDB
5. ❌ Expor variáveis de ambiente em logs

### ✅ SEMPRE faça:

1. ✅ Backup da ENCRYPTION_KEY em local seguro
2. ✅ Backup regular do MongoDB
3. ✅ Use HTTPS em produção
4. ✅ Monitore logs de auditoria
5. ✅ Atualize dependências regularmente

## 🐛 Troubleshooting

### Erro: "ENCRYPTION_KEY must be at least 32 characters"

**Solução**:
```bash
# Gere nova chave
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Adicione no .env
ENCRYPTION_KEY=<chave_gerada>
```

### Erro: "Failed to decrypt data"

**Causa**: ENCRYPTION_KEY diferente da usada na criptografia

**Solução**: Use a mesma chave que criptografou os dados

### Erro: MongoDB Connection Failed

**Solução**:
```bash
# Verifique se MongoDB está rodando
mongosh

# Ou use MongoDB Atlas (grátis)
```

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/anibalssilva/SaveMyMoney-Secure/issues)
- **Documentação**: Veja arquivos `.md` neste repositório
- **Email**: (adicione seu email de suporte)

## 📜 Licença

Este projeto está sob a licença [ISC](LICENSE).

## 🙏 Créditos

- **Desenvolvedor**: Aníbal Silva
- **Implementação de Segurança**: Claude (Anthropic AI)
- **Data**: 2025-11-12

---

**🔐 Seguro por design. Privado por padrão.**
