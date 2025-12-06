import { Request, Response } from 'express';
import Device from '../../../models/device.model';

// device.controller.ts - Ya está bien, solo verifica que funcione
export const registrarDispositivo = async (req: Request, res: Response) => {
  try {
    const { userId, os, type } = req.body;
    const userAgent = req.body.userAgent || req.headers['user-agent'] || 'unknown';

    if (!userId || !os || !type) {
      return res.status(400).json({ message: 'Faltan datos requeridos' });
    }

    // Buscar por userId Y userAgent (clave para evitar duplicados)
    let dispositivo = await Device.findOne({ userId, userAgent });

    if (dispositivo) {
      // Ya existe → solo actualizar lastLogin
      dispositivo.lastLogin = new Date();
      dispositivo.os = os; // Actualizar también el OS por si cambió
      dispositivo.type = type;
      await dispositivo.save();

      return res.json({
        message: 'Dispositivo actualizado',
        dispositivo,
      });
    }

    // Crear uno nuevo solo si no existe
    dispositivo = new Device({
      userId,
      os,
      type,
      userAgent,
      lastLogin: new Date(),
    });

    await dispositivo.save();

    res.json({
      message: 'Dispositivo registrado',
      dispositivo,
    });
  } catch (err) {
    console.error('Error registrarDispositivo:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Obtener dispositivos de un usuario
export const obtenerDispositivos = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const dispositivos = await Device.find({ userId }).sort({ lastLogin: -1 });
    res.json(dispositivos);
  } catch (err) {
    console.error('Error obtenerDispositivos:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar todas las sesiones excepto la actual
export const eliminarTodasExceptoActual = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { except } = req.body;

    if (!userId) return res.status(400).json({ message: 'Falta userId' });

    await Device.deleteMany({
      userId,
      _id: { $ne: except },
    });

    res.json({
      message: 'Todas las sesiones eliminadas excepto la actual',
    });
  } catch (err) {
    console.error('Error eliminarTodasExceptoActual:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Eliminar un solo dispositivo
export const eliminarDispositivo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Device.findByIdAndDelete(id);

    res.json({ message: 'Dispositivo eliminado' });
  } catch (err) {
    console.error('Error eliminarDispositivo:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
