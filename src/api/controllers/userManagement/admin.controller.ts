import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../config/db/mongoClient';
import bcrypt from 'bcryptjs';
import { generarToken } from '../../../utils/generadorToken';
import { OAuth2Client } from 'google-auth-library';

// Configuración Google
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export const loginAdministrador = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Faltan datos (email o contraseña)',
    });
  }

  try {
    const db = await connectDB();
    const usersCollection = db.collection('users');

    // Buscar usuario por email dentro de authProviders
    const user = await usersCollection.findOne({
      'authProviders.provider': 'email',
      'authProviders.providerId': email,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o sin método de correo vinculado',
      });
    }

    // 🔥 Validar que sea admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos de administrador',
      });
    }

    const emailProvider = user.authProviders.find(
      (p: any) => p.provider === 'email' && p.providerId === email,
    );

    if (!emailProvider || !emailProvider.password) {
      return res.status(400).json({
        success: false,
        message: 'El método de correo no tiene contraseña registrada',
      });
    }

    // Comparar contraseña
    const passwordMatch = await bcrypt.compare(password, emailProvider.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Contraseña incorrecta',
      });
    }

    const userPicture = user.url_photo || null;

    // Generar token con la misma función del proyecto
    const sessionToken = generarToken(
      user._id.toString(),
      user.name || 'Administrador',
      email,
      userPicture,
    );

    return res.json({
      success: true,
      message: 'Inicio de sesión de administrador exitoso',
      token: sessionToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email,
        picture: userPicture,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error al iniciar sesión de administrador:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

// Login con Google
export const loginAdminWithGoogle = async (req: Request, res: Response) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({
      success: false,
      message: 'No se recibió el token de Google',
    });
  }

  if (!googleClient) {
    return res.status(500).json({
      success: false,
      message: 'Google login no configurado',
    });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo verificar el correo de Google',
      });
    }

    const db = await connectDB();

    // Buscar ADMIN por email
    const user = await db.collection('users').findOne({
      email: payload.email,
      role: 'admin',
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Admin no encontrado. Solo admins pueden usar Google Login.',
      });
    }

    const sessionToken = generarToken(
      user._id.toString(),
      user.name || 'Administrador',
      user.email,
      user.url_photo || null,
    );

    return res.json({
      success: true,
      message: 'Google login exitoso',
      token: sessionToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        picture: user.url_photo,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en login con Google',
    });
  }
};

// Verificar Token
export const verifyAdminToken = async (req: Request, res: Response) => {
  try {
    const decoded = (req as any).user;

    const db = await connectDB();
    const user = await db.collection('users').findOne({
      _id: new ObjectId(decoded.id),
      role: 'admin',
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Admin no encontrado',
      });
    }

    return res.json({
      success: true,
      valid: true,
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      valid: false,
      message: 'Token inválido',
    });
  }
};
