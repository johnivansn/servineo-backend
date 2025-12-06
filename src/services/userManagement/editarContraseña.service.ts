import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { connectDB } from '../../config/db/mongoClient';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'servineosecretkey';
const MAX_INTENTOS = 3;
const TIEMPO_BLOQUEO = 1 * 60 * 1000; // 1 minuto para pruebas

interface TokenPayload extends JwtPayload {
  id: string;
}

interface ChangePasswordData {
  currentPassword?: string;
  newPassword: string;
}

// 🆕 FUNCIÓN para obtener contraseña de la nueva estructura
const obtenerPasswordHash = (usuario: any): string | null => {
  // Primero buscar en estructura nueva (authProviders)
  const emailProvider = usuario.authProviders?.find(
    (provider: any) => provider.provider === 'email',
  );
  if (emailProvider?.passwordHash) {
    return emailProvider.passwordHash;
  }

  // Fallback a estructura antigua (password)
  if (usuario.password) {
    return usuario.password;
  }

  return null;
};

//FUNCIÓN para verificar bloqueo
const verificarBloqueo = async (db: any, userId: string) => {
  const usuario = await db
    .collection('users')
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { passwordAttempts: 1, password: 1, authProviders: 1, name: 1, email: 1 } },
    );

  if (!usuario) {
    throw new Error('Usuario no encontrado');
  }

  const ahora = new Date();
  const attempts = usuario.passwordAttempts || { count: 0, lastAttempt: null, blockedUntil: null };

  // Verificar si está bloqueado
  if (attempts.blockedUntil && new Date(attempts.blockedUntil) > ahora) {
    const minutosRestantes = Math.ceil(
      (new Date(attempts.blockedUntil).getTime() - ahora.getTime()) / 60000,
    );

    return {
      blocked: true,
      error: `Cuenta bloqueada por seguridad. Sesión cerrada automáticamente. Podrás intentar de nuevo en ${minutosRestantes} minutos.`,
      forceLogout: true,
      usuario,
    };
  }
  // SOLO resetear si había un bloqueo que ya expiró
  else if (attempts.blockedUntil && new Date(attempts.blockedUntil) <= ahora) {
    console.log('🔄 Bloqueo expirado - Reseteando contador');

    await db
      .collection('users')
      .updateOne({ _id: new ObjectId(userId) }, { $unset: { passwordAttempts: '' } });

    // Recargar usuario sin intentos
    const usuarioLimpio = await db
      .collection('users')
      .findOne(
        { _id: new ObjectId(userId) },
        { projection: { passwordAttempts: 1, password: 1, authProviders: 1, name: 1, email: 1 } },
      );

    return { blocked: false, usuario: usuarioLimpio, attempts: { count: 0 } };
  }

  return { blocked: false, usuario, attempts };
};

// FUNCIÓN para manejar intento fallido
const manejarIntentoFallido = async (db: any, userId: string, usuario: any) => {
  const ahora = new Date();

  const usuarioActual = await db
    .collection('users')
    .findOne({ _id: new ObjectId(userId) }, { projection: { passwordAttempts: 1 } });

  const attempts = usuarioActual?.passwordAttempts || {
    count: 0,
    lastAttempt: null,
    blockedUntil: null,
  };

  attempts.count += 1;
  attempts.lastAttempt = ahora;

  if (attempts.count >= MAX_INTENTOS) {
    attempts.blockedUntil = new Date(ahora.getTime() + TIEMPO_BLOQUEO);

    await db
      .collection('users')
      .updateOne({ _id: new ObjectId(userId) }, { $set: { passwordAttempts: attempts } });

    return {
      blocked: true,
      error: `Demasiados intentos fallidos (${MAX_INTENTOS}). Sesión cerrada por seguridad. Podrás intentar de nuevo en ${Math.ceil(TIEMPO_BLOQUEO / 60000)} minutos.`,
      forceLogout: true,
    };
  }

  await db
    .collection('users')
    .updateOne({ _id: new ObjectId(userId) }, { $set: { passwordAttempts: attempts } });

  return {
    blocked: false,
    error: `La contraseña actual es incorrecta. Intentos restantes: ${MAX_INTENTOS - attempts.count}`,
    forceLogout: false,
  };
};

