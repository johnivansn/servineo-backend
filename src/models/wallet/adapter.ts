import mongoose from 'mongoose';
import type { WalletModelAdapter, WalletSlice } from './adapter.types';
export * from './adapter.types';

// Si son 24 hex usa ObjectId; si no, deja string
function normalizeId(raw: string): mongoose.Types.ObjectId | string {
  const s = String(raw).trim();
  return /^[0-9a-fA-F]{24}$/.test(s) ? new mongoose.Types.ObjectId(s) : s;
}

function ensureDb() {
  if (!mongoose.connection.db) throw new Error('Database not connected');
  return mongoose.connection.db;
}

// Wallet embebido dentro de la colección de usuarios (campo wallet.*)
export function makeRawCollectionWalletAdapter(collectionName: string): WalletModelAdapter {
  interface RawWalletSubDoc {
    balance?: number;
    lowBalanceThreshold?: number;
    flags?: unknown;
    lastLowBalanceNotification?: Date | null;
  }
  interface RawWalletDoc {
    _id: mongoose.Types.ObjectId | string;
    wallet?: RawWalletSubDoc;
  }
  interface RawWalletUpdateSet {
    'wallet.updatedAt': Date;
    'wallet.balance'?: number;
    'wallet.lowBalanceThreshold'?: number;
    'wallet.flags'?: unknown;
    'wallet.lastLowBalanceNotification'?: Date | null;
  }
  return {
    async getWalletById(fixerId: string): Promise<WalletSlice | null> {
      const _id = normalizeId(fixerId);
      const db = ensureDb();
      const filter: Record<string, unknown> = { _id };
      const doc = await db.collection<RawWalletDoc>(collectionName).findOne(filter, {
        projection: {
          'wallet.balance': 1,
          'wallet.lowBalanceThreshold': 1,
          'wallet.flags': 1,
          'wallet.lastLowBalanceNotification': 1,
        },
      });
      if (!doc?.wallet) return null;
      return {
        balance: Number(doc.wallet.balance ?? 0),
        lowBalanceThreshold: Number(doc.wallet.lowBalanceThreshold ?? 0),
        flags: doc.wallet.flags ?? null,
        lastLowBalanceNotification: doc.wallet.lastLowBalanceNotification ?? null,
      };
    },
    async updateWalletById(fixerId: string, patch: Partial<WalletSlice>): Promise<void> {
      const _id = normalizeId(fixerId);
      const db = ensureDb();
      const filter: Record<string, unknown> = { _id };
      const $set: RawWalletUpdateSet = { 'wallet.updatedAt': new Date() };
      if (patch.balance !== undefined) $set['wallet.balance'] = patch.balance;
      if (patch.lowBalanceThreshold !== undefined)
        $set['wallet.lowBalanceThreshold'] = patch.lowBalanceThreshold;
      if (patch.flags !== undefined) $set['wallet.flags'] = patch.flags;
      if (patch.lastLowBalanceNotification !== undefined)
        $set['wallet.lastLowBalanceNotification'] = patch.lastLowBalanceNotification;
      await db.collection(collectionName).updateOne(filter, { $set });
    },
  };
}
