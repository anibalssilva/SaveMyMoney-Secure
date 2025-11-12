# 🔒 SaveMyMoney - Secure Edition

Este é o repositório **SaveMyMoney-Secure**, criado especificamente para implementar funcionalidades de segurança avançadas sem afetar o repositório original.

## 📁 Estrutura

```
/c/
├── SaveMyMoney/           ← Repositório ORIGINAL (preservado, não modificar)
└── SaveMyMoney-Secure/    ← Repositório NOVO (implementações de segurança)
```

## 🎯 Objetivos

Implementar neste repositório:

1. **Multi-Tenancy Seguro**
   - Isolamento robusto de dados entre usuários
   - Middleware de tenant isolation em todas as queries

2. **Criptografia de Dados Sensíveis**
   - AES-256-GCM para campos identificáveis
   - Chaves únicas derivadas por usuário

3. **Pseudoanonimização**
   - Separação de dados de identidade
   - UUID público como identificador
   - Email/nome criptografados

4. **Auditoria**
   - Logs imutáveis de operações sensíveis
   - Alertas de anomalias

## 📋 Status do Projeto

- ✅ **Backup criado:** Repositório original preservado
- ✅ **Novo repositório:** Inicializado com git
- ✅ **Commit base:** `2e96541` - Base limpa antes das modificações
- ✅ **Documentação:** `SECURITY_IMPLEMENTATION_PLAN.md` criado (19KB)

## 📚 Documentação Principal

Leia o documento completo em:
📄 **[SECURITY_IMPLEMENTATION_PLAN.md](./SECURITY_IMPLEMENTATION_PLAN.md)**

Este documento contém:
- Arquitetura detalhada
- Plano de implementação completo
- Especificações técnicas
- Checklist de tarefas
- Guias de migração
- Referências e glossário

## 🚀 Próximos Passos

Antes de começar a implementação, defina:

1. **Nível de segurança:**
   - Máximo (tudo criptografado)
   - Alto (textos criptografados, valores em claro) ← **RECOMENDADO**
   - Médio (apenas tenant isolation)

2. **Modo de implementação:**
   - Tudo de uma vez
   - Por etapas (gradual)

3. **Migração de dados:**
   - Sim (existem dados em produção)
   - Não (projeto novo)

## ⚠️ IMPORTANTE

- **NÃO** faça modificações no repositório `SaveMyMoney` original
- **TODAS** as implementações de segurança devem ser feitas em `SaveMyMoney-Secure`
- Mantenha o `.env` com `MASTER_ENCRYPTION_KEY` **FORA do git** (já está no .gitignore)
- Faça commits frequentes durante a implementação

## 📊 Estrutura do Projeto

Este repositório mantém a estrutura completa do SaveMyMoney:

```
SaveMyMoney-Secure/
├── client/              # Frontend React
├── server/              # Backend Node.js + Express
├── ml-api/              # API Python FastAPI (ML)
├── streamlit_app/       # Dashboard Streamlit
├── docker-compose.yml
└── SECURITY_IMPLEMENTATION_PLAN.md  # 📄 LEI ISTO PRIMEIRO!
```

## 🛠️ Desenvolvimento

### Instalar dependências

```bash
# Backend
cd server && npm install

# Frontend
cd client && npm install

# ML API
cd ml-api && pip install -r requirements.txt

# Streamlit
cd streamlit_app && pip install -r requirements.txt
```

### Executar (desenvolvimento)

```bash
# Opção 1: Todos os serviços com Docker
docker-compose up

# Opção 2: Manualmente
npm run dev  # Da raiz (executa todos em paralelo)
```

## 📞 Contato

Para dúvidas sobre a implementação de segurança, consulte:
- `SECURITY_IMPLEMENTATION_PLAN.md` (documentação completa)
- Arquitetura original: `MICROSERVICES_ARCHITECTURE.md`
- Guia de início: `COMECE_AQUI.md`

---

**Data de criação:** 12/11/2025
**Commit base:** `2e96541`
**Branch:** `main`
**Status:** ✅ Pronto para implementação de segurança
