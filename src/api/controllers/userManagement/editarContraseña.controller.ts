import { Request, Response } from 'express';
import { cambiarContrasenaService } from '../../../services/userManagement/editarContraseña.service';

export const cambiarContrasena = async (req: Request, res: Response) => {
  try {
    // 🔐 Verificar token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token requerido',
        forceLogout: false,
      });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // ✅ VALIDACIONES BÁSICAS (antes de contar intentos fallidos)
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son obligatorios',
        forceLogout: false,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Las contraseñas no coinciden',
        forceLogout: false,
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña debe tener al menos 8 caracteres',
        forceLogout: false,
      });
    }

    // 🔒 LLAMAR AL SERVICE (aquí se maneja el bloqueo)
    const resultado = await cambiarContrasenaService(token, {
      currentPassword,
      newPassword,
    });

    // 🚪 Si requiere logout forzado (bloqueo por intentos)
    if (resultado.forceLogout) {
      return res.status(423).json(resultado); // 423 = Locked
    }

    // ✅ Respuesta normal
    res.status(resultado.success ? 200 : 400).json(resultado);
  } catch (error: any) {
    console.error('Error en cambiarContrasena:', error);

    // 🔍 Manejo específico para contraseña incorrecta
    if (error.code === 'CURRENT_PASSWORD_INVALID') {
      return res.status(400).json({
        success: false,
        error: 'CURRENT_PASSWORD_INVALID',
        message: 'La contraseña actual es incorrecta',
        forceLogout: false,
      });
    }

    // 🔧 Error genérico
    res.status(500).json({
      success: false,
      message: error.message || 'Error al cambiar contraseña',
      forceLogout: false,
    });
  }
};
