import { Request, Response } from 'express';
import {
  guardarTelefonoUsuario,
  verificarTelefonoDuplicado,
} from '../../../services/userManagement/telefono.service';

export const registrarTelefono = async (req: Request, res: Response) => {
  const { telefono } = req.body;
  const user = (req as any).user;

  console.log('📱 Datos recibidos:', { telefono, userEmail: user?.email });

  if (!telefono) {
    console.log('❌ Falta el teléfono');
    return res.status(400).json({ error: 'Falta el número de teléfono' });
  }

  if (!user || !user.email) {
    console.log('❌ Usuario no autorizado');
    return res.status(401).json({ error: 'Usuario no autorizado' });
  }

  try {
    // Verificar si el teléfono ya existe
    const telefonoExiste = await verificarTelefonoDuplicado(telefono, user.email);

    if (telefonoExiste) {
      console.log('⚠️ Teléfono duplicado:', telefono);
      return res.status(409).json({
        error: 'El número ya está registrado, use otro',
      });
    }

    console.log('🔄 Guardando teléfono...');
    await guardarTelefonoUsuario(user.email, telefono);
    console.log('✅ Teléfono guardado exitosamente');

    return res.json({
      success: true,
      message: 'Teléfono registrado correctamente',
      telefono,
    });
  } catch (error) {
    console.error('❌ Error guardando teléfono:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    });
  }
};
