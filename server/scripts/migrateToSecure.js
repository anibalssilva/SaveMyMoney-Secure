/**
 * Script de Migração de Dados para Modelo Seguro
 *
 * ATENÇÃO: Este script deve ser executado UMA ÚNICA VEZ
 * Ele migra dados do modelo antigo para o novo modelo com criptografia
 *
 * Uso:
 *   node scripts/migrateToSecure.js
 *
 * IMPORTANTE:
 * 1. Faça backup do banco de dados ANTES de executar
 * 2. Configure ENCRYPTION_KEY no .env ANTES de executar
 * 3. Execute em ambiente de desenvolvimento primeiro
 */

require('dotenv').config();
const mongoose = require('mongoose');
const encryptionService = require('../services/encryptionService');
const logger = require('../config/logger');

// Conectar ao MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ MongoDB Connected');
  } catch (err) {
    console.error('✗ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

// Definir schemas antigos
const OldUserSchema = new mongoose.Schema({}, { strict: false });
const OldTransactionSchema = new mongoose.Schema({}, { strict: false });
const OldBudgetSchema = new mongoose.Schema({}, { strict: false });
const OldPortfolioSchema = new mongoose.Schema({}, { strict: false });
const OldAssetSchema = new mongoose.Schema({}, { strict: false });

const OldUser = mongoose.model('OldUser', OldUserSchema, 'users');
const OldTransaction = mongoose.model('OldTransaction', OldTransactionSchema, 'transactions');
const OldBudget = mongoose.model('OldBudget', OldBudgetSchema, 'budgets');
const OldPortfolio = mongoose.model('OldPortfolio', OldPortfolioSchema, 'portfolios');
const OldAsset = mongoose.model('OldAsset', OldAssetSchema, 'assets');

// Importar novos modelos
const User = require('../models/User');
const UserIdentity = require('../models/UserIdentity');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Portfolio = require('../models/Portfolio');
const Asset = require('../models/Asset');

/**
 * Migrar Usuários
 */
async function migrateUsers() {
  console.log('\n📦 Migrando Usuários...');

  try {
    const oldUsers = await OldUser.find({});
    console.log(`   Encontrados ${oldUsers.length} usuários`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const oldUser of oldUsers) {
      try {
        // Verificar se já migrado
        const emailHash = encryptionService.hash(oldUser.email?.toLowerCase() || '');
        const existingUser = await User.findOne({ emailHash });

        if (existingUser) {
          console.log(`   ⊙ Usuário já migrado: ${oldUser.email}`);
          skipped++;
          continue;
        }

        // Criar novo User
        const newUser = new User({
          _id: oldUser._id, // Manter mesmo ID
          emailHash,
          password: oldUser.password, // Já está hasheado
          tenantId: oldUser._id,
          twoFactorEnabled: oldUser.twoFactorEnabled || false,
          twoFactorSecret: oldUser.twoFactorSecret || null,
          backupCodes: oldUser.backupCodes || [],
          lastLogin: oldUser.lastLogin || null,
          failedLoginAttempts: oldUser.failedLoginAttempts || 0,
          accountLockedUntil: oldUser.accountLockedUntil || null,
          createdAt: oldUser.date || oldUser.createdAt || new Date(),
          updatedAt: new Date()
        });

        await newUser.save();

        // Criar UserIdentity
        const emailEncrypted = encryptionService.encrypt(oldUser.email?.toLowerCase() || '');
        const nameEncrypted = encryptionService.encrypt(oldUser.name || 'Usuário');
        const emailMasked = encryptionService.maskEmail(oldUser.email || '');

        const userIdentity = new UserIdentity({
          userId: oldUser._id,
          emailEncrypted,
          emailHash,
          nameEncrypted,
          emailMasked
        });

        await userIdentity.save();

        console.log(`   ✓ Migrado: ${emailMasked}`);
        migrated++;
      } catch (err) {
        console.error(`   ✗ Erro ao migrar ${oldUser.email}:`, err.message);
        errors++;
      }
    }

    console.log(`\n   Resumo: ${migrated} migrados, ${skipped} ignorados, ${errors} erros`);
  } catch (err) {
    console.error('   ✗ Erro na migração de usuários:', err);
  }
}

/**
 * Migrar Transações
 */
async function migrateTransactions() {
  console.log('\n💰 Migrando Transações...');

  try {
    const oldTransactions = await OldTransaction.find({});
    console.log(`   Encontradas ${oldTransactions.length} transações`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const oldTx of oldTransactions) {
      try {
        // Verificar se já migrado
        const existing = await Transaction.findById(oldTx._id);
        if (existing) {
          skipped++;
          continue;
        }

        // Criptografar descrição e notas
        const descriptionEncrypted = encryptionService.encrypt(oldTx.description || 'Sem descrição');
        const notesEncrypted = oldTx.notes ? encryptionService.encrypt(oldTx.notes) : null;

        const newTx = new Transaction({
          _id: oldTx._id,
          userId: oldTx.user,
          descriptionEncrypted,
          amount: oldTx.amount,
          date: oldTx.date || new Date(),
          category: oldTx.category,
          subcategoryId: oldTx.subcategoryId,
          subcategory: oldTx.subcategory,
          type: oldTx.type,
          notesEncrypted,
          paymentMethod: oldTx.paymentMethod || '',
          createdAt: oldTx.createdAt || oldTx.date || new Date(),
          updatedAt: new Date()
        });

        await newTx.save();
        migrated++;
      } catch (err) {
        console.error(`   ✗ Erro ao migrar transação ${oldTx._id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n   Resumo: ${migrated} migradas, ${skipped} ignoradas, ${errors} erros`);
  } catch (err) {
    console.error('   ✗ Erro na migração de transações:', err);
  }
}

/**
 * Migrar Orçamentos
 */
async function migrateBudgets() {
  console.log('\n📊 Migrando Orçamentos...');

  try {
    const oldBudgets = await OldBudget.find({});
    console.log(`   Encontrados ${oldBudgets.length} orçamentos`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const oldBudget of oldBudgets) {
      try {
        const existing = await Budget.findById(oldBudget._id);
        if (existing) {
          skipped++;
          continue;
        }

        const newBudget = new Budget({
          _id: oldBudget._id,
          userId: oldBudget.user,
          category: oldBudget.category,
          limit: oldBudget.limit,
          warningThreshold: oldBudget.warningThreshold || 80,
          alertEnabled: oldBudget.alertEnabled !== false,
          period: oldBudget.period || 'monthly',
          createdAt: oldBudget.createdAt || new Date(),
          updatedAt: oldBudget.updatedAt || new Date()
        });

        await newBudget.save();
        migrated++;
      } catch (err) {
        console.error(`   ✗ Erro ao migrar orçamento ${oldBudget._id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n   Resumo: ${migrated} migrados, ${skipped} ignorados, ${errors} erros`);
  } catch (err) {
    console.error('   ✗ Erro na migração de orçamentos:', err);
  }
}

/**
 * Migrar Portfolios
 */
async function migratePortfolios() {
  console.log('\n💼 Migrando Portfolios...');

  try {
    const oldPortfolios = await OldPortfolio.find({});
    console.log(`   Encontrados ${oldPortfolios.length} portfolios`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const oldPortfolio of oldPortfolios) {
      try {
        const existing = await Portfolio.findById(oldPortfolio._id);
        if (existing) {
          skipped++;
          continue;
        }

        const nameEncrypted = encryptionService.encrypt(oldPortfolio.name || 'Minha Carteira');
        const descriptionEncrypted = oldPortfolio.description ?
          encryptionService.encrypt(oldPortfolio.description) : null;

        const newPortfolio = new Portfolio({
          _id: oldPortfolio._id,
          userId: oldPortfolio.user,
          nameEncrypted,
          descriptionEncrypted,
          assets: oldPortfolio.assets || [],
          totalInvested: oldPortfolio.totalInvested || 0,
          currentValue: oldPortfolio.currentValue || 0,
          totalReturn: oldPortfolio.totalReturn || 0,
          totalReturnPercent: oldPortfolio.totalReturnPercent || 0,
          lastUpdated: oldPortfolio.lastUpdated || new Date(),
          isActive: oldPortfolio.isActive !== false
        });

        await newPortfolio.save();
        migrated++;
      } catch (err) {
        console.error(`   ✗ Erro ao migrar portfolio ${oldPortfolio._id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n   Resumo: ${migrated} migrados, ${skipped} ignorados, ${errors} erros`);
  } catch (err) {
    console.error('   ✗ Erro na migração de portfolios:', err);
  }
}

/**
 * Migrar Assets
 */
async function migrateAssets() {
  console.log('\n📈 Migrando Assets...');

  try {
    const oldAssets = await OldAsset.find({});
    console.log(`   Encontrados ${oldAssets.length} assets`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const oldAsset of oldAssets) {
      try {
        const existing = await Asset.findById(oldAsset._id);
        if (existing) {
          skipped++;
          continue;
        }

        const notesEncrypted = oldAsset.notes ?
          encryptionService.encrypt(oldAsset.notes) : null;

        const newAsset = new Asset({
          _id: oldAsset._id,
          userId: oldAsset.user,
          portfolio: oldAsset.portfolio,
          symbol: oldAsset.symbol,
          name: oldAsset.name,
          type: oldAsset.type,
          quantity: oldAsset.quantity,
          averagePrice: oldAsset.averagePrice,
          totalInvested: oldAsset.totalInvested,
          currentPrice: oldAsset.currentPrice || 0,
          currentValue: oldAsset.currentValue || 0,
          totalReturn: oldAsset.totalReturn || 0,
          totalReturnPercent: oldAsset.totalReturnPercent || 0,
          dayChange: oldAsset.dayChange || 0,
          dayChangePercent: oldAsset.dayChangePercent || 0,
          currency: oldAsset.currency || 'BRL',
          notesEncrypted,
          transactions: oldAsset.transactions || [],
          lastPriceUpdate: oldAsset.lastPriceUpdate || null,
          isActive: oldAsset.isActive !== false
        });

        await newAsset.save();
        migrated++;
      } catch (err) {
        console.error(`   ✗ Erro ao migrar asset ${oldAsset._id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n   Resumo: ${migrated} migrados, ${skipped} ignorados, ${errors} erros`);
  } catch (err) {
    console.error('   ✗ Erro na migração de assets:', err);
  }
}

/**
 * Main
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  MIGRAÇÃO DE DADOS PARA MODELO SEGURO                  ║');
  console.log('║  SaveMyMoney - Security Implementation                 ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Verificações de segurança
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
    console.error('\n✗ ERRO: ENCRYPTION_KEY não configurada ou muito curta!');
    console.error('  Configure uma chave de pelo menos 32 caracteres no .env');
    console.error('  Gere uma: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }

  console.log('\n⚠️  ATENÇÃO: Esta migração é IRREVERSÍVEL!');
  console.log('   Certifique-se de ter um backup do banco de dados.');
  console.log('\n   Pressione Ctrl+C para cancelar...');
  console.log('   A migração iniciará em 5 segundos...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  await connectDB();

  console.log('\n🚀 Iniciando migração...\n');

  await migrateUsers();
  await migrateTransactions();
  await migrateBudgets();
  await migratePortfolios();
  await migrateAssets();

  console.log('\n✅ Migração concluída!\n');
  console.log('   Próximos passos:');
  console.log('   1. Verifique os dados no banco de dados');
  console.log('   2. Teste o login e acesso aos dados');
  console.log('   3. Se tudo estiver OK, remova as collections antigas');
  console.log('');

  process.exit(0);
}

// Executar
main().catch(err => {
  console.error('\n✗ Erro fatal na migração:', err);
  process.exit(1);
});