// 🆕 FUNCIÓN para actualizar contraseña en la estructura correcta
const actualizarPassword = async (db: any, userId: string, newPasswordHash: string) => {
  const usuario = await db.collection('users').findOne({ _id: new ObjectId(userId) });

  // Verificar si el usuario tiene authProviders
  const emailProvider = usuario.authProviders?.find(
    (provider: any) => provider.provider === 'email',
  );

  if (emailProvider) {
    // 🆕 ACTUALIZAR EN authProviders (estructura nueva)
    const result = await db.collection('users').updateOne(
      {
        _id: new ObjectId(userId),
        'authProviders.provider': 'email',
      },
      {
        $set: {
          'authProviders.$.passwordHash': newPasswordHash,
          updatedAt: new Date(),
          lastPasswordChange: new Date(),
        },
        $unset: { passwordAttempts: '' },
      },
    );
    return result;
  } else if (usuario.password) {
    // ⚡ ACTUALIZAR EN password (estructura antigua)
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          password: newPasswordHash,
          updatedAt: new Date(),
          lastPasswordChange: new Date(),
        },
        $unset: { passwordAttempts: '' },
      },
    );
    return result;
  } else {
    // 🆕 CREAR authProvider de email por primera vez
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $push: {
          authProviders: {
            provider: 'email',
            email: usuario.email,
            passwordHash: newPasswordHash,
            linkedAt: new Date(),
          },
        },
        $set: {
          updatedAt: new Date(),
          lastPasswordChange: new Date(),
        },
        $unset: { passwordAttempts: '' },
      },
    );
    return result;
  }
};

// 🔧 FUNCIÓN PRINCIPAL ACTUALIZADA
export const cambiarContrasenaService = async (token: string, datos: ChangePasswordData) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    const db = await connectDB();

    // 🔒 VERIFICAR BLOQUEO PRIMERO
    const bloqueoResult = await verificarBloqueo(db, decoded.id);

    if (bloqueoResult.blocked) {
      return {
        success: false,
        message: bloqueoResult.error,
        forceLogout: bloqueoResult.forceLogout,
      };
    }

    const { usuario } = bloqueoResult;

    // 🆕 OBTENER CONTRASEÑA DE CUALQUIER ESTRUCTURA
    const currentPasswordHash = obtenerPasswordHash(usuario);

    // 2. Si el usuario NO tiene contraseña
    if (!currentPasswordHash) {
      console.log('Usuario sin contraseña - Creando contraseña inicial');

      const hashedNewPassword = await bcrypt.hash(datos.newPassword, 10);
      const result = await actualizarPassword(db, decoded.id, hashedNewPassword);

      if (result.matchedCount === 0) throw new Error('Usuario no encontrado');

      return {
        success: true,
        message: 'Contraseña creada con éxito',
        forceLogout: false,
      };
    }

    // 3. Si el usuario SÍ tiene contraseña (verificar la actual)
    if (!datos.currentPassword) {
      throw new Error('Se requiere la contraseña actual');
    }

    const isCurrentPasswordValid = await bcrypt.compare(datos.currentPassword, currentPasswordHash);

    // MANEJAR CONTRASEÑA INCORRECTA CON BLOQUEO
    if (!isCurrentPasswordValid) {
      const failResult = await manejarIntentoFallido(db, decoded.id, usuario);

      if (failResult.forceLogout) {
        return {
          success: false,
          message: failResult.error,
          forceLogout: failResult.forceLogout,
        };
      }

      const err: any = new Error(failResult.error);
      err.code = 'CURRENT_PASSWORD_INVALID';
      throw err;
    }

    // 4. Verificar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(datos.newPassword, currentPasswordHash);
    if (isSamePassword) {
      throw new Error('La nueva contraseña debe ser diferente a la actual');
    }

    // 5. ✅ ÉXITO - Actualizar la contraseña
    const hashedNewPassword = await bcrypt.hash(datos.newPassword, 10);
    const result = await actualizarPassword(db, decoded.id, hashedNewPassword);

    if (result.matchedCount === 0) throw new Error('Error al actualizar contraseña');

    return {
      success: true,
      message: 'Contraseña cambiada con éxito',
      forceLogout: false,
    };
  } catch (error: any) {
    if (!error.code || error.code !== 'CURRENT_PASSWORD_INVALID') {
      console.error('Error en cambiarContrasenaService:', error);
    }
    throw error;
  }
};
