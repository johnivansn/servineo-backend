import { Request, Response } from 'express';
import {
  generateSecret,
  buildOtpAuth,
  makeQrDataUrl,
  saveTempSecretForUser,
  getTempSecretForUser,
  verifyToken,
  activateTwoFactorForUser,
  genRecoveryCodes,
  disableTwoFactorForUser,
} from '../../../services/userManagement/2fa.service';

// 🆕 Importar sistema de intentos (necesitarás crear este archivo)
import {
  isLocked,
  recordFailedAttempt,
  resetAttempts,
} from '../../../services/userManagement/2fa.attempts';

export async function generate(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ message: 'No autorizado' });

    const secret = generateSecret();
    const otpauth = buildOtpAuth(secret, user.email || user.name || `user-${user.id}`);
    const qrDataUrl = await makeQrDataUrl(otpauth);

    await saveTempSecretForUser(user.id, secret);
    return res.json({ qrDataUrl, issuer: process.env.TOTP_ISSUER || 'Servineo' });
  } catch (err) {
    console.error('ERROR /2fa/generate', err);
    return res.status(500).json({ message: 'Error interno al generar QR' });
  }
}

export async function verify(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { token } = req.body;
    if (!user?.id) return res.status(401).json({ message: 'No autorizado' });
    if (!token) return res.status(400).json({ message: 'token requerido' });

    // 🆕 1) Verificar si está bloqueado
    const lock = await isLocked(user.id);
    if (lock.locked) {
      return res.status(423).json({
        message: 'Cuenta temporalmente bloqueada por demasiados intentos. Intenta más tarde.',
        lockedUntil: lock.lockedUntil,
        retryAfterSeconds: lock.retryAfterSeconds,
      });
    }

    // 2) Obtener secreto temporal
    const secret = await getTempSecretForUser(user.id);
    if (!secret) return res.status(400).json({ message: 'No hay un secreto pendiente' });

    // 🆕 3) Verificar token con manejo de intentos
    const ok = verifyToken(secret, token);
    if (!ok) {
      const info = await recordFailedAttempt(user.id);

      if (info.locked) {
        return res.status(423).json({
          message: `Demasiados intentos. Bloqueado por ${process.env.TOTP_LOCK_MINUTES || 5} minutos.`,
          lockedUntil: info.lockedUntil,
          attempts: info.attempts,
        });
      }

      return res.status(400).json({
        message: 'Token inválido',
        attemptsLeft: info.attemptsLeft,
        attempts: info.attempts,
      });
    }

    // 🆕 4) Token correcto: activar + resetear intentos
    const codes = genRecoveryCodes(8);
    await activateTwoFactorForUser(user.id, secret, codes);
    await resetAttempts(user.id);

    return res.json({ recoveryCodes: codes });
  } catch (err) {
    console.error('ERROR /2fa/verify', err);
    return res.status(500).json({ message: 'Error interno al verificar token' });
  }
}

export async function disable(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user?.id) return res.status(401).json({ message: 'No autorizado' });

    await disableTwoFactorForUser(user.id);
    return res.json({ ok: true });
  } catch (err) {
    console.error('ERROR /2fa/disable', err);
    return res.status(500).json({ message: 'Error interno al desactivar 2FA' });
  }
}
