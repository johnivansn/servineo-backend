// En tu archivo de rutas (ej: back/servineo-backend/src/api/routes/bankAccount.routes.ts)

import { Router } from 'express';
import { createBankAccount, deleteBankAccount } from '../controllers/bankAccount.controller';
// ⚠️ IMPORTACIÓN CORREGIDA A LA NUEVA CARPETA
import { verifyRecaptchaV2 } from '../../captchaPagos/recaptchaV2.middleware'; 

const router = Router();

// Aplicar el middleware de CAPTCHA antes de la creación
router.post('/bank-accounts', verifyRecaptchaV2, createBankAccount); 

// Aplicar el middleware de CAPTCHA antes de la eliminación
router.delete('/bank-accounts/:fixerId', verifyRecaptchaV2, deleteBankAccount);

export default router;