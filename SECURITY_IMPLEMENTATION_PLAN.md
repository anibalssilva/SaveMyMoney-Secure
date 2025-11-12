# 🔒 Plano de Implementação de Segurança - SaveMyMoney

**Data:** 12/11/2025
**Repositório:** SaveMyMoney-Secure
**Commit Base:** 2e96541 (Initial commit)

---

## 📋 Resumo Executivo

Este documento descreve o plano completo para implementar **multi-tenancy seguro** e **anonimização de dados** no SaveMyMoney, garantindo que:

1. ✅ Múltiplos usuários possam usar o sistema sem ver dados uns dos outros
2. ✅ Dados sejam criptografados (ilegíveis para admins/hackers)
3. ✅ Não seja possível cruzar informações para identificar proprietários
4. ✅ Usuários possam utilizar seus dados normalmente na plataforma

---

## 🎯 Objetivos de Segurança

### Nível 1: Multi-Tenancy (Isolamento de Dados)
- Garantir que cada usuário acesse APENAS seus próprios dados
- Middleware automático para forçar filtros de tenant
- Validação em todas as queries MongoDB

### Nível 2: Criptografia de Dados Sensíveis
- Criptografar campos identificáveis (descrição, notas, etc.)
- AES-256-GCM (criptografia autenticada)
- Chaves únicas derivadas por usuário

### Nível 3: Pseudoanonimização de Identidade
- Separar dados de identidade (email/nome) em collection isolada
- Usar UUID público como identificador
- Hash de email para login (SHA-256)

### Nível 4: Auditoria e Monitoramento
- Logs de todas operações sensíveis
- Alertas de tentativas de acesso cross-tenant
- Rastro imutável para compliance

---

## 🏗️ Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────┐
│                 CAMADA DE APLICAÇÃO                     │
│  • Frontend React (JWT com user_uuid)                   │
│  • Dados descriptografados apenas para o usuário        │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS + JWT
                     ↓
┌─────────────────────────────────────────────────────────┐
│              CAMADA DE SEGURANÇA (Backend)              │
├─────────────────────────────────────────────────────────┤
│ 1. Auth Middleware                                      │
│    └─ Valida JWT, extrai user_id                        │
│                                                         │
│ 2. Tenant Isolation Middleware                          │
│    └─ Força { user: req.user.id } em todas queries      │
│    └─ Valida updates/deletes                            │
│                                                         │
│ 3. Encryption Service                                   │
│    └─ Deriva chave única por usuário (HKDF)             │
│    └─ Criptografa/descriptografa automaticamente        │
│    └─ Hooks pre-save/post-find em Mongoose              │
│                                                         │
│ 4. Audit Logger                                         │
│    └─ Registra: user_uuid, timestamp, action, resource  │
│    └─ Alertas de anomalias                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│            CAMADA DE DADOS (MongoDB)                    │
├─────────────────────────────────────────────────────────┤
│ Collection: user_identities (SUPER PROTEGIDA)           │
│   • _id: ObjectId                                       │
│   • user_uuid: UUID v4 (público)                        │
│   • email_hash: SHA-256 (para login)                    │
│   • email_encrypted: AES-256                            │
│   • name_encrypted: AES-256                             │
│   • password: bcrypt                                    │
│   • twoFactorSecret: AES-256                            │
│                                                         │
│ Collection: transactions (ANONIMIZADA)                  │
│   • user: ObjectId (referência, sem link ao email)      │
│   • description: "iv:authTag:ciphertext" (AES-256)      │
│   • notes: "iv:authTag:ciphertext" (AES-256)            │
│   • amount: Number (CLARO - para ML/agregações)         │
│   • category: String (CLARO - para filtros)             │
│   • date: Date (CLARO - para ordenação)                 │
│                                                         │
│ Collection: budgets, portfolios, assets... (idem)       │
│                                                         │
│ Collection: audit_logs (IMUTÁVEL)                       │
│   • user_uuid: UUID                                     │
│   • timestamp: Date                                     │
│   • action: String (CREATE/READ/UPDATE/DELETE)          │
│   • resource: String (transactions/budgets/etc)         │
│   • status: String (success/failure)                    │
│   • ip_address: String (opcional)                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Implementação Técnica

### 1. Serviço de Criptografia

**Arquivo:** `server/services/encryption.js`

