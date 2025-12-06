import { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { consultarUltimoCambioService } from '../../../services/userManagement/ultimoCambio.service';

const JWT_SECRET = process.env.JWT_SECRET || 'servineosecretkey';

interface TokenPayload extends JwtPayload {
  id: string;
}

export const consultarUltimoCambio = async (req: Request, res: Response) => {
  try {
    // 🔐 Verificar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token requerido',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado - Token inválido',
      });
    }

    // 🔍 Decodificar token y obtener ID del usuario
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    const userId = decoded.id;

    const resultado = await consultarUltimoCambioService(userId);

    res.status(200).json(resultado);
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
      });
    }

    console.error('Error en consultarUltimoCambio:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al consultar última modificación',
    });
  }
};
