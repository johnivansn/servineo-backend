// src/models/WalletNotification.model.ts
import { Schema, model, models, InferSchemaType } from "mongoose";

const WalletNotificationSchema = new Schema(
  {
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    fixerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    type: {
      type: String,
      enum: ["LOW_BALANCE"],
      required: true,
      default: "LOW_BALANCE",
    },

    // Texto que mostraremos tanto en email/push como en el toast
    title: { type: String, required: true },
    message: { type: String, required: true },

    // Para la HU: enviada | leída | acción tomada
    status: {
      type: String,
      enum: ["sent", "read", "action_taken"],
      default: "sent",
      index: true,
    },

    // 1ª, 2ª, 3ª notificación
    reminderIndex: { type: Number, default: 1 },

    // Canales usados (por ahora "system" y "email" como mínimos)
    channels: [{ type: String, enum: ["system", "email", "push"] }],

    // Para controlar “máximo 3 notificaciones en 7 días”
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // Para programar recordatorios 24h / 48h
    scheduledFor: { type: Date },   // cuándo debería enviarse este recordatorio
    sentAt: { type: Date },         // cuándo realmente se envió
    readAt: { type: Date },
    actionTakenAt: { type: Date },

    // Datos extra útiles en el front
    currentBalance: { type: Number, required: true },
    recommendedTopUp: { type: Number, default: 50 },
  },
  {
    collection: "wallet_notifications",
    timestamps: true,
  }
);

export type WalletNotification = InferSchemaType<typeof WalletNotificationSchema>;
export default models.WalletNotification ||
  model("WalletNotification", WalletNotificationSchema);