**Funções principais:**
```javascript
// Deriva chave única para cada usuário
deriveUserKey(userId, masterKey)
  └─ HKDF-SHA256(masterKey, userId)
  └─ Output: 256-bit key

// Criptografa campo
encrypt(plaintext, userId)
  └─ Gera IV aleatório (96 bits)
  └─ AES-256-GCM(plaintext, userKey, IV)
  └─ Retorna: "iv:authTag:ciphertext" (base64)

// Descriptografa campo
decrypt(ciphertext, userId)
  └─ Parse: "iv:authTag:ciphertext"
  └─ AES-256-GCM decrypt
  └─ Verifica authTag (autenticação)
  └─ Retorna: plaintext
```

**Configuração (.env):**
```
MASTER_ENCRYPTION_KEY=<256-bit hex key - NUNCA COMMITAR!>
ENCRYPTION_ALGORITHM=aes-256-gcm
```

---

### 2. Middleware de Isolamento de Tenant

**Arquivo:** `server/middleware/tenantIsolation.js`

**Funcionalidade:**
- Intercepta todas as operações Mongoose (find, update, delete)
- Injeta automaticamente `{ user: req.user.id }` no filtro
- Valida que operações de escrita só afetam documentos do usuário
- Rejeita queries sem filtro de usuário

**Exemplo:**
```javascript
// Antes (vulnerável)
Transaction.find({ category: 'food' })

// Depois (protegido)
Transaction.find({ category: 'food', user: req.user.id })
```

---

### 3. Modificações no Schema do Usuário

**Arquivo:** `server/models/User.js`

**Alterações:**
```javascript
{
  // NOVO: Identificador público
  user_uuid: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    index: true
  },

  // Email criptografado (não mais em texto claro)
  email_encrypted: String,

  // Hash do email para login
  email_hash: {
    type: String,
    unique: true,
    index: true
  },

  // Nome criptografado
  name_encrypted: String,

  // ... resto dos campos
}
```

**Hooks:**
```javascript
// Pre-save: criptografa email/name
userSchema.pre('save', async function(next) {
  if (this.isModified('email')) {
    this.email_hash = sha256(this.email);
    this.email_encrypted = encrypt(this.email, this._id);
  }
  next();
});

// Post-find: descriptografa automaticamente
userSchema.post('find', function(docs) {
  docs.forEach(doc => {
    doc.email = decrypt(doc.email_encrypted, doc._id);
    doc.name = decrypt(doc.name_encrypted, doc._id);
  });
});
```

---

### 4. Modificações no Schema de Transaction

**Arquivo:** `server/models/Transaction.js`

**Campos criptografados:**
- `description` (ex: "Almoço no Restaurante X")
- `notes` (ex: "Refeição com cliente João")

**Campos em claro (para ML/agregações):**
- `amount` (necessário para somas/gráficos)
- `category` (necessário para filtros)
- `date` (necessário para ordenação)
- `type` (income/expense)
- `paymentMethod`

**Hooks:**
```javascript
// Pre-save: criptografa campos sensíveis
transactionSchema.pre('save', async function(next) {
  if (this.isModified('description')) {
    this.description = encrypt(this.description, this.user);
  }
  if (this.isModified('notes') && this.notes) {
    this.notes = encrypt(this.notes, this.user);
  }
  next();
});

// Post-find: descriptografa automaticamente
transactionSchema.post('find', function(docs) {
  docs.forEach(doc => {
    doc.description = decrypt(doc.description, doc.user);
    if (doc.notes) doc.notes = decrypt(doc.notes, doc.user);
  });
});
```

---

### 5. Middleware de Auditoria

**Arquivo:** `server/middleware/auditLogger.js`

**Formato de log:**
```
[2025-11-12T10:00:00Z] user_uuid=abc-123 action=CREATE resource=transactions status=success ip=192.168.1.1
[2025-11-12T10:01:00Z] user_uuid=abc-123 action=UPDATE resource=transactions/673ad11a82ac16d94e8af1be status=success
[2025-11-12T10:02:00Z] user_uuid=def-456 action=DELETE resource=budgets/507f1f77bcf86cd799439011 status=failure reason=unauthorized
```

**Alertas automáticos:**
- Tentativa de acesso cross-tenant
- Múltiplas tentativas falhas de autenticação
- Operações em horários suspeitos
- Bulk deletions

---

## 📊 Campos a Criptografar por Collection

