# Guia de Deploy no Render - SaveMyMoney Secure

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Preparação do Banco de Dados MongoDB](#preparação-do-banco-de-dados-mongodb)
3. [Deploy do Backend](#deploy-do-backend)
4. [Deploy do Frontend](#deploy-do-frontend)
5. [Configuração de Variáveis de Ambiente](#configuração-de-variáveis-de-ambiente)
6. [Testes Pós-Deploy](#testes-pós-deploy)
7. [Migração de Dados](#migração-de-dados-opcional)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

### 1. Conta no Render
- Acesse [https://render.com](https://render.com)
- Crie uma conta gratuita ou faça login

### 2. Repositório GitHub
- ✅ Código já está em: `https://github.com/anibalssilva/SaveMyMoney-Secure.git`
- ✅ Branch principal: `main`

### 3. Gerar Chave de Criptografia
Antes de fazer deploy, gere uma chave de criptografia segura:

```bash
# Execute no terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ IMPORTANTE**:
- Salve esta chave em um local SEGURO (gerenciador de senhas)
- Você NÃO poderá descriptografar os dados sem ela
- NUNCA commite esta chave no Git

---

## 💾 Preparação do Banco de Dados MongoDB

### Opção 1: MongoDB Atlas (Recomendado - Grátis)

1. **Criar Conta**
   - Acesse [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
   - Crie uma conta gratuita

2. **Criar Cluster**
   - Clique em "Build a Database"
   - Escolha **M0 (Free Tier)**
   - Região: Escolha a mais próxima (ex: São Paulo - aws/sa-east-1)
   - Nome do cluster: `SaveMyMoney` (ou outro nome)

3. **Configurar Acesso**
   - Em "Security" → "Database Access":
     - Clique em "Add New Database User"
     - Username: `savemymoney_user` (ou outro)
     - Password: Gere uma senha forte (anote!)
     - Database User Privileges: "Atlas Admin"
     - Clique em "Add User"

   - Em "Security" → "Network Access":
     - Clique em "Add IP Address"
     - Escolha "Allow Access from Anywhere" (0.0.0.0/0)
     - Clique em "Confirm"

4. **Obter Connection String**
   - Clique em "Database" → "Connect"
   - Escolha "Connect your application"
   - Copie a connection string:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Substitua `<username>` e `<password>` pelos valores criados
   - Adicione o nome do banco no final:
     ```
     mongodb+srv://savemymoney_user:SuaSenha@cluster0.xxxxx.mongodb.net/savemymoney?retryWrites=true&w=majority
     ```

### Opção 2: Render PostgreSQL + MongoDB Alternative

Se preferir, pode usar outros provedores de MongoDB como:
- **Railway**: [https://railway.app](https://railway.app)
- **Clever Cloud**: [https://www.clever-cloud.com](https://www.clever-cloud.com)

---

## 🚀 Deploy do Backend

### 1. Criar Web Service no Render

1. **Acessar Render Dashboard**
   - Faça login em [https://dashboard.render.com](https://dashboard.render.com)
   - Clique em "New +" → "Web Service"

2. **Conectar Repositório**
   - Selecione "Connect a repository"
   - Autorize acesso ao GitHub
   - Escolha o repositório: `SaveMyMoney-Secure`

3. **Configurar Service**
   - **Name**: `savemymoney-backend` (ou outro nome único)
   - **Region**: Escolha a mais próxima (ex: Oregon US-West)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Adicionar Variáveis de Ambiente**

   Clique em "Advanced" → "Add Environment Variable" e adicione:

   ```env
   NODE_ENV=production
   PORT=3001

   # MongoDB (Cole sua connection string do MongoDB Atlas)
   MONGO_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/savemymoney?retryWrites=true&w=majority

   # JWT Secret (gere uma chave forte)
   JWT_SECRET=sua_chave_jwt_super_secreta_aqui_min_32_caracteres

   # ENCRYPTION_KEY (use a chave gerada anteriormente)
   ENCRYPTION_KEY=sua_chave_de_criptografia_de_64_caracteres_gerada_anteriormente

   # URLs do Frontend (você vai adicionar depois)
   CLIENT_URL=https://savemymoney-frontend.onrender.com
   FRONTEND_URL=https://savemymoney-frontend.onrender.com

   # OpenAI (opcional - para OCR avançado)
   OPENAI_API_KEY=sk-proj-sua-chave-openai-aqui

   # Sentry (opcional - para monitoramento de erros)
   SENTRY_DSN=
   ```

   **Como gerar JWT_SECRET**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

5. **Criar Service**
   - Clique em "Create Web Service"
   - Aguarde o deploy (leva ~5 minutos na primeira vez)

6. **Verificar Deploy**
   - Acesse a URL gerada (ex: `https://savemymoney-backend.onrender.com`)
   - Você deve ver uma resposta ou erro 404 (normal, não há rota raiz)
   - Teste: `https://savemymoney-backend.onrender.com/api/auth/login`
   - Deve retornar erro de validação (significa que está funcionando!)

---

## 🎨 Deploy do Frontend

### 1. Criar Static Site no Render

1. **Acessar Render Dashboard**
   - Clique em "New +" → "Static Site"

2. **Conectar Repositório**
   - Escolha o mesmo repositório: `SaveMyMoney-Secure`

3. **Configurar Site**
   - **Name**: `savemymoney-frontend`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

4. **Adicionar Variáveis de Ambiente**

   Clique em "Advanced" → "Add Environment Variable":

   ```env
   # URL do Backend (use a URL do seu backend criado anteriormente)
   VITE_API_URL=https://savemymoney-backend.onrender.com
   ```

5. **Criar Site**
   - Clique em "Create Static Site"
   - Aguarde o deploy (~3-5 minutos)

6. **Verificar Deploy**
   - Acesse a URL gerada (ex: `https://savemymoney-frontend.onrender.com`)
   - Você deve ver a página de login do SaveMyMoney

### 2. Atualizar CORS no Backend

1. **Voltar ao Backend Service**
   - Vá para "Environment"
   - Atualize as variáveis:
     ```env
     CLIENT_URL=https://savemymoney-frontend.onrender.com
     FRONTEND_URL=https://savemymoney-frontend.onrender.com
     ```

2. **Salvar e Redeploy**
   - Clique em "Save Changes"
   - O Render fará redeploy automaticamente

---

## 🔐 Configuração de Variáveis de Ambiente

### Resumo Completo das Variáveis

#### Backend (Web Service)

```env
# Ambiente
NODE_ENV=production
PORT=3001

# Banco de Dados
MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/savemymoney?retryWrites=true&w=majority

# Segurança - CRÍTICO
JWT_SECRET=sua_chave_jwt_super_secreta_min_32_chars
ENCRYPTION_KEY=sua_chave_de_criptografia_de_64_chars

# URLs Frontend (atualizar após criar frontend)
CLIENT_URL=https://savemymoney-frontend.onrender.com
FRONTEND_URL=https://savemymoney-frontend.onrender.com

# APIs Externas (opcional)
OPENAI_API_KEY=sk-proj-sua-chave-openai
SENTRY_DSN=https://sua-chave-sentry

# Redis (opcional - se usar)
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
```

#### Frontend (Static Site)

```env
VITE_API_URL=https://savemymoney-backend.onrender.com
```

---

## ✅ Testes Pós-Deploy

### 1. Testar Backend

```bash
# Teste de saúde (pode retornar 404, ok)
curl https://savemymoney-backend.onrender.com

# Teste de registro
curl -X POST https://savemymoney-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste User",
    "email": "teste@example.com",
    "password": "Senha123!"
  }'

# Deve retornar token e dados do usuário
```

### 2. Testar Frontend

1. Acesse: `https://savemymoney-frontend.onrender.com`
2. Tente fazer registro de um novo usuário
3. Faça login com o usuário criado
4. Crie uma transação de teste
5. Verifique se tudo funciona

### 3. Verificar Criptografia no Banco

1. Acesse MongoDB Atlas
2. Vá em "Database" → "Browse Collections"
3. Abra a collection `users`
   - ✅ Deve ter `emailHash` (não `email`)
4. Abra a collection `useridentities`
   - ✅ Deve ter `emailEncrypted` (string longa)
5. Abra a collection `transactions`
   - ✅ Deve ter `descriptionEncrypted` (string longa)

---

## 🔄 Migração de Dados (Opcional)

### Se Você Tinha Dados Antigos

⚠️ **ATENÇÃO**: Faça backup antes de migrar!

1. **Fazer Backup do MongoDB Atlas**
   ```bash
   mongodump --uri="sua_mongodb_uri" --out=backup_pre_security
   ```

2. **Executar Migração Localmente Primeiro**
   ```bash
   # Clone o repo
   git clone https://github.com/anibalssilva/SaveMyMoney-Secure.git
   cd SaveMyMoney-Secure/server

   # Instale dependências
   npm install

   # Configure .env com a mesma ENCRYPTION_KEY do Render
   cp .env.example .env
   # Edite .env com suas credenciais

   # Execute migração
   node scripts/migrateToSecure.js
   ```

3. **Verificar Migração**
   - Verifique se os dados foram criptografados corretamente
   - Teste login com usuários antigos
   - Verifique transações no banco

4. **Se Tudo OK**
   - Os dados já estão migrados no MongoDB Atlas
   - O Render pegará automaticamente os novos dados

---

## 🔧 Troubleshooting

### Problema 1: "Application failed to respond"

**Causa**: Backend não está iniciando

**Solução**:
1. Verifique os logs no Render Dashboard
2. Verifique se todas as variáveis de ambiente estão corretas
3. Verifique se `MONGO_URI` está acessível
4. Verifique se `ENCRYPTION_KEY` tem 32+ caracteres

### Problema 2: "ENCRYPTION_KEY must be at least 32 characters"

**Solução**:
```bash
# Gere nova chave
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Adicione no Render Environment Variables
ENCRYPTION_KEY=<chave_gerada>
```

### Problema 3: CORS Error no Frontend

**Causa**: Backend não permite requisições do frontend

**Solução**:
1. Verifique se `CLIENT_URL` e `FRONTEND_URL` estão corretos no backend
2. URL deve ser exatamente a mesma (com/sem barra final)
3. Redeploy do backend após alterar

### Problema 4: MongoDB Connection Failed

**Causa**: String de conexão inválida ou IP não permitido

**Solução**:
1. Verifique MongoDB Atlas → Network Access
2. Certifique-se que 0.0.0.0/0 está permitido
3. Verifique se username e password estão corretos
4. Teste connection string localmente:
   ```bash
   mongosh "sua_connection_string"
   ```

### Problema 5: Free Tier Sleeping

**Causa**: Render Free Tier dorme após 15 minutos de inatividade

**Soluções**:
1. **Aceitar o comportamento** (primeiro acesso leva ~30s para acordar)
2. **Usar Cron Job gratuito** para manter ativo:
   - [cron-job.org](https://cron-job.org)
   - Configurar ping a cada 10 minutos
   - URL: `https://savemymoney-backend.onrender.com/api/health`
3. **Upgrade para Paid Plan** ($7/mês)

### Problema 6: Build Failed

**Causa**: Dependências não instaladas ou erro de build

**Solução**:
1. Verifique logs no Render
2. Teste build localmente:
   ```bash
   cd server
   npm install
   npm start
   ```
3. Verifique se `package.json` está correto
4. Verifique se Node version é compatível (14+)

---

## 📊 Monitoramento e Manutenção

### 1. Logs no Render

- Acesse seu service no Render Dashboard
- Clique em "Logs"
- Veja logs em tempo real

### 2. Métricas

- CPU, Memory, Network usage disponíveis no dashboard
- Free tier tem limites:
  - 512 MB RAM
  - 0.1 CPU
  - 100 GB bandwidth/mês

### 3. Alertas

Configure alertas no Render para:
- Deploy failures
- Service crashes
- High memory usage

### 4. Backups MongoDB

Configure backups automáticos no MongoDB Atlas:
- Database → Backup
- Enable Cloud Backup
- Configure retention period

---

## 💰 Custos

### Free Tier (Grátis)

- ✅ Backend: Render Free Web Service
- ✅ Frontend: Render Free Static Site
- ✅ MongoDB: MongoDB Atlas M0 (Free)

**Limitações**:
- Backend dorme após 15min inatividade
- 512 MB RAM
- 100 GB bandwidth/mês
- MongoDB: 512 MB storage

### Paid Plans (Opcional)

- **Render Starter**: $7/mês (sem sleep, mais recursos)
- **MongoDB M2**: $9/mês (2 GB storage, backup)
- **Total**: ~$16/mês para produção

---

## 🔒 Checklist de Segurança Pós-Deploy

Após deploy, verifique:

- [ ] ENCRYPTION_KEY configurada e salva em local seguro
- [ ] JWT_SECRET configurado e forte (32+ caracteres)
- [ ] MongoDB Network Access configurado (0.0.0.0/0 ou IPs específicos)
- [ ] CORS configurado corretamente (CLIENT_URL)
- [ ] Senhas do MongoDB não estão no código (apenas em env vars)
- [ ] .env não foi commitado no Git
- [ ] Teste de registro funcionando
- [ ] Teste de login funcionando
- [ ] Dados criptografados no banco
- [ ] Backup do MongoDB configurado
- [ ] Logs de auditoria funcionando

---

## 🚀 Atualizações Futuras

### Como Atualizar o Código

1. **Faça alterações no código local**
2. **Commit e Push**
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   git push origin main
   ```
3. **Deploy Automático**
   - Render detecta mudanças automaticamente
   - Faz redeploy automático
   - Aguarde ~2-5 minutos

### Rollback em Caso de Erro

1. Acesse Render Dashboard
2. Clique em "Events"
3. Encontre deploy anterior funcional
4. Clique em "Rollback"

---

## 📞 Suporte

### Recursos Oficiais

- **Render Docs**: [https://render.com/docs](https://render.com/docs)
- **MongoDB Atlas Docs**: [https://docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- **GitHub Issues**: [https://github.com/anibalssilva/SaveMyMoney-Secure/issues](https://github.com/anibalssilva/SaveMyMoney-Secure/issues)

### Comunidade

- **Render Community**: [https://community.render.com](https://community.render.com)
- **MongoDB Community**: [https://community.mongodb.com](https://community.mongodb.com)

---

## ✅ Resumo Rápido

### Passo a Passo Simplificado

1. ✅ Criar conta no Render
2. ✅ Criar MongoDB Atlas (grátis)
3. ✅ Gerar ENCRYPTION_KEY: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
4. ✅ Criar Web Service (Backend) no Render
   - Root Directory: `server`
   - Build: `npm install`
   - Start: `npm start`
   - Env vars: MONGO_URI, JWT_SECRET, ENCRYPTION_KEY
5. ✅ Criar Static Site (Frontend) no Render
   - Root Directory: `client`
   - Build: `npm install && npm run build`
   - Publish: `dist`
   - Env var: VITE_API_URL
6. ✅ Atualizar CORS no backend (CLIENT_URL)
7. ✅ Testar aplicação
8. ✅ Configurar backups

**Pronto!** Sua aplicação está no ar! 🎉

---

**Guia criado por**: Claude (Anthropic AI)
**Data**: 2025-11-12
**Versão**: 1.0.0
**Status**: ✅ Pronto para Deploy
