import { Request, Response } from 'express';

export const verifyCaptcha = async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Falta el token de captcha' });
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    return res
      .status(500)
      .json({
        success: false,
        message: 'Error de configuración en el servidor (Falta Secret Key)',
      });
  }

  try {
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;

    const response = await fetch(verificationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    console.log('Respuesta de Google:', data);

    if (data.success) {
      return res.status(200).json({ success: true, message: 'Humano verificado correctamente' });
    } else {
      console.error('Error validación Google:', data['error-codes']);
      return res.status(400).json({ success: false, message: 'No se pudo verificar el Captcha' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Error interno verificando captcha' });
  }
};
