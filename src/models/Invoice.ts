// src/Innosys/models/Invoice.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

// Detalle de ítem
interface IDetailItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// Documento completo de Factura (ACTUALIZADO)
export interface IInvoice extends Document {
  transactionId: string;
  requesterId: string;
  requesterName: string;
  date: Date;
  total: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'MXN';
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  items: IDetailItem[];
  notes: string;
  // 🔑 CAMPOS DE SEGURIDAD AGREGADOS
  descargado: boolean;
  ultimaDescarga?: Date; // Opcional ya que el valor por defecto es null/undefined
}

// Esquema de ítems
const DetailItemSchema = new Schema<IDetailItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true }
}, { _id: false });

// Esquema principal (ACTUALIZADO)
const InvoiceSchema = new Schema<IInvoice>({
  transactionId: { type: String, required: true, unique: true, trim: true },
  requesterId: { type: String, required: true, index: true },
  requesterName: { type: String, required: true, trim: true },
  date: { type: Date, default: Date.now },
  total: { type: Number, required: true },
  currency: { type: String, enum: ['USD','EUR','GBP','MXN'], default: 'USD' },
  status: { type: String, enum: ['PENDING','PAID','CANCELLED'], default: 'PENDING', index: true },
  items: [DetailItemSchema],
  notes: { type: String, trim: true, default: '' },
  
  // DEFINICIÓN DE CAMPOS DE SEGURIDAD
  descargado: { type: Boolean, default: false },
  ultimaDescarga: { type: Date } // Mongoose maneja bien el default como null si no se especifica
}, { timestamps: true, collection: 'payments' });

// Exportar modelo, reutilizando si ya existe
const InvoiceModel: Model<IInvoice> = mongoose.models.Invoice
  ? (mongoose.models.Invoice as Model<IInvoice>)
  : mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default InvoiceModel;