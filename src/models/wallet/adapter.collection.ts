import mongoose from 'mongoose';
import type { WalletModelAdapter, WalletSlice } from './adapter.types';

function ensureDb() {
  if (!mongoose.connection.db) throw new Error('Database not connected');
  return mongoose.connection.db;
}

function toQueryForId(id: string) {
  const asObjId = /^[0-9a-fA-F]{24}$/.test(String(id))
    ? new mongoose.Types.ObjectId(String(id))
    : String(id);
  if (process.env.WALLET_USER_ID_IS_OBJECTID === 'true') return asObjId;
  return { $in: [String(id), asObjId] }; // soporta ambas representaciones
}

// Wallet en colección separada (balance, flags, etc. como campos directos)
export function makeWalletCollectionByUserIdAdapter(
  collectionName: string,
  idField: string = 'users_id',
): WalletModelAdapter {
  interface WalletSeparateDoc {
    balance?: number;
    lowBalanceThreshold?: number;
    flags?: unknown;
    lastLowBalanceNotification?: Date | null;
    [key: string]: unknown; // soporta campos dinámicos
  }
  interface WalletUpdateSet {
    updatedAt: Date;
    balance?: number;
    lowBalanceThreshold?: number;
    flags?: unknown;
    lastLowBalanceNotification?: Date | null;
  }
  return {
    async getWalletById(fixerId: string): Promise<WalletSlice | null> {
      const db = ensureDb();
      const query: Record<string, unknown> = { [idField]: toQueryForId(fixerId) };
      const doc = await db.collection<WalletSeparateDoc>(collectionName).findOne(query, {
        projection: { balance: 1, lowBalanceThreshold: 1, flags: 1, lastLowBalanceNotification: 1 },
      });
      if (!doc) return null;
      return {
        balance: Number(doc.balance ?? 0),
        lowBalanceThreshold: Number(doc.lowBalanceThreshold ?? 0),
        flags: doc.flags ?? null,
        lastLowBalanceNotification: doc.lastLowBalanceNotification ?? null,
      };
    },
    async updateWalletById(fixerId: string, patch: Partial<WalletSlice>): Promise<void> {
      const db = ensureDb();
      const query: Record<string, unknown> = { [idField]: toQueryForId(fixerId) };
      const $set: WalletUpdateSet = { updatedAt: new Date() };
      if (patch.balance !== undefined) $set.balance = patch.balance;
      if (patch.lowBalanceThreshold !== undefined)
        $set.lowBalanceThreshold = patch.lowBalanceThreshold;
      if (patch.flags !== undefined) $set.flags = patch.flags;
      if (patch.lastLowBalanceNotification !== undefined)
        $set.lastLowBalanceNotification = patch.lastLowBalanceNotification;
      const $setOnInsert: Record<string, unknown> = { createdAt: new Date() };
      $setOnInsert[idField] =
        process.env.WALLET_USER_ID_IS_OBJECTID === 'true'
          ? new mongoose.Types.ObjectId(String(fixerId))
          : String(fixerId);
      await db
        .collection(collectionName)
        .updateOne(query, { $set, $setOnInsert }, { upsert: true });
    },
  };
}
