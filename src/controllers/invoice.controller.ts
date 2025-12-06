// src/Innosys/controllers/invoice.controller.ts

import { Request, Response, NextFunction } from 'express';
import mongoose, { Document, Types } from 'mongoose';
import InvoiceModel from '../models/Invoice'; // Asegúrate de que esta ruta de importación sea correcta

// =================================================================
// INTERFAZ DEL DOCUMENTO DE FACTURA (ACTUALIZADA)
// =================================================================
interface IDetailItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface InvoiceDocument extends Document {
  _id: Types.ObjectId;
  transactionId: string;
  requesterId: string;
  requesterName: string;
  date: Date;
  total: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'MXN';
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  items: IDetailItem[];
  notes: string;
  // Campos para compatibilidad con el frontend si fuera necesario
  taxRate?: number;
  taxAmount?: number;
  
  // NUEVOS CAMPOS DE SEGURIDAD
  descargado?: boolean;
  ultimaDescarga?: Date;
}

// =================================================================
// OBTENER FACTURAS FILTRADAS POR requesterId Y STATUS = 'PAID'
// (Usado por InvoiceList.tsx)
// =================================================================
export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authenticatedRequesterId = req.query.requesterId as string | undefined;

    if (!authenticatedRequesterId) {
      return res.status(401).json({ success: false, message: 'Requester ID es obligatorio para cargar facturas.' });
    }

    const filter = {
      requesterId: authenticatedRequesterId, 
      status: 'PAID',
    };

    const invoices = (await InvoiceModel.find(filter)
      .select('transactionId requesterName date total currency status requesterId')
      .sort({ date: -1 })) as InvoiceDocument[];

    const formattedInvoices = invoices.map(invoice => ({
      id: invoice._id.toString(),
      transactionId: invoice.transactionId,
      requesterName: invoice.requesterName,
      date: invoice.date.toISOString().split('T')[0],
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      requesterId: invoice.requesterId,
    }));

    return res.status(200).json({ success: true, data: formattedInvoices });
  } catch (error) {
    next(error);
  }
};

// =================================================================
// OBTENER DETALLE COMPLETO DE UNA FACTURA POR ID (CON CONTROL DE DESCARGA ÚNICA)
// (Usado por InvoiceDetailPage.tsx)
// =================================================================
export const getInvoiceDetail = async (req: Request, res: Response, next: NextFunction) => {
  const { invoiceId } = req.params;
  const authenticatedRequesterId = req.query.requesterId as string | undefined;

  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    return res.status(400).json({ success: false, message: 'ID de factura inválido.' });
  }
  
  if (!authenticatedRequesterId) {
      return res.status(401).json({ success: false, message: 'Requester ID es obligatorio para acceder al detalle.' });
  }

  try {
    // 1. Buscar la factura aplicando el filtro de seguridad (owner + id)
    let invoice = (await InvoiceModel.findOne({
        _id: invoiceId,
        requesterId: authenticatedRequesterId // FILTRO DE SEGURIDAD CRÍTICO
    })) as InvoiceDocument | null;

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Factura no encontrada o acceso denegado.' });
    }
    
    // ====================================================
    // LÓGICA DE CONTROL DE DESCARGA ÚNICA
    // ====================================================
    
    // 2. VERIFICAR si la factura ya ha sido marcada como descargada
    if (invoice.descargado === true) {
        // BLOQUEAR: Devolvemos 403 Forbidden.
        console.warn(`Descarga bloqueada para Factura ID: ${invoiceId}. Ya ha sido descargada.`);
        return res.status(403).json({ 
            success: false, 
            message: 'Acceso denegado. Esta factura ya fue descargada anteriormente por seguridad.' 
        });
    }

    // 3. Si no ha sido descargada, la marcamos como descargada en la DB.
    // Usamos findByIdAndUpdate para una operación atómica y eficiente.
    invoice = await InvoiceModel.findByIdAndUpdate(
        invoiceId, 
        { 
            $set: { 
                descargado: true, 
                ultimaDescarga: new Date() 
            } 
        },
        { new: true } // Devuelve el documento actualizado
    ) as InvoiceDocument | null;

    if (!invoice) {
        return res.status(500).json({ success: false, message: 'Error interno al marcar la factura como descargada.' });
    }
    
    // ====================================================

    // 4. Simulación y formateo de datos
    const calculatedSubtotal = invoice.items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
    const taxRate = 0.16; 
    const taxAmount = (invoice.total - calculatedSubtotal) > 0 ? (invoice.total - calculatedSubtotal) : 0; 

    const formattedInvoice = {
      id: invoice._id.toString(),
      transactionId: invoice.transactionId,
      requesterId: invoice.requesterId,
      requesterName: invoice.requesterName,
      date: invoice.date.toISOString().split('T')[0],
      totalAmount: invoice.total, 
      taxRate: taxRate, 
      taxAmount: taxAmount,
      service: "Servicio General Contratado",
      items: invoice.items,
      notes: invoice.notes,
    };

    // 5. Devolvemos los datos (lo que permite al frontend generar el PDF)
    return res.status(200).json({ success: true, data: formattedInvoice });
  } catch (error) {
    next(error);
  }
};