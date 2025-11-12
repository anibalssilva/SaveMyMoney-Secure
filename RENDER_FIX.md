# 🔧 Correção de Problemas no Deploy do Render

## ❌ Erro Atual

Você está enfrentando:
```
==> Application exited early
==> No open ports detected
```

## 🎯 Causa do Problema

1. **Variáveis de Ambiente Faltando**: O backend não pode iniciar sem `MONGO_URI` e `ENCRYPTION_KEY`
2. **Configuração incorreta**: O render.yaml estava desatualizado

## ✅ Solução - Configuração Manual no Dashboard do Render

### Passo 1: Deletar os Services Existentes

1. Acesse o [Render Dashboard](https://dashboard.render.com)
2. Delete os services `savemymoney-backend` e `savemymoney-frontend` (se existirem)

### Passo 2: Criar MongoDB Atlas (Grátis)

1. Acesse [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Crie um cluster M0 (grátis)
3. Configure:
   - **Database Access**: Crie um usuário com senha
   - **Network Access**: Adicione IP `0.0.0.0/0` (qualquer IP)
4. Obtenha a connection string:
   ```
   mongodb+srv://usuario:senha@cluster.mongodb.net/savemymoney?retryWrites=true&w=majority
   ```

### Passo 3: Gerar Chaves de Segurança

Execute localmente:

```bash
# Gerar ENCRYPTION_KEY (64 caracteres)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Gerar JWT_SECRET (base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**IMPORTANTE**: Salve essas chaves em um local seguro!

### Passo 4: Criar Backend no Render

1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em **"New +" → "Web Service"**
3. Conecte o repositório `SaveMyMoney-Secure`
4. Configure:

   **Configurações Básicas**:
   - **Name**: `savemymoney-backend`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

   **Environment Variables** (clique em "Advanced"):

   ```env
   NODE_ENV=production
   PORT=3001

   # Cole sua connection string do MongoDB Atlas
   MONGO_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/savemymoney?retryWrites=true&w=majority

   # Cole a chave gerada anteriormente
   JWT_SECRET=sua_chave_jwt_gerada_em_base64

   # Cole a chave gerada anteriormente (CRÍTICO!)
   ENCRYPTION_KEY=sua_chave_de_64_caracteres_gerada

   # Deixe vazios por enquanto (vamos preencher depois do frontend)
   CLIENT_URL=
   FRONTEND_URL=

   # Opcional (se você tem)
   OPENAI_API_KEY=sk-proj-sua-chave-openai
   SENTRY_DSN=
   ```

5. Clique em **"Create Web Service"**
6. Aguarde o deploy (~5 minutos)
7. **Copie a URL gerada** (ex: `https://savemymoney-backend.onrender.com`)

### Passo 5: Criar Frontend no Render

1. Clique em **"New +" → "Static Site"**
2. Conecte o repositório `SaveMyMoney-Secure`
3. Configure:

   **Configurações Básicas**:
   - **Name**: `savemymoney-frontend`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

   **Environment Variables**:

   ```env
   # Cole a URL do backend criado no passo anterior
   VITE_API_URL=https://savemymoney-backend.onrender.com
   ```

4. Clique em **"Create Static Site"**
5. Aguarde o deploy (~3 minutos)
6. **Copie a URL gerada** (ex: `https://savemymoney-frontend.onrender.com`)

### Passo 6: Atualizar CORS no Backend

1. Volte para o service `savemymoney-backend`
2. Vá em **"Environment"**
3. Adicione/atualize as variáveis:

   ```env
   CLIENT_URL=https://savemymoney-frontend.onrender.com
   FRONTEND_URL=https://savemymoney-frontend.onrender.com
   ```

4. Clique em **"Save Changes"**
5. O Render fará redeploy automaticamente

### Passo 7: Testar

1. Acesse `https://savemymoney-frontend.onrender.com`
2. Tente fazer registro de um novo usuário
3. Faça login
4. Crie uma transação de teste

## 🔍 Verificar se Funcionou

### Backend

Teste a URL do backend:
```bash
curl https://savemymoney-backend.onrender.com/api/auth/login
```

Deve retornar erro de validação (significa que está funcionando):
```json
{
  "success": false,
  "error": "Por favor, insira um email válido"
}
```

### Frontend

1. Abra o DevTools do navegador (F12)
2. Vá na aba "Network"
3. Tente fazer login
4. Veja se as requisições estão indo para o backend correto

## ❌ Se Ainda Não Funcionar

### Backend não inicia

**Logs para verificar**:
```
ENCRYPTION_KEY must be at least 32 characters
```

**Solução**: A `ENCRYPTION_KEY` deve ter exatamente 64 caracteres hexadecimais.

**Logs para verificar**:
```
MongoDB connection failed
```

**Solução**: Verifique se a connection string do MongoDB está correta e se o IP `0.0.0.0/0` está liberado.

### CORS Error no Frontend

**Erro no navegador**:
```
Access to fetch at 'https://backend...' from origin 'https://frontend...' has been blocked by CORS
```

**Solução**: Verifique se `CLIENT_URL` e `FRONTEND_URL` estão corretos no backend (devem ter a URL EXATA do frontend).

### Frontend não carrega o backend

**Erro no DevTools**:
```
GET https://localhost:3001/api/... net::ERR_CONNECTION_REFUSED
```

**Solução**: A variável `VITE_API_URL` no frontend está incorreta. Deve ser a URL do Render, não localhost.

## 📋 Checklist Final

Antes de considerar pronto:

- [ ] MongoDB Atlas configurado com IP `0.0.0.0/0`
- [ ] `ENCRYPTION_KEY` tem 64 caracteres hexadecimais
- [ ] `JWT_SECRET` configurado
- [ ] `MONGO_URI` aponta para o MongoDB Atlas
- [ ] Backend deploy sem erros
- [ ] Frontend deploy sem erros
- [ ] `VITE_API_URL` aponta para o backend Render
- [ ] `CLIENT_URL` e `FRONTEND_URL` apontam para o frontend Render
- [ ] Teste de registro funciona
- [ ] Teste de login funciona
- [ ] Não há erros de CORS

## 🆘 Suporte

Se ainda tiver problemas:

1. Verifique os **Logs** no Render Dashboard
2. Teste as variáveis de ambiente localmente primeiro
3. Abra um issue no GitHub com os logs de erro

---

**Atualizado**: 2025-11-12
**Versão**: 1.0
