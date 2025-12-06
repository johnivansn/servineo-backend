import { Router } from 'express';
import { verifyCaptcha } from '../controllers/captcha.controller';

const router = Router();

router.post('/verify-captcha', verifyCaptcha);

export default router;