| Collection | Campos Criptografados | Campos em Claro (Motivo) |
|------------|----------------------|-------------------------|
| **users** | name, email, twoFactorSecret | email_hash (login), password (bcrypt) |
| **transactions** | description, notes | amount (ML), category (filtros), date (ordenação) |
| **budgets** | - | category, limit (agregações) |
| **investorprofiles** | goals[].name | riskProfile, age, monthlyIncome (análise) |
| **portfolios** | name, description | totalInvested, currentValue (cálculos) |
| **assets** | name, notes | symbol, quantity, prices (mercado) |
| **assettransactions** | notes | type, quantity, price (tracking) |

**Critério:** Criptografar apenas dados **identificáveis/sensíveis** que não sejam necessários para **agregações/ML/filtros**.

---

## 🔐 Geração da Master Key

**NÃO use uma chave fraca!** Gere uma chave criptograficamente segura:

```bash
# Opção 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Opção 2: OpenSSL
openssl rand -hex 32

# Opção 3: Python
python -c "import secrets; print(secrets.token_hex(32))"
```

**Exemplo de output:**
```
a3f8b2e1c9d4f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1
```

**⚠️ IMPORTANTE:**
- Armazene em `.env` (NUNCA commite!)
- Faça backup em cofre seguro (1Password, Vault, etc.)
- **Se perder, dados são IRRECUPERÁVEIS!**
- Rotacione anualmente (requer re-criptografia)

---

## 🧪 Testes de Segurança

### Teste 1: Isolamento de Tenant
```javascript
// Login como User A
const tokenA = loginAs('userA@test.com');

// Criar transação
const transactionA = await createTransaction(tokenA, {
  description: "Confidencial User A",
  amount: 100
});

// Login como User B
const tokenB = loginAs('userB@test.com');

// Tentar acessar transação do User A (deve FALHAR)
const result = await getTransaction(tokenB, transactionA._id);
// Expected: 404 Not Found ou 403 Forbidden
```

### Teste 2: Criptografia
```javascript
// Criar transação
await createTransaction(token, {
  description: "Almoço no Restaurante Secreto",
  amount: 50
});

// Conectar diretamente no MongoDB
const db = await MongoClient.connect(MONGO_URI);
const rawDoc = await db.collection('transactions').findOne({});

// Verificar que description está criptografado
console.log(rawDoc.description);
// Expected: "a3f8b2e1c9d4:1a2b3c4d:9f8e7d6c5b4a3..."
// NOT: "Almoço no Restaurante Secreto"
```

### Teste 3: Pseudoanonimização
```javascript
// Admin acessa banco de dados
const users = await db.collection('users').find({}).toArray();

// Verificar que não há emails em claro
users.forEach(user => {
  assert(!user.email); // Campo não existe
  assert(user.email_encrypted); // Existe criptografado
  assert(user.user_uuid); // UUID público
});
```

---

## 📈 Impacto em Performance

### Estimativas:

| Operação | Overhead | Aceitável? |
|----------|----------|------------|
| Leitura (decrypt) | +5-15ms | ✅ Sim |
| Escrita (encrypt) | +8-20ms | ✅ Sim |
| Derivação de chave (HKDF) | +2-5ms (cached) | ✅ Sim |
| Queries com filtro tenant | +1-3ms | ✅ Sim |

**Total:** ~10-20% de overhead nas operações de I/O.

**Otimizações:**
- Cache de chaves derivadas (por sessão)
- Descriptografia lazy (apenas campos acessados)
- Índices MongoDB otimizados

---

## 🚀 Plano de Migração (Dados Existentes)

### Script: `server/scripts/migration-encrypt-data.js`

**Etapas:**
1. Backup completo do banco (MongoDB dump)
2. Para cada usuário:
   - Gerar `user_uuid`
   - Criptografar `email` → `email_encrypted`
   - Gerar `email_hash` (SHA-256)
   - Criptografar `name` → `name_encrypted`
3. Para cada transação:
   - Criptografar `description`
   - Criptografar `notes`
4. Atualizar índices
5. Validar integridade (descriptografar amostras)

**Tempo estimado:** ~1-5 min para cada 10k documentos

**⚠️ Recomendação:**
- Executar em horário de baixo tráfego
- Modo de manutenção (aplicação offline)
- Rollback preparado (backup + script reverso)

---

## 📝 Checklist de Implementação

### Fase 1: Infraestrutura de Segurança
- [ ] Criar `server/services/encryption.js`
- [ ] Gerar `MASTER_ENCRYPTION_KEY` e adicionar ao `.env`
- [ ] Criar testes unitários de criptografia
- [ ] Criar `server/middleware/tenantIsolation.js`
- [ ] Criar `server/middleware/auditLogger.js`

