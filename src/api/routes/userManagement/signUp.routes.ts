import { Router } from 'express';
import { googleAuth, verifyJWT } from '../../controllers/userManagement/google.controller';
import { manualRegister } from '../../controllers/userManagement/registrarDatos.controller';
import { githubAuth } from '../../controllers/userManagement/github.controller';
import { discordAuth } from '../../controllers/userManagement/discord.controller';
import { registrarUbicacion } from '../../controllers/userManagement/ubicacion.controller';
import { actualizarFotoPerfil } from '../../controllers/userManagement/fotoPefil.controller';
import { uploadImage } from '../../../middlewares/uploads';
import { registrarTelefono } from '../../controllers/userManagement/telefono.controller';
import { verifyRecaptcha } from '../../controllers/userManagement/reCaptcha.controller';

const router = Router();

//google da
router.post('/google/auth', googleAuth);
router.get('/google/verify', verifyJWT, (req, res) => {
  return res.json({ valid: true, user: (req as any).user });
});

//datosPersonales
router.post('/registro/manual', manualRegister);

//registrar ubicacion
router.post('/registrar/ubicacion', verifyJWT, registrarUbicacion);

//registrar foto

router.put('/registrar/foto', uploadImage, actualizarFotoPerfil);

//registrar telefono

router.post('/registrar/telefono', verifyJWT, registrarTelefono);

//catpcha

router.post('/verify-recaptcha', verifyRecaptcha);

export default router;