### Fase 2: Modificações no Modelo de Dados
- [ ] Atualizar `server/models/User.js` (UUID, email_hash, campos encrypted)
- [ ] Atualizar `server/models/Transaction.js` (hooks de criptografia)
- [ ] Atualizar `server/models/Budget.js` (se necessário)
- [ ] Atualizar `server/models/InvestorProfile.js` (goals.name)
- [ ] Atualizar `server/models/Portfolio.js` (name, description)
- [ ] Atualizar `server/models/Asset.js` (notes)

### Fase 3: Aplicação dos Middlewares
- [ ] Aplicar `tenantIsolation` em `/api/transactions`
- [ ] Aplicar `tenantIsolation` em `/api/budgets`
- [ ] Aplicar `tenantIsolation` em `/api/portfolio`
- [ ] Aplicar `tenantIsolation` em `/api/investments`
- [ ] Aplicar `auditLogger` em todas as rotas sensíveis

### Fase 4: Autenticação
- [ ] Modificar `/api/auth/login` para usar `email_hash`
- [ ] Modificar `/api/auth/register` para gerar UUID e criptografar
- [ ] Atualizar JWT payload (incluir `user_uuid`)
- [ ] Atualizar middleware de autenticação

### Fase 5: Migração de Dados
- [ ] Criar script de migração `migration-encrypt-data.js`
- [ ] Testar migração em banco de desenvolvimento
- [ ] Backup do banco de produção
- [ ] Executar migração em produção
- [ ] Validar integridade pós-migração

### Fase 6: Testes
- [ ] Testes unitários de criptografia
- [ ] Testes de isolamento de tenant
- [ ] Testes de auditoria
- [ ] Testes de performance
- [ ] Testes de segurança (penetration)

### Fase 7: Documentação
- [ ] Documentar API de segurança
- [ ] Guia de gerenciamento de chaves
- [ ] Procedimentos de recuperação
- [ ] Política de segurança

---

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Perda da `MASTER_KEY` | 🔴 CRÍTICO | Backup em 3+ locais seguros, processo de rotação |
| Performance degradada | 🟡 MÉDIO | Cache de chaves, índices otimizados, monitoramento |
| Bug na criptografia | 🔴 ALTO | Testes extensivos, code review, rollback preparado |
| Vazamento de logs | 🟠 MÉDIO | Sanitização de logs, acesso restrito, rotação |
| Ataque timing | 🟢 BAIXO | Constant-time operations, rate limiting |

---

## 📚 Referências

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **LGPD (Lei Geral de Proteção de Dados):** http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- **GDPR (Europa):** https://gdpr.eu/
- **NIST Cryptographic Standards:** https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines
- **Node.js Crypto:** https://nodejs.org/api/crypto.html
- **MongoDB Security Checklist:** https://www.mongodb.com/docs/manual/administration/security-checklist/

---

## 🎓 Glossário

- **Multi-tenancy:** Arquitetura onde múltiplos usuários (tenants) compartilham a mesma infraestrutura, mas com dados isolados
- **AES-256-GCM:** Advanced Encryption Standard com chave de 256 bits em modo Galois/Counter (autenticação + criptografia)
- **HKDF:** HMAC-based Key Derivation Function (derivar chaves únicas a partir de uma master key)
- **SHA-256:** Secure Hash Algorithm 256-bit (função hash criptográfica)
- **UUID:** Universally Unique Identifier (identificador globalmente único)
- **Pseudoanonimização:** Processo de substituir identificadores diretos por pseudônimos, mantendo possibilidade de re-identificação com chave
- **Auditoria imutável:** Logs que não podem ser alterados após criação (append-only)

---

## 📞 Próximos Passos

Antes de começar a implementação, defina:

1. **Nível de segurança desejado:**
   - [ ] Máximo (tudo criptografado, inclusive valores)
   - [ ] Alto (textos criptografados, valores em claro) ← **RECOMENDADO**
   - [ ] Médio (apenas tenant isolation robusto)

2. **Prioridade de implementação:**
   - [ ] Tudo de uma vez (requer downtime)
   - [ ] Por etapas (implementação gradual)

3. **Migração de dados:**
   - [ ] Sim, existem dados em produção
   - [ ] Não, projeto novo

4. **Timeline:**
   - Estimativa: **2-4 semanas** (implementação completa + testes)
   - MVP (apenas tenant isolation): **3-5 dias**

---

**Status:** ✅ Repositório preparado e pronto para implementação
**Próxima ação:** Aguardando aprovação do plano e início da implementação
